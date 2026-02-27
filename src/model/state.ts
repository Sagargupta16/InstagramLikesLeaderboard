import { LeaderboardEntry } from './leaderboard-entry';
import { LeaderboardTab } from './leaderboard-tab';
import { SortField } from './sort-field';
import { PostNode } from './post';
import { LikerAccumulator } from './user';

export type ScanningPhase = 'fetching_posts' | 'fetching_likes' | 'fetching_following';

interface ScanningState {
    readonly status: 'scanning';
    readonly phase: ScanningPhase;
    readonly percentage: number;
    // Phase 1: posts
    readonly posts: readonly PostNode[];
    readonly totalPostCount: number;
    // Phase 2: likes
    readonly currentPostIndex: number;
    readonly likerMap: Readonly<Record<string, LikerAccumulator>>;
    // Phase 3: following
    readonly followingCount: number;
    readonly totalFollowingCount: number;
}

interface ResultsState {
    readonly status: 'results';
    readonly currentTab: LeaderboardTab;
    readonly searchTerm: string;
    readonly sortBy: SortField;
    readonly sortDirection: 'asc' | 'desc';
    readonly page: number;
    readonly followingLeaderboard: readonly LeaderboardEntry[];
    readonly notFollowingLeaderboard: readonly LeaderboardEntry[];
    readonly totalPostsScanned: number;
    readonly totalUniqueLikers: number;
    readonly totalLikes: number;
}

export type State =
    | { readonly status: 'initial' }
    | ScanningState
    | ResultsState;
