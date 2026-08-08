import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_SCAN_MODES } from '../src/model/scan-modes';
import {
    SavedScan,
    clearScanResults,
    loadScanResults,
    saveScanResults,
} from '../src/utils/storage';

class MemoryStorage {
    private readonly values = new Map<string, string>();

    getItem(key: string): string | null {
        return this.values.get(key) ?? null;
    }

    setItem(key: string, value: string): void {
        this.values.set(key, value);
    }

    removeItem(key: string): void {
        this.values.delete(key);
    }
}

const user = {
    id: 'user-1',
    username: 'user1',
    full_name: 'User One',
    profile_pic_url: '',
    is_verified: false,
};

const savedScan: SavedScan = {
    schemaVersion: 3,
    timestamp: 1,
    ownerId: 'owner-1',
    scanModes: DEFAULT_SCAN_MODES,
    postScope: 'all_posts',
    followingScope: 'endpoint_complete',
    followerScope: null,
    posts: [{
        id: 'post-1',
        edge_media_preview_like: { count: 8 },
        edge_media_to_caption: { edges: [] },
    }],
    likerMap: { 'user-1': { user, likesCount: 1 } },
    followerIds: [],
    followingIds: ['user-1'],
    followerUsers: {},
    followingUsers: { 'user-1': user },
};

test('storage round-trips a valid owner-scoped schema-v3 scan', () => {
    const storage = new MemoryStorage();
    assert.equal(saveScanResults(savedScan, storage), true);
    assert.deepEqual(loadScanResults('owner-1', storage), savedScan);
    assert.equal(loadScanResults('different-owner', storage), null);
});

test('storage rejects malformed and legacy data', () => {
    const storage = new MemoryStorage();
    storage.setItem('ill_scan_results', JSON.stringify({ ...savedScan, schemaVersion: 2 }));
    assert.equal(loadScanResults('owner-1', storage), null);

    storage.setItem('ill_scan_results', JSON.stringify({
        ...savedScan,
        likerMap: { 'user-1': { user, likesCount: 2 } },
    }));
    assert.equal(loadScanResults('owner-1', storage), null);

    storage.setItem('ill_scan_results', JSON.stringify({
        ...savedScan,
        followingIds: [],
        followingUsers: { 'user-1': user },
    }));
    assert.equal(loadScanResults('owner-1', storage), null);

    storage.setItem('ill_scan_results', JSON.stringify({
        ...savedScan,
        posts: [],
        likerMap: {},
    }));
    assert.equal(loadScanResults('owner-1', storage), null);

    const userWithoutUsername = { ...user, username: '' };
    storage.setItem('ill_scan_results', JSON.stringify({
        ...savedScan,
        likerMap: { 'user-1': { user: userWithoutUsername, likesCount: 1 } },
    }));
    assert.equal(loadScanResults('owner-1', storage), null);

    storage.setItem('ill_scan_results', JSON.stringify({
        ...savedScan,
        posts: [{
            ...savedScan.posts[0],
            edge_media_preview_like: { count: -1 },
        }],
    }));
    assert.equal(loadScanResults('owner-1', storage), null);
});

test('storage deletes the saved scan', () => {
    const storage = new MemoryStorage();
    saveScanResults(savedScan, storage);
    assert.equal(clearScanResults(storage), true);
    assert.equal(loadScanResults('owner-1', storage), null);
});

test('follower comparison is off by default', () => {
    assert.equal(DEFAULT_SCAN_MODES.followerAnalysis, false);
});
