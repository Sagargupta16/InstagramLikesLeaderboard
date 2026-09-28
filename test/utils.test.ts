import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_AUDIENCE_FILTERS } from '../src/model/audience-filters';
import { LeaderboardEntry } from '../src/model/leaderboard-entry';
import { LikerUserNode } from '../src/model/user';
import { matchesAccountFilters, matchesLikesFilter, sortLeaderboard } from '../src/utils/utils';

const entry = (id: string, likesCount: number, rank: number): LeaderboardEntry => ({
    user: {
        id,
        username: `user${id}`,
        full_name: `User ${id}`,
        profile_pic_url: '',
        is_verified: false,
    },
    likesCount,
    totalPosts: 2,
    percentage: likesCount * 50,
    rank,
});

test('leaderboard sorting assigns ranks without mutating input entries', () => {
    const original = [entry('1', 1, 10), entry('2', 2, 20)];

    const sorted = sortLeaderboard(original, 'likes', 'desc');

    assert.deepEqual(original.map(item => item.rank), [10, 20]);
    assert.deepEqual(sorted.map(item => [item.user.id, item.rank]), [['2', 1], ['1', 2]]);
});

const account = (overrides: Partial<LikerUserNode>): LikerUserNode => ({
    id: 'a',
    username: 'a',
    full_name: '',
    profile_pic_url: '',
    is_verified: false,
    ...overrides,
});

test('account filters hide verified, hidden, no-photo, and mismatched privacy accounts', () => {
    const none = new Set<string>();
    const filters = { ...DEFAULT_AUDIENCE_FILTERS, hideVerified: true, hideNoProfilePicture: true };

    assert.equal(matchesAccountFilters(account({}), filters, none), true);
    assert.equal(matchesAccountFilters(account({ is_verified: true }), filters, none), false);
    assert.equal(matchesAccountFilters(account({ has_anonymous_profile_picture: true }), filters, none), false);
    assert.equal(matchesAccountFilters(account({}), DEFAULT_AUDIENCE_FILTERS, new Set(['a'])), false);

    const privateOnly = { ...DEFAULT_AUDIENCE_FILTERS, privacy: 'private' as const };
    const publicOnly = { ...DEFAULT_AUDIENCE_FILTERS, privacy: 'public' as const };
    assert.equal(matchesAccountFilters(account({ is_private: true }), privateOnly, none), true);
    assert.equal(matchesAccountFilters(account({}), privateOnly, none), false);
    assert.equal(matchesAccountFilters(account({ is_private: true }), publicOnly, none), false);
    assert.equal(matchesAccountFilters(account({ is_private: false }), publicOnly, none), true);
});

test('likes filter supports any, none, and minimum counts', () => {
    assert.equal(matchesLikesFilter(0, 'any'), true);
    assert.equal(matchesLikesFilter(0, 'none'), true);
    assert.equal(matchesLikesFilter(1, 'none'), false);
    assert.equal(matchesLikesFilter(2, 3), false);
    assert.equal(matchesLikesFilter(3, 3), true);
});
