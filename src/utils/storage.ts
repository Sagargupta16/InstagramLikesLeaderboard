import { LeaderboardEntry } from '../model/leaderboard-entry';
import { LikerAccumulator, LikerUserNode } from '../model/user';
import { PostNode } from '../model/post';
import { LOCAL_STORAGE_KEY } from '../constants/constants';
import { ScanModes } from '../model/scan-modes';

export interface SavedScan {
    readonly timestamp: number;
    readonly scanModes: ScanModes;
    readonly totalPostsScanned: number;
    readonly totalUniqueLikers: number;
    readonly totalLikes: number;
    readonly followingLeaderboard: readonly LeaderboardEntry[];
    readonly notFollowingLeaderboard: readonly LeaderboardEntry[];
    readonly followerIds: readonly string[];
    readonly followingIds: readonly string[];
    readonly followerUsers: Readonly<Record<string, LikerUserNode>>;
    readonly followingUsers: Readonly<Record<string, LikerUserNode>>;
    readonly likerMap: Readonly<Record<string, LikerAccumulator>>;
    readonly mostLikedPost: PostNode | null;
    readonly averageLikesPerPost: number;
    readonly posts: readonly PostNode[];
}

export function saveScanResults(data: SavedScan): void {
    try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
        console.info('Scan results saved to localStorage.');
    } catch (e) {
        console.warn('Failed to save scan results to localStorage:', e);
    }
}

export function loadScanResults(): SavedScan | null {
    try {
        const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (!raw) {
            return null;
        }
        return JSON.parse(raw) as SavedScan;
    } catch (e) {
        console.warn('Failed to load scan results from localStorage:', e);
        return null;
    }
}

export function clearScanResults(): void {
    try {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
    } catch (_e) {
        // ignore
    }
}

export function formatTimeSince(timestamp: number): string {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) {
        return 'just now';
    }
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
        return `${minutes}m ago`;
    }
    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
        return `${hours}h ago`;
    }
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}
