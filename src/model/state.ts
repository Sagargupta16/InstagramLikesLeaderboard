import { LeaderboardEntry } from './leaderboard-entry';
import { LeaderboardTab } from './leaderboard-tab';
import { SortField } from './sort-field';
import { PostNode } from './post';
import { LikerAccumulator, LikerUserNode } from './user';
import { ResultsView } from './results-view';
import { FollowerTab } from './follower-tab';
import { ScanModes } from './scan-modes';

export type ScanningPhase = 'fetching_posts' | 'fetching_likes' | 'fetching_following' | 'fetching_followers';

interface ScanningState {
    readonly status: 'scanning';
    readonly phase: ScanningPhase;
    readonly percentage: number;
    readonly scanModes: ScanModes;
    // Phase 1: posts
    readonly posts: readonly PostNode[];
    readonly totalPostCount: number;
    // Phase 2: likes
    readonly currentPostIndex: number;
    readonly likerMap: Readonly<Record<string, LikerAccumulator>>;
    // Phase 3: following
    readonly followingCount: number;
    readonly totalFollowingCount: number;
    // Phase 4: followers
    readonly followerCount: number;
}

interface ResultsState {
    readonly status: 'results';
    readonly currentView: ResultsView;
    readonly scanModes: ScanModes;
    // Leaderboard state
    readonly currentTab: LeaderboardTab;
    readonly searchTerm: string;
    readonly sortBy: SortField;
    readonly sortDirection: 'asc' | 'desc';
    readonly page: number;
    readonly followingLeaderboard: readonly LeaderboardEntry[];
    readonly notFollowingLeaderboard: readonly LeaderboardEntry[];
    // Aggregate stats
    readonly totalPostsScanned: number;
    readonly totalUniqueLikers: number;
    readonly totalLikes: number;
    // Follower analysis data
    readonly followerIds: readonly string[];
    readonly followingIds: readonly string[];
    readonly followerUsers: Readonly<Record<string, LikerUserNode>>;
    readonly followingUsers: Readonly<Record<string, LikerUserNode>>;
    readonly likerMap: Readonly<Record<string, LikerAccumulator>>;
    // Dashboard data
    readonly mostLikedPost: PostNode | null;
    readonly averageLikesPerPost: number;
    readonly posts: readonly PostNode[];
    // Filter state
    readonly hideVerified: boolean;
    readonly hiddenUsers: readonly string[];
    // Follower analysis view state
    readonly followerTab: FollowerTab;
    readonly followerSearchTerm: string;
    readonly followerPage: number;
}

export type State =
    | { readonly status: 'initial' }
    | ScanningState
    | ResultsState;
