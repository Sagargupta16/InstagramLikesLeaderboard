import assert from 'node:assert/strict';
import test from 'node:test';
import { REQUEST_POLICY } from '../src/constants/constants';
import { DEMO_OWNER_ID, buildDemoFixture } from '../src/demo/fixture';
import { DEMO_POSTS_QUERY, DEMO_REQUEST_POLICY, createDemoFetch } from '../src/demo/mock-instagram';
import { fetchAllLikers, fetchAllPosts, fetchFollowers, fetchFollowing } from '../src/utils/scanner';
import { buildLeaderboard, createIgRequester } from '../src/utils/utils';

function demoRequester(fetchImpl: typeof fetch) {
    return createIgRequester({
        ownerId: DEMO_OWNER_ID,
        signal: new AbortController().signal,
        pauseRef: { current: false },
        fetchImpl,
        policy: { ...DEMO_REQUEST_POLICY, minGapMs: 0, maxGapMs: 0 },
    });
}

test('demo fixture is deterministic', () => {
    assert.deepEqual(buildDemoFixture(), buildDemoFixture());
});

test('demo policy keeps every production bound except the request gap', () => {
    const { minGapMs, maxGapMs, ...bounds } = DEMO_REQUEST_POLICY;
    const { minGapMs: _min, maxGapMs: _max, ...productionBounds } = REQUEST_POLICY;
    assert.deepEqual(bounds, productionBounds);
    assert.ok(minGapMs > 0 && maxGapMs >= minGapMs);
});

test('the production scanner completes a full scan against the demo transport', async () => {
    const fixture = buildDemoFixture();
    const requester = demoRequester(createDemoFetch(fixture, { latencyMs: 0 }));

    const { posts, postScope } = await fetchAllPosts(requester, DEMO_POSTS_QUERY, () => undefined);
    assert.equal(postScope, 'all_posts');
    assert.equal(posts.length, fixture.posts.length);

    const likerMap = await fetchAllLikers(posts, requester, () => undefined);
    const following = await fetchFollowing(requester, () => undefined);
    const followers = await fetchFollowers(requester, () => undefined);
    assert.equal(following.scope, 'endpoint_complete');
    assert.equal(following.ids.size, fixture.followingIds.length);
    assert.equal(followers.ids.size, fixture.followerIds.length);

    const expectedLikers = new Set(fixture.posts.flatMap(post => post.likerIds));
    assert.equal(Object.keys(likerMap).length, expectedLikers.size);
    for (const post of posts) {
        const source = fixture.posts.find(item => item.pk === post.id);
        assert.ok(source && post.edge_media_preview_like.count >= source.likerIds.length);
    }

    const leaderboard = buildLeaderboard(likerMap, following.ids, posts.length, true, following.users);
    assert.ok(leaderboard.length > 0);
    assert.ok((leaderboard[0]?.likesCount ?? 0) > posts.length / 2);

    const relationshipPages = (count: number) => Math.max(1, Math.ceil(count / 100));
    assert.equal(
        requester.requestCount,
        Math.ceil(fixture.posts.length / 12)
            + fixture.posts.length
            + relationshipPages(fixture.followingIds.length)
            + relationshipPages(fixture.followerIds.length),
    );
});

test('the demo transport honours Stop', async () => {
    const controller = new AbortController();
    const requester = createIgRequester({
        ownerId: DEMO_OWNER_ID,
        signal: controller.signal,
        pauseRef: { current: false },
        fetchImpl: createDemoFetch(buildDemoFixture(), { latencyMs: 1_000 }),
        policy: DEMO_REQUEST_POLICY,
    });
    const scan = fetchAllPosts(requester, DEMO_POSTS_QUERY, () => undefined);
    controller.abort();
    await assert.rejects(scan, { kind: 'stopped' });
});
