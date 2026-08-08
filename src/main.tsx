import React, { useEffect, useRef, useState } from 'react';
import { render } from 'react-dom';
import './styles/styles.scss';

import { State } from './model/state';
import { LikerUserNode, UserListScope } from './model/user';
import { ScanModes } from './model/scan-modes';
import { ResultsView } from './model/results-view';
import {
    RequestError,
    assertUnreachable,
    buildLeaderboard,
    createIgRequester,
    isRequestError,
} from './utils/utils';
import { fetchAllPosts, fetchAllLikers, fetchFollowing, fetchFollowers } from './utils/scanner';
import {
    SavedScan,
    clearScanResults,
    formatTimeSince,
    loadReusableScan,
    loadScanResults,
    saveScanResults,
} from './utils/storage';

import { Toolbar } from './components/Toolbar';
import { ModeSelector } from './components/ModeSelector';
import { Scanning } from './components/Scanning';
import { Leaderboard } from './components/Leaderboard';
import { Dashboard } from './components/Dashboard';
import { FollowerAnalysis } from './components/FollowerAnalysis';
import { ResultsNav } from './components/ResultsNav';
import { Toast } from './components/Toast';

interface ToastState {
    readonly show: boolean;
    readonly text: string;
    readonly style?: 'success' | 'error' | 'warning' | 'info';
}

type ResultsState = Extract<State, { status: 'results' }>;
type ScanningState = Extract<State, { status: 'scanning' }>;

function buildResultsState(saved: SavedScan): ResultsState {
    const followingIds = new Set(saved.followingIds);
    const followingLeaderboard = buildLeaderboard(
        saved.likerMap,
        followingIds,
        saved.posts.length,
        true,
        saved.followingUsers,
    );
    const notFollowingLeaderboard = buildLeaderboard(
        saved.likerMap,
        followingIds,
        saved.posts.length,
        false,
    );
    const totalLikes = saved.posts.reduce(
        (sum, post) => sum + post.edge_media_preview_like.count,
        0,
    );
    const mostLikedPost = saved.posts.reduce<ResultsState['mostLikedPost']>((best, post) =>
        !best || post.edge_media_preview_like.count > best.edge_media_preview_like.count ? post : best,
    null);

    return {
        status: 'results',
        currentView: saved.scanModes.dashboard ? 'dashboard' : 'leaderboard',
        scanModes: saved.scanModes,
        scannedAt: saved.timestamp,
        ownerId: saved.ownerId,
        postScope: saved.postScope,
        followingScope: saved.followingScope,
        followerScope: saved.followerScope,
        currentTab: 'following',
        searchTerm: '',
        sortBy: 'likes',
        sortDirection: 'desc',
        page: 1,
        followingLeaderboard,
        notFollowingLeaderboard,
        totalPostsScanned: saved.posts.length,
        totalUniqueLikers: Object.keys(saved.likerMap).length,
        totalLikes,
        followerIds: saved.followerIds,
        followingIds: saved.followingIds,
        followerUsers: saved.followerUsers,
        followingUsers: saved.followingUsers,
        likerMap: saved.likerMap,
        mostLikedPost,
        averageLikesPerPost: saved.posts.length === 0 ? 0 : totalLikes / saved.posts.length,
        posts: saved.posts,
        hideVerified: false,
        hiddenUsers: [],
        followerTab: 'dont_follow_back',
        followerSearchTerm: '',
        followerPage: 1,
    };
}

function scanErrorMessage(error: RequestError): string {
    switch (error.kind) {
        case 'auth':
            return 'Instagram login is missing or expired. Sign in again before retrying.';
        case 'challenge':
            return 'Instagram stopped the scan with a challenge or checkpoint. No further requests were made.';
        case 'rate_limit': {
            const retryText = error.retryAt
                ? ` Do not retry before ${new Date(error.retryAt).toLocaleTimeString()}.`
                : '';
            return `Instagram asked this account to slow down. No further requests were made.${retryText}`;
        }
        case 'timeout':
            return 'An Instagram request timed out. The scan stopped without saving partial results.';
        case 'bounds':
            return `${error.message} The scan stopped without saving partial results.`;
        case 'network':
            return 'The Instagram request failed after one retry. Check your connection before starting again.';
        case 'http':
            return `${error.message} The scan stopped without saving partial results.`;
        case 'invalid_response':
            return `${error.message} The scan stopped because the response could not be verified.`;
        case 'stopped':
            return 'Scan stopped.';
        default:
            return assertUnreachable(error.kind);
    }
}

const initialScanningState = (scanModes: ScanModes): ScanningState => ({
    status: 'scanning',
    phase: 'fetching_posts',
    percentage: null,
    scanModes,
    posts: [],
    totalPostCount: 0,
    currentPostIndex: 0,
    identifiedLikerCount: 0,
    followingCount: 0,
    followerCount: 0,
});

