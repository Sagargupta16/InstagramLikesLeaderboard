import React, { useEffect, useRef, useState } from 'react';
import { render } from 'react-dom';
import './styles/styles.scss';

import { State } from './model/state';
import { Timings } from './model/timings';
import { ScanModes } from './model/scan-modes';
import { ResultsView } from './model/results-view';
import {
    INSTAGRAM_HOSTNAME,
    DEFAULT_TIME_BETWEEN_POST_FETCHES,
    DEFAULT_TIME_TO_WAIT_AFTER_SIX_POST_FETCHES,
    DEFAULT_TIME_BETWEEN_LIKER_FETCHES,
    DEFAULT_TIME_TO_WAIT_AFTER_FIVE_LIKER_FETCHES,
    DEFAULT_TIME_BETWEEN_FOLLOWING_FETCHES,
    DEFAULT_TIME_TO_WAIT_AFTER_SIX_FOLLOWING_FETCHES,
    DEFAULT_TIME_BETWEEN_FOLLOWER_FETCHES,
    DEFAULT_TIME_TO_WAIT_AFTER_SIX_FOLLOWER_FETCHES,
} from './constants/constants';
import { assertUnreachable, buildLeaderboard } from './utils/utils';
import { fetchAllPosts, fetchAllLikers, fetchFollowing, fetchFollowers } from './utils/scanner';
import { saveScanResults, loadScanResults, SavedScan } from './utils/storage';

