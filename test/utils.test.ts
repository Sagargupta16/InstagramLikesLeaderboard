import assert from 'node:assert/strict';
import test from 'node:test';
import { LeaderboardEntry } from '../src/model/leaderboard-entry';
import { sortLeaderboard } from '../src/utils/utils';

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
