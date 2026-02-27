import React, { useEffect, useRef, useState } from 'react';
import { render } from 'react-dom';
import './styles/styles.scss';

import { State } from './model/state';
import { Timings } from './model/timings';
import { PostNode } from './model/post';
import { LikerAccumulator, LikerUserNode } from './model/user';
import { INSTAGRAM_HOSTNAME, MAX_RETRIES, DEFAULT_TIME_BETWEEN_POST_FETCHES, DEFAULT_TIME_TO_WAIT_AFTER_SIX_POST_FETCHES, DEFAULT_TIME_BETWEEN_LIKER_FETCHES, DEFAULT_TIME_TO_WAIT_AFTER_FIVE_LIKER_FETCHES, DEFAULT_TIME_BETWEEN_FOLLOWING_FETCHES, DEFAULT_TIME_TO_WAIT_AFTER_SIX_FOLLOWING_FETCHES } from './constants/constants';
import {
    assertUnreachable,
    sleep,
    randomizedSleep,
    igFetch,
    userMediaUrlGenerator,
    postLikersUrlGenerator,
    followingUrlGenerator,
    buildLikerMap,
    buildLeaderboard,
} from './utils/utils';

import { Toolbar } from './components/Toolbar';
import { NotScanning } from './components/NotScanning';
import { Scanning } from './components/Scanning';
import { Leaderboard } from './components/Leaderboard';
import { Toast } from './components/Toast';

interface ToastState {
    show: boolean;
    text: string;
    style?: 'success' | 'error' | 'warning' | 'info';
}

