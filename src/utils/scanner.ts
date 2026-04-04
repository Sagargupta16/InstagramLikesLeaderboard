import { PostNode } from '../model/post';
import { LikerAccumulator, LikerUserNode } from '../model/user';
import { Timings } from '../model/timings';
import { PHASE_WARMUP_MS } from '../constants/constants';
import {
    sleep,
    randomizedSleep,
    rateLimitedFetch,
    resetGlobalRequestCount,
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

    resetGlobalRequestCount();
    await sleep(PHASE_WARMUP_MS);

    while (moreAvailable) {
        let data: any;
        try {
            data = await rateLimitedFetch(postUrl, { onToast, pauseRef, label: 'Posts' });
        } catch (e) {
            console.error('Error fetching posts:', e);
            onToast({ show: true, text: 'Failed to fetch posts. Continuing with what we have.', style: 'error' });
            break;
        }

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

    onToast({ show: true, text: 'Warming up before fetching likers...', style: 'info' });
    await sleep(PHASE_WARMUP_MS);
    onToast({ show: false, text: '' });

    for (let i = 0; i < posts.length; i++) {
        const post = posts[i];
        const likerUrl = postLikersUrlGenerator(String(post.id));
        let likerData: any;

        try {
            likerData = await rateLimitedFetch(likerUrl, { onToast, pauseRef, label: `Likers (${i + 1}/${posts.length})` });
        } catch {
            console.warn(`Skipping likers for post ${post.shortcode} after retries`);
            likerData = null;
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
    let cycle = 0;

    onToast({ show: true, text: `Warming up before fetching ${label.toLowerCase()}...`, style: 'info' });
    await sleep(PHASE_WARMUP_MS);
    onToast({ show: false, text: '' });

    while (hasMore) {
        let data: any;
        try {
            data = await rateLimitedFetch(url, { onToast, pauseRef, label });
        } catch (e) {
            console.error(`Error fetching ${label}:`, e);
            onToast({ show: true, text: `Failed to fetch ${label}. Continuing with what we have.`, style: 'error' });
            break;
        }

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
