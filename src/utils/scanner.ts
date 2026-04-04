import { PostNode } from '../model/post';
import { LikerAccumulator, LikerUserNode } from '../model/user';
import { Timings } from '../model/timings';
import { MAX_RETRIES } from '../constants/constants';
import {
    sleep,
    randomizedSleep,
    igFetch,
    userMediaUrlGenerator,
    postLikersUrlGenerator,
    followingUrlGenerator,
    followersUrlGenerator,
    buildLikerMap,
} from './utils';

interface ToastMessage {
    show: boolean;
    text: string;
    style?: 'success' | 'error' | 'warning' | 'info';
}

// --- Phase 1: Fetch all posts ---

export async function fetchAllPosts(
    timings: Timings,
    pauseRef: { readonly current: boolean },
    onProgress: (posts: readonly PostNode[], percentage: number) => void,
    onToast: (toast: ToastMessage) => void,
): Promise<PostNode[]> {
    const posts: PostNode[] = [];
    let postUrl = userMediaUrlGenerator();
    let moreAvailable = true;
    let postCycle = 0;
    let postRetries = 0;

    while (moreAvailable) {
        let data: any;
        try {
            const resp = await igFetch(postUrl);
            if (!resp.ok) {
                throw new Error(`HTTP ${resp.status}`);
            }
            data = await resp.json();
        } catch (e) {
            console.error('Error fetching posts:', e);
            postRetries++;
            if (postRetries >= MAX_RETRIES) {
                console.error('Max retries reached for posts. Continuing with what we have.');
                break;
            }
            onToast({ show: true, text: `Retry ${postRetries}/${MAX_RETRIES} for posts...`, style: 'warning' });
            await sleep(3000);
            continue;
        }
        postRetries = 0;

        const items = data.items || [];
        for (const item of items) {
            posts.push({
                id: item.pk || item.id,
                shortcode: item.code,
                edge_media_preview_like: { count: item.like_count || 0 },
                edge_media_to_caption: {
                    edges: item.caption ? [{ node: { text: item.caption.text || '' } }] : [],
                },
                thumbnail_src: (item.image_versions2 && item.image_versions2.candidates && item.image_versions2.candidates[0])
                    ? item.image_versions2.candidates[0].url
                    : '',
                taken_at_timestamp: item.taken_at || 0,
            });
        }

        moreAvailable = data.more_available === true;
        if (moreAvailable && data.next_max_id) {
            postUrl = userMediaUrlGenerator(data.next_max_id);
        } else {
            moreAvailable = false;
        }

        onProgress(posts, moreAvailable ? Math.min(90, posts.length * 2) : 100);

        while (pauseRef.current) {
            await sleep(1000);
        }

        await sleep(randomizedSleep(timings.timeBetweenPostFetches));
        postCycle++;
        if (postCycle > 6) {
            postCycle = 0;
            onToast({ show: true, text: `Sleeping ${timings.timeToWaitAfterSixPostFetches / 1000}s to avoid rate limit...` });
            await sleep(timings.timeToWaitAfterSixPostFetches);
            onToast({ show: false, text: '' });
        }
    }

    console.info(`Phase 1 complete: ${posts.length} posts collected.`);
    return posts;
}

// --- Phase 2: Fetch likers for each post ---

export async function fetchAllLikers(
    posts: readonly PostNode[],
    timings: Timings,
    pauseRef: { readonly current: boolean },
    onProgress: (currentIndex: number, likerMap: Record<string, LikerAccumulator>, percentage: number) => void,
    onToast: (toast: ToastMessage) => void,
): Promise<Record<string, LikerAccumulator>> {
    let likerMap: Record<string, LikerAccumulator> = {};

    for (let i = 0; i < posts.length; i++) {
        const post = posts[i];
        const likerUrl = postLikersUrlGenerator(String(post.id));
        let likerRetries = 0;
        let likerData: any;

        while (likerRetries < MAX_RETRIES) {
            try {
                const resp = await igFetch(likerUrl);
                if (!resp.ok) {
                    throw new Error(`HTTP ${resp.status}`);
                }
                likerData = await resp.json();
                break;
            } catch (e) {
                console.error(`Error fetching likers for post ${post.shortcode}:`, e);
                likerRetries++;
                if (likerRetries >= MAX_RETRIES) {
                    console.warn(`Skipping likers for post ${post.shortcode} after ${MAX_RETRIES} retries`);
                    likerData = null;
                }
                await sleep(3000);
            }
        }

        if (likerData && likerData.users) {
            const likers: LikerUserNode[] = likerData.users.map((u: any) => ({
                id: String(u.pk),
                username: u.username,
                full_name: u.full_name || '',
                profile_pic_url: u.profile_pic_url || '',
                is_verified: u.is_verified || false,
                is_private: u.is_private || false,
            }));
            likerMap = buildLikerMap(likerMap, likers);
        }

        onProgress(i + 1, likerMap, Math.round(((i + 1) / posts.length) * 100));

        while (pauseRef.current) {
            await sleep(1000);
        }

        await sleep(randomizedSleep(timings.timeBetweenLikerFetches));
        if ((i + 1) % 5 === 0 && i < posts.length - 1) {
            onToast({ show: true, text: `Sleeping ${timings.timeToWaitAfterFiveLikerFetches / 1000}s to avoid rate limit...` });
            await sleep(timings.timeToWaitAfterFiveLikerFetches);
            onToast({ show: false, text: '' });
        }
    }

    console.info(`Phase 2 complete: ${Object.keys(likerMap).length} unique likers found.`);
    return likerMap;
}

