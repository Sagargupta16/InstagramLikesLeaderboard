import { LeaderboardEntry } from './leaderboard-entry';
import { LeaderboardTab } from './leaderboard-tab';
import { SortField } from './sort-field';
import { PostNode, PostScope } from './post';
import { LikerAccumulator, LikerUserNode } from './user';
import { ResultsView } from './results-view';
import { FollowerTab } from './follower-tab';
import { ScanModes } from './scan-modes';

export type ScanningPhase = 'fetching_posts' | 'fetching_likes' | 'fetching_following' | 'fetching_followers';

interface ScanningState {
    readonly status: 'scanning';
    readonly phase: ScanningPhase;
    readonly percentage: number | null;
    readonly scanModes: ScanModes;
    readonly posts: readonly PostNode[];
    readonly totalPostCount: number;
    readonly currentPostIndex: number;
    readonly identifiedLikerCount: number;
    readonly followingCount: number;
    readonly followerCount: number;
}

interface ResultsState {
    readonly status: 'results';
    readonly currentView: ResultsView;
    readonly scanModes: ScanModes;
    readonly scannedAt: number;
    readonly ownerId: string;
    readonly postScope: PostScope;
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
    readonly followerIds: readonly string[];
    readonly followingIds: readonly string[];
    readonly followerUsers: Readonly<Record<string, LikerUserNode>>;
    readonly followingUsers: Readonly<Record<string, LikerUserNode>>;
    readonly likerMap: Readonly<Record<string, LikerAccumulator>>;
    readonly mostLikedPost: PostNode | null;
    readonly averageLikesPerPost: number;
    readonly posts: readonly PostNode[];
    readonly hideVerified: boolean;
    readonly hiddenUsers: readonly string[];
    readonly followerTab: FollowerTab;
    readonly followerSearchTerm: string;
    readonly followerPage: number;
}

export type State =
    | { readonly status: 'initial' }
    | ScanningState
    | ResultsState;