const App = ({ ownerId }: { readonly ownerId: string }) => {
    const [state, setState] = useState<State>({ status: 'initial' });
    const [toast, setToast] = useState<ToastState>({ show: false, text: '' });
    const [savedScan, setSavedScan] = useState<SavedScan | null>(() => loadScanResults(ownerId));
    const [scanningPaused, setScanningPaused] = useState(false);
    const [retryAt, setRetryAt] = useState<number | null>(null);
    const scanningPausedRef = useRef(false);
    const lastRequestAtRef = useRef<number | null>(null);
    const controllerRef = useRef<AbortController | null>(null);
    const runIdRef = useRef(0);

    useEffect(() => () => controllerRef.current?.abort(), []);

    const updateScanning = (runId: number, update: (current: ScanningState) => ScanningState) => {
        if (runId !== runIdRef.current) {
            return;
        }
        setState(current => current.status === 'scanning' ? update(current) : current);
    };

    const stopScan = () => {
        if (!controllerRef.current) {
            return;
        }
        controllerRef.current.abort();
        controllerRef.current = null;
        runIdRef.current++;
        scanningPausedRef.current = false;
        setScanningPaused(false);
        setState({ status: 'initial' });
        setToast({ show: true, text: 'Scan stopped. This run was not saved.', style: 'info' });
    };

    const pauseScan = () => {
        scanningPausedRef.current = !scanningPausedRef.current;
        setScanningPaused(scanningPausedRef.current);
    };

    const onScan = (scanModes: ScanModes) => {
        const cached = loadReusableScan(ownerId, scanModes);
        if (cached) {
            const cachedResult: SavedScan = scanModes.followerAnalysis
                ? { ...cached, scanModes }
                : {
                    ...cached,
                    scanModes,
                    followerScope: null,
                    followerIds: [],
                    followerUsers: {},
                };
            setSavedScan(cached);
            setState(buildResultsState(cachedResult));
            setToast({
                show: true,
                text: `Loaded saved results from ${formatTimeSince(cached.timestamp)}. Instagram was not contacted.`,
                style: 'success',
            });
            return;
        }

        if (retryAt !== null && retryAt > Date.now()) {
            setToast({
                show: true,
                text: `Wait until ${new Date(retryAt).toLocaleTimeString()} before retrying.`,
                style: 'warning',
            });
            return;
        }

        controllerRef.current?.abort();
        const controller = new AbortController();
        controllerRef.current = controller;
        const runId = ++runIdRef.current;
        scanningPausedRef.current = false;
        setScanningPaused(false);
        setRetryAt(null);
        setToast({ show: false, text: '' });
        setState(initialScanningState(scanModes));

        const requester = createIgRequester({
            ownerId,
            signal: controller.signal,
            pauseRef: scanningPausedRef,
            lastRequestAtRef,
            onRetry: notice => {
                const text = `${notice.label}: retrying once in ${Math.ceil(notice.delayMs / 1_000)} seconds.`;
                setToast({ show: true, text, style: 'warning' });
                globalThis.setTimeout(() => {
                    if (runId !== runIdRef.current || controller.signal.aborted) {
                        return;
                    }
                    setToast(current => current.text === text
                        ? { show: false, text: '' }
                        : current);
                }, notice.delayMs);
            },
        });

        void (async () => {
            try {
                const { posts, postScope } = await fetchAllPosts(requester, postsList => {
                    updateScanning(runId, current => ({
                        ...current,
                        posts: postsList,
                        totalPostCount: postsList.length,
                        percentage: null,
                    }));
                });
                if (posts.length === 0) {
                    throw new RequestError('invalid_response', 'Instagram returned no posts for this account.');
                }

                updateScanning(runId, current => ({
                    ...current,
                    phase: 'fetching_likes',
                    percentage: 0,
                    posts,
                    totalPostCount: posts.length,
                    currentPostIndex: 0,
                }));
                const likerMap = await fetchAllLikers(
                    posts,
                    requester,
                    (currentPostIndex, identifiedLikerCount, percentage) => {
                        updateScanning(runId, current => ({
                            ...current,
                            currentPostIndex,
                            identifiedLikerCount,
                            percentage,
                        }));
                    },
                );

                updateScanning(runId, current => ({
                    ...current,
                    phase: 'fetching_following',
                    percentage: null,
                    followingCount: 0,
                }));
                const following = await fetchFollowing(requester, followingCount => {
                    updateScanning(runId, current => ({ ...current, followingCount }));
                });

                let followerIds: string[] = [];
                let followerUsers: Record<string, LikerUserNode> = {};
                let followerScope: UserListScope | null = null;
                if (scanModes.followerAnalysis) {
                    updateScanning(runId, current => ({
                        ...current,
                        phase: 'fetching_followers',
                        percentage: null,
                        followerCount: 0,
                    }));
                    const followers = await fetchFollowers(requester, followerCount => {
                        updateScanning(runId, current => ({ ...current, followerCount }));
                    });
                    followerIds = [...followers.ids];
                    followerUsers = followers.users;
                    followerScope = followers.scope;
                }

                if (runId !== runIdRef.current || controller.signal.aborted) {
                    return;
                }

                const completedScan: SavedScan = {
                    schemaVersion: 3,
                    timestamp: Date.now(),
                    ownerId,
                    scanModes,
                    postScope,
                    followingScope: following.scope,
                    followerScope,
                    posts,
                    likerMap,
                    followerIds,
                    followingIds: [...following.ids],
                    followerUsers,
                    followingUsers: following.users,
                };
                const saved = saveScanResults(completedScan);
                const retainedSavedScan = saved ? completedScan : loadScanResults(ownerId);
                setSavedScan(retainedSavedScan);
                setState(buildResultsState(completedScan));
                setToast(saved
                    ? { show: true, text: 'Scan complete. Results were saved in this browser.', style: 'success' }
                    : retainedSavedScan
                        ? {
                            show: true,
                            text: 'Scan complete, but the previous saved copy could not be replaced.',
                            style: 'warning',
                        }
                        : {
                            show: true,
                            text: 'Scan complete, but this browser could not save a local copy.',
                            style: 'warning',
                        });
            } catch (error) {
                if (runId !== runIdRef.current || controller.signal.aborted) {
                    return;
                }
                const requestError = isRequestError(error)
                    ? error
                    : new RequestError('invalid_response', 'The scan failed unexpectedly.', { originalError: error });
                if (requestError.kind === 'rate_limit' && requestError.retryAt) {
                    setRetryAt(requestError.retryAt);
                }
                setState({ status: 'initial' });
                setToast({ show: true, text: scanErrorMessage(requestError), style: 'error' });
            } finally {
                if (runId === runIdRef.current) {
                    controllerRef.current = null;
                    scanningPausedRef.current = false;
                    setScanningPaused(false);
                }
            }
        })();
    };

    const onLoadPrevious = () => {
        const saved = loadScanResults(ownerId);
        if (!saved) {
            setSavedScan(null);
            setToast({ show: true, text: 'No valid saved results exist for this account.', style: 'error' });
            return;
        }
        setSavedScan(saved);
        setState(buildResultsState(saved));
        setToast({ show: true, text: 'Saved results loaded.', style: 'success' });
    };

    const onDeleteSaved = () => {
        if (!savedScan || !confirm('Delete the saved scan from this browser?')) {
            return;
        }
        if (!clearScanResults()) {
            setToast({ show: true, text: 'The saved scan could not be deleted.', style: 'error' });
            return;
        }
        setSavedScan(null);
        setToast({ show: true, text: 'Saved scan deleted from this browser.', style: 'success' });
    };

    const handleViewChange = (currentView: ResultsView) => {
        setState(current => current.status === 'results'
            ? { ...current, currentView, searchTerm: '', page: 1, followerPage: 1, followerSearchTerm: '' }
            : current);
    };

    const onHome = () => {
        if (state.status === 'initial') {
            location.reload();
            return;
        }
        if (state.status === 'results') {
            setState({ status: 'initial' });
        }
    };

    let markup: React.JSX.Element;
    switch (state.status) {
        case 'initial':
            markup = (
                <ModeSelector
                    onScan={onScan}
                    onLoadPrevious={onLoadPrevious}
                    onDeleteSaved={onDeleteSaved}
                    savedScan={savedScan}
                    retryAt={retryAt}
                />
            );
            break;
        case 'scanning':
            markup = (
                <Scanning
                    state={state}
                    scanningPaused={scanningPaused}
                    pauseScan={pauseScan}
                    stopScan={stopScan}
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
                        return assertUnreachable(state.currentView);
                }
            })();
            markup = (
                <>
                    <ResultsNav
                        currentView={state.currentView}
                        scanModes={state.scanModes}
                        onViewChange={handleViewChange}
                    />
                    <aside className='results-notice'>
                        <strong>{state.postScope === 'recent_limit'
                            ? `Recent-post limit reached (${state.totalPostsScanned} posts).`
                            : `${state.totalPostsScanned} posts returned by the feed endpoint scanned.`}</strong>
                        {state.followingScope === 'page_limit' && (
                            <>{' '}<strong>Following page limit reached ({state.followingIds.length} accounts returned).</strong></>
                        )}
                        {state.followerScope === 'page_limit' && (
                            <>{' '}<strong>Follower page limit reached ({state.followerIds.length} accounts returned).</strong></>
                        )}
                        {' '}Like totals use each post&apos;s displayed count. Leaderboards include only identities returned by
                        Instagram&apos;s liker endpoint, which may be incomplete. Results belong to account ID {state.ownerId}.
                        {(state.followingScope === 'page_limit' || state.followerScope === 'page_limit')
                            && ' Accounts absent from bounded relationship pages are unknown, not confirmed non-relationships.'}
                    </aside>
                    {resultsContent}
                </>
            );
            break;
        }
        default:
            markup = assertUnreachable(state);
    }

    return (
        <div className='ill with-app-header'>
            <Toolbar
                state={state}
                hasSavedScan={savedScan !== null}
                onHome={onHome}
                onDeleteSaved={onDeleteSaved}
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

export function mountApp(ownerId: string): void {
    document.title = 'Instagram Likes Leaderboard';
    document.body.replaceChildren();
    const appContainer = document.createElement('div');
    appContainer.id = 'ill-root';
    document.body.appendChild(appContainer);
    render(<App ownerId={ownerId} />, appContainer);
}