const App = () => {
    const [state, setState] = useState<State>({ status: 'initial' });
    const [timings, setTimings] = useState<Timings>({
        timeBetweenPostFetches: DEFAULT_TIME_BETWEEN_POST_FETCHES,
        timeToWaitAfterSixPostFetches: DEFAULT_TIME_TO_WAIT_AFTER_SIX_POST_FETCHES,
        timeBetweenLikerFetches: DEFAULT_TIME_BETWEEN_LIKER_FETCHES,
        timeToWaitAfterFiveLikerFetches: DEFAULT_TIME_TO_WAIT_AFTER_FIVE_LIKER_FETCHES,
        timeBetweenFollowingFetches: DEFAULT_TIME_BETWEEN_FOLLOWING_FETCHES,
        timeToWaitAfterSixFollowingFetches: DEFAULT_TIME_TO_WAIT_AFTER_SIX_FOLLOWING_FETCHES,
    });
    const [toast, setToast] = useState<ToastState>({ show: false, text: '' });

    const scanningPausedRef = useRef(false);
    const [scanningPaused, setScanningPaused] = useState(false);

    const pauseScan = () => {
        scanningPausedRef.current = !scanningPausedRef.current;
        setScanningPaused(scanningPausedRef.current);
    };

    const onScan = () => {
        setState({
            status: 'scanning',
            phase: 'fetching_posts',
            percentage: 0,
            posts: [],
            totalPostCount: 0,
            currentPostIndex: 0,
            likerMap: {},
            followingCount: 0,
            totalFollowingCount: 0,
        });
    };

    const isActiveProcess = state.status === 'scanning';

    // Main scanning effect
    useEffect(() => {
        if (state.status !== 'scanning') {
            return;
        }

        const scan = async () => {
            // ==================== PHASE 1: Fetch all posts ====================
            // Uses Instagram v1 REST API: /api/v1/feed/user/{id}/
            const posts: PostNode[] = [];
            let postUrl = userMediaUrlGenerator();
            let moreAvailable = true;
            let totalPostCount = 0;
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
                    setToast({ show: true, text: `Retry ${postRetries}/${MAX_RETRIES} for posts...`, style: 'warning' });
                    await sleep(3000);
                    continue;
                }
                postRetries = 0;

                // v1 API response: { items: [...], more_available: bool, next_max_id: "..." , num_results: N }
                if (totalPostCount === 0 && data.num_results !== undefined) {
                    // The v1 feed endpoint doesn't return total count directly.
                    // We'll track it as we go.
                    totalPostCount = -1; // unknown total
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

                setState(prev => {
                    if (prev.status !== 'scanning') { return prev; }
                    return {
                        ...prev,
                        phase: 'fetching_posts',
                        posts: [...posts],
                        totalPostCount: posts.length,
                        percentage: moreAvailable ? Math.min(90, posts.length * 2) : 100,
                    };
                });

                while (scanningPausedRef.current) {
                    await sleep(1000);
                }

                await sleep(randomizedSleep(timings.timeBetweenPostFetches));
                postCycle++;
                if (postCycle > 6) {
                    postCycle = 0;
                    setToast({ show: true, text: `Sleeping ${timings.timeToWaitAfterSixPostFetches / 1000}s to avoid rate limit...` });
                    await sleep(timings.timeToWaitAfterSixPostFetches);
                    setToast({ show: false, text: '' });
                }
            }

            // Final post count update
            totalPostCount = posts.length;
            setState(prev => {
                if (prev.status !== 'scanning') { return prev; }
                return { ...prev, posts: [...posts], totalPostCount, percentage: 100 };
            });

            console.info(`Phase 1 complete: ${posts.length} posts collected.`);

            if (posts.length === 0) {
                setToast({ show: true, text: 'No posts found. Make sure you are logged in on instagram.com', style: 'error' });
                setState({ status: 'initial' });
                return;
            }

            // ==================== PHASE 2: Fetch likers for each post ====================
            // Uses Instagram v1 REST API: /api/v1/media/{media_id}/likers/
            setState(prev => {
                if (prev.status !== 'scanning') { return prev; }
                return { ...prev, phase: 'fetching_likes', percentage: 0, currentPostIndex: 0 };
            });

            let likerMap: Record<string, LikerAccumulator> = {};

            for (let i = 0; i < posts.length; i++) {
                const post = posts[i];
                // The v1 likers endpoint uses the media pk/id, not shortcode
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
                    // v1 API response: { users: [{ pk, username, full_name, profile_pic_url, is_verified, is_private }], user_count: N }
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

                setState(prev => {
                    if (prev.status !== 'scanning') { return prev; }
                    return {
                        ...prev,
                        currentPostIndex: i + 1,
                        likerMap: { ...likerMap },
                        percentage: Math.round(((i + 1) / posts.length) * 100),
                    };
                });

                while (scanningPausedRef.current) {
                    await sleep(1000);
                }

                await sleep(randomizedSleep(timings.timeBetweenLikerFetches));
                if ((i + 1) % 5 === 0 && i < posts.length - 1) {
                    setToast({ show: true, text: `Sleeping ${timings.timeToWaitAfterFiveLikerFetches / 1000}s to avoid rate limit...` });
                    await sleep(timings.timeToWaitAfterFiveLikerFetches);
                    setToast({ show: false, text: '' });
                }
            }

            console.info(`Phase 2 complete: ${Object.keys(likerMap).length} unique likers found.`);

            // ==================== PHASE 3: Fetch following list ====================
            // Uses Instagram v1 REST API: /api/v1/friendships/{id}/following/
            setState(prev => {
                if (prev.status !== 'scanning') { return prev; }
                return { ...prev, phase: 'fetching_following', percentage: 0, followingCount: 0, totalFollowingCount: 0 };
            });

            const followingIds = new Set<string>();
            let followUrl = followingUrlGenerator();
            let followHasMore = true;
            let followRetries = 0;
            let followCycle = 0;

            while (followHasMore) {
                let followData: any;
                try {
                    const resp = await igFetch(followUrl);
                    if (!resp.ok) {
                        throw new Error(`HTTP ${resp.status}`);
                    }
                    followData = await resp.json();
                } catch (e) {
                    console.error('Error fetching following list:', e);
                    followRetries++;
                    if (followRetries >= MAX_RETRIES) {
                        console.error('Max retries reached for following list. Continuing with what we have.');
                        break;
                    }
                    setToast({ show: true, text: `Retry ${followRetries}/${MAX_RETRIES} for following...`, style: 'warning' });
                    await sleep(3000);
                    continue;
                }
                followRetries = 0;

                // v1 API response: { users: [...], big_list: bool, next_max_id: "...", status: "ok" }
                const users = followData.users || [];
                users.forEach((u: any) => followingIds.add(String(u.pk)));

                followHasMore = !!followData.next_max_id;
                if (followHasMore) {
                    followUrl = followingUrlGenerator(followData.next_max_id);
                }

                setState(prev => {
                    if (prev.status !== 'scanning') { return prev; }
                    return {
                        ...prev,
                        followingCount: followingIds.size,
                        totalFollowingCount: followingIds.size, // v1 API doesn't always give total
                        percentage: followHasMore ? Math.min(90, followingIds.size) : 100,
                    };
                });

                while (scanningPausedRef.current) {
                    await sleep(1000);
                }

                await sleep(randomizedSleep(timings.timeBetweenFollowingFetches));
                followCycle++;
                if (followCycle > 6) {
                    followCycle = 0;
                    setToast({ show: true, text: `Sleeping ${timings.timeToWaitAfterSixFollowingFetches / 1000}s to avoid rate limit...` });
                    await sleep(timings.timeToWaitAfterSixFollowingFetches);
                    setToast({ show: false, text: '' });
                }
            }

            console.info(`Phase 3 complete: Following ${followingIds.size} users.`);

            // ==================== BUILD RESULTS ====================
            const followingLeaderboard = buildLeaderboard(likerMap, followingIds, posts.length, true);
            const notFollowingLeaderboard = buildLeaderboard(likerMap, followingIds, posts.length, false);

            setState({
                status: 'results',
                currentTab: 'following',
                searchTerm: '',
                sortBy: 'likes',
                sortDirection: 'desc',
                page: 1,
                followingLeaderboard,
                notFollowingLeaderboard,
                totalPostsScanned: posts.length,
                totalUniqueLikers: Object.keys(likerMap).length,
                totalLikes: Object.values(likerMap).reduce((sum, a) => sum + a.likesCount, 0),
            });

            setToast({ show: true, text: 'Scan complete! Leaderboard ready.', style: 'success' });
        };

        scan();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state.status === 'scanning']);

    let markup: React.JSX.Element;
    switch (state.status) {
        case 'initial':
            markup = <NotScanning onScan={onScan} />;
            break;
        case 'scanning':
            markup = (
                <Scanning
                    state={state}
                    scanningPaused={scanningPaused}
                    pauseScan={pauseScan}
                />
            );
            break;
        case 'results':
            markup = (
                <Leaderboard
                    state={state}
                    setState={setState}
                />
            );
            break;
        default:
            assertUnreachable(state);
    }

    return (
        <div className='ill with-app-header'>
            <Toolbar
                isActiveProcess={isActiveProcess}
                state={state}
                setState={setState}
                currentTimings={timings}
                setTimings={setTimings}
            />
            {markup}
            <Toast
                show={toast.show}
                style={toast.style || 'info'}
                message={toast.text}
                onClose={() => setToast({ show: false, text: '' })}
            />
        </div>
    );
};

// Check hostname and render
if (location.hostname !== INSTAGRAM_HOSTNAME) {
    alert('Please run this script on Instagram (www.instagram.com)');
} else {
    document.title = 'Instagram Likes Leaderboard';
    // Clear body
    document.body.innerHTML = '';
    const appContainer = document.createElement('div');
    appContainer.id = 'ill-root';
    document.body.appendChild(appContainer);
    render(<App />, appContainer);
}