import { Toolbar } from './components/Toolbar';
import { NotScanning } from './components/NotScanning';
import { Scanning } from './components/Scanning';
import { Leaderboard } from './components/Leaderboard';
import { Dashboard } from './components/Dashboard';
import { FollowerAnalysis } from './components/FollowerAnalysis';
import { ResultsNav } from './components/ResultsNav';
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
        timeBetweenFollowerFetches: DEFAULT_TIME_BETWEEN_FOLLOWER_FETCHES,
        timeToWaitAfterSixFollowerFetches: DEFAULT_TIME_TO_WAIT_AFTER_SIX_FOLLOWER_FETCHES,
    });
    const [toast, setToast] = useState<ToastState>({ show: false, text: '' });
    const [savedScan, setSavedScan] = useState<SavedScan | null>(null);

    const scanningPausedRef = useRef(false);
    const [scanningPaused, setScanningPaused] = useState(false);

    // Load saved scan on mount
    useEffect(() => {
        setSavedScan(loadScanResults());
    }, []);

    const pauseScan = () => {
        scanningPausedRef.current = !scanningPausedRef.current;
        setScanningPaused(scanningPausedRef.current);
    };

    const onScan = (modes: ScanModes) => {
        setState({
            status: 'scanning',
            phase: 'fetching_posts',
            percentage: 0,
            scanModes: modes,
            posts: [],
            totalPostCount: 0,
            currentPostIndex: 0,
            likerMap: {},
            followingCount: 0,
            totalFollowingCount: 0,
            followerCount: 0,
        });
    };

    const onLoadPrevious = () => {
        const saved = loadScanResults();
        if (!saved) {
            setToast({ show: true, text: 'No saved results found.', style: 'error' });
            return;
        }

        const defaultView: ResultsView = saved.scanModes.dashboard ? 'dashboard' : 'leaderboard';

        setState({
            status: 'results',
            currentView: defaultView,
            scanModes: saved.scanModes,
            currentTab: 'following',
            searchTerm: '',
            sortBy: 'likes',
            sortDirection: 'desc',
            page: 1,
            followingLeaderboard: saved.followingLeaderboard,
            notFollowingLeaderboard: saved.notFollowingLeaderboard,
            totalPostsScanned: saved.totalPostsScanned,
            totalUniqueLikers: saved.totalUniqueLikers,
            totalLikes: saved.totalLikes,
            followerIds: saved.followerIds,
            followingIds: saved.followingIds,
            followerUsers: saved.followerUsers,
            followingUsers: saved.followingUsers,
            likerMap: saved.likerMap,
            mostLikedPost: saved.mostLikedPost,
            averageLikesPerPost: saved.averageLikesPerPost,
            posts: saved.posts,
            hideVerified: false,
            hiddenUsers: [],
            followerTab: 'dont_follow_back',
            followerSearchTerm: '',
            followerPage: 1,
        });

        setToast({ show: true, text: 'Previous results loaded!', style: 'success' });
    };

    const isActiveProcess = state.status === 'scanning';

    // Main scanning effect
    useEffect(() => {
        if (state.status !== 'scanning') {
            return;
        }

        const scanModes = state.scanModes;

        const scan = async () => {
            // Phase 1: Fetch all posts
            const posts = await fetchAllPosts(
                timings,
                scanningPausedRef,
                (postsList, percentage) => {
                    setState(prev => {
                        if (prev.status !== 'scanning') { return prev; }
                        return {
                            ...prev,
                            phase: 'fetching_posts',
                            posts: [...postsList],
                            totalPostCount: postsList.length,
                            percentage,
                        };
                    });
                },
                setToast,
            );

            if (posts.length === 0) {
                setToast({ show: true, text: 'No posts found. Make sure you are logged in on instagram.com', style: 'error' });
                setState({ status: 'initial' });
                return;
            }

            // Phase 2: Fetch likers
            setState(prev => {
                if (prev.status !== 'scanning') { return prev; }
                return { ...prev, phase: 'fetching_likes', percentage: 0, currentPostIndex: 0, posts: [...posts], totalPostCount: posts.length };
            });

            const likerMap = await fetchAllLikers(
                posts,
                timings,
                scanningPausedRef,
                (currentIndex, lMap, percentage) => {
                    setState(prev => {
                        if (prev.status !== 'scanning') { return prev; }
                        return {
                            ...prev,
                            currentPostIndex: currentIndex,
                            likerMap: lMap,
                            percentage,
                        };
                    });
                },
                setToast,
            );

            // Phase 3: Fetch following
            setState(prev => {
                if (prev.status !== 'scanning') { return prev; }
                return { ...prev, phase: 'fetching_following', percentage: 0, followingCount: 0, totalFollowingCount: 0 };
            });

            const followingResult = await fetchFollowing(
                timings,
                scanningPausedRef,
                (count, percentage) => {
                    setState(prev => {
                        if (prev.status !== 'scanning') { return prev; }
                        return { ...prev, followingCount: count, totalFollowingCount: count, percentage };
                    });
                },
                setToast,
            );

            // Phase 4: Fetch followers (if enabled)
            let followerIdsArray: string[] = [];
            let followerUsersRecord: Record<string, any> = {};

            if (scanModes.followerAnalysis) {
                setState(prev => {
                    if (prev.status !== 'scanning') { return prev; }
                    return { ...prev, phase: 'fetching_followers', percentage: 0, followerCount: 0 };
                });

                const followerResult = await fetchFollowers(
                    timings,
                    scanningPausedRef,
                    (count, percentage) => {
                        setState(prev => {
                            if (prev.status !== 'scanning') { return prev; }
                            return { ...prev, followerCount: count, percentage };
                        });
                    },
                    setToast,
                );

                followerIdsArray = Array.from(followerResult.ids);
                followerUsersRecord = followerResult.users;
            }

            // Build results
            const followingLeaderboard = buildLeaderboard(likerMap, followingResult.ids, posts.length, true, followingResult.users);
            const notFollowingLeaderboard = buildLeaderboard(likerMap, followingResult.ids, posts.length, false);

            const totalLikes = Object.values(likerMap).reduce((sum, a) => sum + a.likesCount, 0);
            const mostLikedPost = posts.length > 0
                ? [...posts].sort((a, b) => b.edge_media_preview_like.count - a.edge_media_preview_like.count)[0]
                : null;
            const averageLikesPerPost = posts.length > 0 ? totalLikes / posts.length : 0;

            const defaultView: ResultsView = scanModes.dashboard ? 'dashboard' : 'leaderboard';

            const followingIdsArray = Array.from(followingResult.ids);

            // Save to localStorage
            const savedData: SavedScan = {
                timestamp: Date.now(),
                scanModes,
                totalPostsScanned: posts.length,
                totalUniqueLikers: Object.keys(likerMap).length,
                totalLikes,
                followingLeaderboard,
                notFollowingLeaderboard,
                followerIds: followerIdsArray,
                followingIds: followingIdsArray,
                followerUsers: followerUsersRecord,
                followingUsers: followingResult.users,
                likerMap,
                mostLikedPost,
                averageLikesPerPost,
                posts,
            };
            saveScanResults(savedData);
            setSavedScan(savedData);

            setState({
                status: 'results',
                currentView: defaultView,
                scanModes,
                currentTab: 'following',
                searchTerm: '',
                sortBy: 'likes',
                sortDirection: 'desc',
                page: 1,
                followingLeaderboard,
                notFollowingLeaderboard,
                totalPostsScanned: posts.length,
                totalUniqueLikers: Object.keys(likerMap).length,
                totalLikes,
                followerIds: followerIdsArray,
                followingIds: followingIdsArray,
                followerUsers: followerUsersRecord,
                followingUsers: followingResult.users,
                likerMap,
                mostLikedPost,
                averageLikesPerPost,
                posts,
                hideVerified: false,
                hiddenUsers: [],
                followerTab: 'dont_follow_back',
                followerSearchTerm: '',
                followerPage: 1,
            });

            setToast({ show: true, text: 'Scan complete! Results ready.', style: 'success' });
        };

        scan();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state.status === 'scanning']);

    const handleViewChange = (view: ResultsView) => {
        if (state.status === 'results') {
            setState({ ...state, currentView: view, searchTerm: '', page: 1, followerPage: 1, followerSearchTerm: '' });
        }
    };

    let markup: React.JSX.Element;
    switch (state.status) {
        case 'initial':
            markup = (
                <NotScanning
                    onScan={onScan}
                    onLoadPrevious={onLoadPrevious}
                    savedScan={savedScan}
                />
            );
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
        case 'results': {
            const resultsContent = (() => {
                switch (state.currentView) {
                    case 'dashboard':
                        return <Dashboard state={state} />;
                    case 'leaderboard':
                        return <Leaderboard state={state} setState={setState} />;
                    case 'follower_analysis':
                        return <FollowerAnalysis state={state} setState={setState} />;
                    default:
                        return <Leaderboard state={state} setState={setState} />;
                }
            })();

            markup = (
                <>
                    <ResultsNav
                        currentView={state.currentView}
                        scanModes={state.scanModes}
                        onViewChange={handleViewChange}
                    />
                    {resultsContent}
                </>
            );
            break;
        }
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
    document.body.innerHTML = '';
    const appContainer = document.createElement('div');
    appContainer.id = 'ill-root';
    document.body.appendChild(appContainer);
    render(<App />, appContainer);
}