// --- Phase 3: Fetch following list ---

interface FetchUsersResult {
    readonly ids: Set<string>;
    readonly users: Record<string, LikerUserNode>;
}

async function fetchUserList(
    urlGenerator: (nextMaxId?: string) => string,
    timings: { timeBetween: number; timeAfterSix: number },
    pauseRef: { readonly current: boolean },
    onProgress: (count: number, percentage: number) => void,
    onToast: (toast: ToastMessage) => void,
    label: string,
): Promise<FetchUsersResult> {
    const ids = new Set<string>();
    const users: Record<string, LikerUserNode> = {};
    let url = urlGenerator();
    let hasMore = true;
    let retries = 0;
    let cycle = 0;

    while (hasMore) {
        let data: any;
        try {
            const resp = await igFetch(url);
            if (!resp.ok) {
                throw new Error(`HTTP ${resp.status}`);
            }
            data = await resp.json();
        } catch (e) {
            console.error(`Error fetching ${label}:`, e);
            retries++;
            if (retries >= MAX_RETRIES) {
                console.error(`Max retries reached for ${label}. Continuing with what we have.`);
                break;
            }
            onToast({ show: true, text: `Retry ${retries}/${MAX_RETRIES} for ${label}...`, style: 'warning' });
            await sleep(3000);
            continue;
        }
        retries = 0;

        const userList = data.users || [];
        userList.forEach((u: any) => {
            const id = String(u.pk);
            ids.add(id);
            users[id] = {
                id,
                username: u.username,
                full_name: u.full_name || '',
                profile_pic_url: u.profile_pic_url || '',
                is_verified: u.is_verified || false,
                is_private: u.is_private || false,
            };
        });

        hasMore = !!data.next_max_id;
        if (hasMore) {
            url = urlGenerator(data.next_max_id);
        }

        onProgress(ids.size, hasMore ? Math.min(90, ids.size) : 100);

        while (pauseRef.current) {
            await sleep(1000);
        }

        await sleep(randomizedSleep(timings.timeBetween));
        cycle++;
        if (cycle > 6) {
            cycle = 0;
            onToast({ show: true, text: `Sleeping ${timings.timeAfterSix / 1000}s to avoid rate limit...` });
            await sleep(timings.timeAfterSix);
            onToast({ show: false, text: '' });
        }
    }

    console.info(`${label} complete: ${ids.size} users.`);
    return { ids, users };
}

export async function fetchFollowing(
    timings: Timings,
    pauseRef: { readonly current: boolean },
    onProgress: (count: number, percentage: number) => void,
    onToast: (toast: ToastMessage) => void,
): Promise<FetchUsersResult> {
    return fetchUserList(
        followingUrlGenerator,
        { timeBetween: timings.timeBetweenFollowingFetches, timeAfterSix: timings.timeToWaitAfterSixFollowingFetches },
        pauseRef,
        onProgress,
        onToast,
        'Following',
    );
}

export async function fetchFollowers(
    timings: Timings,
    pauseRef: { readonly current: boolean },
    onProgress: (count: number, percentage: number) => void,
    onToast: (toast: ToastMessage) => void,
): Promise<FetchUsersResult> {
    return fetchUserList(
        followersUrlGenerator,
        { timeBetween: timings.timeBetweenFollowerFetches, timeAfterSix: timings.timeToWaitAfterSixFollowerFetches },
        pauseRef,
        onProgress,
        onToast,
        'Followers',
    );
}
