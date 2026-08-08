import { LikerAccumulator, LikerUserNode, UserListScope } from '../model/user';
import { PostNode, PostScope } from '../model/post';
import {
    LOCAL_STORAGE_KEY,
    REQUEST_POLICY,
    SAVED_SCAN_CACHE_TTL_MS,
} from '../constants/constants';
import { ScanModes } from '../model/scan-modes';

export interface SavedScan {
    readonly schemaVersion: 3;
    readonly timestamp: number;
    readonly ownerId: string;
    readonly scanModes: ScanModes;
    readonly postScope: PostScope;
    readonly followingScope: UserListScope;
    readonly followerScope: UserListScope | null;
    readonly posts: readonly PostNode[];
    readonly likerMap: Readonly<Record<string, LikerAccumulator>>;
    readonly followerIds: readonly string[];
    readonly followingIds: readonly string[];
    readonly followerUsers: Readonly<Record<string, LikerUserNode>>;
    readonly followingUsers: Readonly<Record<string, LikerUserNode>>;
}

interface StorageLike {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
}

function getStorage(storage?: StorageLike): StorageLike | null {
    if (storage) {
        return storage;
    }
    return typeof localStorage === 'undefined' ? null : localStorage;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isUser(value: unknown): value is LikerUserNode {
    if (!isRecord(value)) {
        return false;
    }
    return typeof value.id === 'string'
        && value.id !== ''
        && typeof value.username === 'string'
        && value.username !== ''
        && typeof value.full_name === 'string'
        && typeof value.profile_pic_url === 'string'
        && typeof value.is_verified === 'boolean';
}

function isUserRecord(value: unknown): value is Record<string, LikerUserNode> {
    return isRecord(value) && Object.entries(value).every(([id, user]) => isUser(user) && user.id === id);
}

function isLikerMap(value: unknown, postCount: number): value is Record<string, LikerAccumulator> {
    return isRecord(value) && Object.entries(value).every(([id, accumulator]) => {
        if (!isRecord(accumulator) || !isUser(accumulator.user) || accumulator.user.id !== id) {
            return false;
        }
        return Number.isInteger(accumulator.likesCount)
            && (accumulator.likesCount as number) > 0
            && (accumulator.likesCount as number) <= postCount;
    });
}

function isPost(value: unknown): value is PostNode {
    if (!isRecord(value)
        || typeof value.id !== 'string'
        || value.id === ''
        || !isRecord(value.edge_media_preview_like)
        || typeof value.edge_media_preview_like.count !== 'number'
        || !Number.isFinite(value.edge_media_preview_like.count)
        || value.edge_media_preview_like.count < 0
        || !isRecord(value.edge_media_to_caption)
        || !Array.isArray(value.edge_media_to_caption.edges)) {
        return false;
    }
    return value.edge_media_to_caption.edges.every(edge =>
        isRecord(edge)
        && isRecord(edge.node)
        && typeof edge.node.text === 'string');
}

function isUniqueStringArray(value: unknown): value is string[] {
    return Array.isArray(value)
        && value.every(item => typeof item === 'string' && item !== '')
        && new Set(value).size === value.length;
}

function hasExactUserKeys(
    ids: readonly string[],
    users: Readonly<Record<string, LikerUserNode>>,
): boolean {
    const keys = Object.keys(users);
    return keys.length === ids.length
        && ids.every(id => Object.prototype.hasOwnProperty.call(users, id));
}

function isScanModes(value: unknown): value is ScanModes {
    return isRecord(value)
        && typeof value.dashboard === 'boolean'
        && typeof value.followerAnalysis === 'boolean';
}

function isUserListScope(value: unknown): value is UserListScope {
    return value === 'endpoint_complete' || value === 'page_limit';
}

export function isSavedScan(value: unknown, ownerId: string): value is SavedScan {
    if (!isRecord(value)
        || value.schemaVersion !== 3
        || value.ownerId !== ownerId
        || typeof value.timestamp !== 'number'
        || !Number.isFinite(value.timestamp)
        || value.timestamp <= 0
        || !isScanModes(value.scanModes)
        || (value.postScope !== 'all_posts' && value.postScope !== 'recent_limit')
        || !isUserListScope(value.followingScope)
        || (value.followerScope !== null && !isUserListScope(value.followerScope))
        || !Array.isArray(value.posts)
        || value.posts.length === 0
        || value.posts.length > REQUEST_POLICY.maxPosts
        || !value.posts.every(isPost)
        || new Set(value.posts.map(post => post.id)).size !== value.posts.length
        || !isLikerMap(value.likerMap, value.posts.length)
        || !isUniqueStringArray(value.followerIds)
        || !isUniqueStringArray(value.followingIds)
        || !isUserRecord(value.followerUsers)
        || !isUserRecord(value.followingUsers)) {
        return false;
    }

    const saved = value as unknown as SavedScan;
    return hasExactUserKeys(saved.followerIds, saved.followerUsers)
        && hasExactUserKeys(saved.followingIds, saved.followingUsers)
        && saved.scanModes.followerAnalysis === (saved.followerScope !== null)
        && (saved.scanModes.followerAnalysis || saved.followerIds.length === 0);
}

export function saveScanResults(data: SavedScan, storage?: StorageLike): boolean {
    try {
        const target = getStorage(storage);
        if (!target) {
            return false;
        }
        target.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
        return true;
    } catch (error) {
        console.warn('Failed to save scan results to localStorage:', error);
        return false;
    }
}

export function loadScanResults(ownerId: string, storage?: StorageLike): SavedScan | null {
    try {
        const raw = getStorage(storage)?.getItem(LOCAL_STORAGE_KEY);
        if (!raw) {
            return null;
        }
        const parsed: unknown = JSON.parse(raw);
        return isSavedScan(parsed, ownerId) ? parsed : null;
    } catch (error) {
        console.warn('Failed to load scan results from localStorage:', error);
        return null;
    }
}

export function isReusableScan(
    saved: SavedScan,
    requestedModes: ScanModes,
    now = Date.now(),
): boolean {
    const age = now - saved.timestamp;
    const postScopeIsReusable = saved.postScope === 'all_posts'
        ? true
        : saved.posts.length === REQUEST_POLICY.maxPosts;
    const relationshipScopesAreReusable = saved.followingScope === 'endpoint_complete'
        && (saved.followerScope === null || saved.followerScope === 'endpoint_complete');

    return age >= 0
        && age < SAVED_SCAN_CACHE_TTL_MS
        && postScopeIsReusable
        && relationshipScopesAreReusable
        && (!requestedModes.followerAnalysis
            || (saved.scanModes.followerAnalysis && saved.followerScope === 'endpoint_complete'));
}

export function loadReusableScan(
    ownerId: string,
    requestedModes: ScanModes,
    storage?: StorageLike,
    now = Date.now(),
): SavedScan | null {
    const saved = loadScanResults(ownerId, storage);
    return saved && isReusableScan(saved, requestedModes, now) ? saved : null;
}

export function clearScanResults(storage?: StorageLike): boolean {
    try {
        const target = getStorage(storage);
        if (!target) {
            return false;
        }
        target.removeItem(LOCAL_STORAGE_KEY);
        return true;
    } catch (error) {
        console.warn('Failed to clear scan results from localStorage:', error);
        return false;
    }
}

export function formatTimeSince(timestamp: number): string {
    const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1_000));
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
    return `${Math.floor(hours / 24)}d ago`;
}
