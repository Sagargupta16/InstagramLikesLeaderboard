import assert from 'node:assert/strict';
import test from 'node:test';
import { REQUEST_POLICY, RequestPolicy } from '../src/constants/constants';
import { PostNode } from '../src/model/post';
import { fetchAllLikers, fetchAllPosts, fetchFollowing } from '../src/utils/scanner';
import { IgRequester, PostsQuery, RequestError } from '../src/utils/utils';

function fakeRequester(
    responses: unknown[],
    policy: Partial<RequestPolicy> = {},
): IgRequester {
    let requestCount = 0;
    return {
        ownerId: 'owner',
        policy: { ...REQUEST_POLICY, ...policy },
        get requestCount() {
            return requestCount;
        },
        async request<T>() {
            requestCount++;
            const response = responses.shift();
            if (response instanceof Error) {
                throw response;
            }
            return response as T;
        },
    };
}

const rawPost = (id: string, ownerId = 'owner') => ({
    pk: id,
    like_count: Number(id) || 1,
    caption: null,
    user: { pk: ownerId },
});

const postsQuery: PostsQuery = { username: 'owner', docId: '1', lsd: 'lsd', fbDtsg: 'dtsg' };

const postPage = (items: unknown[], endCursor: string | null = null) => ({
    data: {
        xdt_api__v1__feed__user_timeline_graphql_connection: {
            edges: items.map(node => ({ node })),
            page_info: { has_next_page: endCursor !== null, end_cursor: endCursor },
        },
    },
});

const post = (id: string): PostNode => ({
    id,
    edge_media_preview_like: { count: 1 },
    edge_media_to_caption: { edges: [] },
});

const rawUser = (id: string) => ({
    pk: id,
    username: `user${id}`,
    full_name: `User ${id}`,
    profile_pic_url: '',
    is_verified: false,
});

test('post scanner deduplicates IDs and returns a bounded recent scope', async () => {
    const requester = fakeRequester([
        postPage([rawPost('1'), rawPost('1'), rawPost('2'), rawPost('3')]),
    ], { maxPosts: 2 });

    const result = await fetchAllPosts(requester, postsQuery, () => undefined);
    assert.deepEqual(result.posts.map(item => item.id), ['1', '2']);
    assert.equal(result.postScope, 'recent_limit');
});

test('post scanner rejects a repeated cursor before completion', async () => {
    const requester = fakeRequester([
        postPage([rawPost('1')], 'same'),
        postPage([rawPost('2')], 'same'),
    ]);

    await assert.rejects(fetchAllPosts(requester, postsQuery, () => undefined), error =>
        error instanceof RequestError && error.kind === 'bounds');
});

test('post scanner rejects a profile that is not the signed-in account', async () => {
    const requester = fakeRequester([postPage([rawPost('1', 'someone-else')])]);

    await assert.rejects(fetchAllPosts(requester, postsQuery, () => undefined), error =>
        error instanceof RequestError && error.kind === 'invalid_response');
});

test('scanner rejects missing usernames and invalid like counts', async () => {
    for (const likeCount of [undefined, -1, Number.NaN]) {
        const requester = fakeRequester([postPage([{ ...rawPost('1'), like_count: likeCount }])]);
        await assert.rejects(fetchAllPosts(requester, postsQuery, () => undefined), error =>
            error instanceof RequestError && error.kind === 'invalid_response');
    }

    const requester = fakeRequester([{
        users: [{ ...rawUser('1'), username: '' }],
    }]);
    await assert.rejects(fetchAllLikers([post('1')], requester, () => undefined), error =>
        error instanceof RequestError && error.kind === 'invalid_response');
});

test('liker scanner counts each identity at most once per post', async () => {
    const requester = fakeRequester([
        { users: [rawUser('1'), rawUser('1'), rawUser('2')] },
        { users: [rawUser('1')] },
    ]);
    const identifiedCounts: number[] = [];

    const likerMap = await fetchAllLikers(
        [post('1'), post('2')],
        requester,
        (_index, identifiedLikerCount) => identifiedCounts.push(identifiedLikerCount),
    );
    assert.equal(likerMap['1']?.likesCount, 2);
    assert.equal(likerMap['2']?.likesCount, 1);
    assert.deepEqual(identifiedCounts, [2, 2]);
});

test('liker scanner propagates a required-request failure', async () => {
    const failure = new RequestError('network', 'offline');
    const requester = fakeRequester([{ users: [rawUser('1')] }, failure]);

    await assert.rejects(
        fetchAllLikers([post('1'), post('2')], requester, () => undefined),
        error => error === failure,
    );
});

test('user-list scanner deduplicates users across pages', async () => {
    const requester = fakeRequester([
        { users: [rawUser('1')], next_max_id: 'next' },
        { users: [rawUser('1'), rawUser('2')] },
    ]);

    const result = await fetchFollowing(requester, () => undefined);
    assert.deepEqual([...result.ids], ['1', '2']);
    assert.equal(result.users['1']?.username, 'user1');
});

test('user parser keeps optional privacy and profile photo flags only when present', async () => {
    const requester = fakeRequester([{
        users: [{ ...rawUser('1'), is_private: true, has_anonymous_profile_picture: false }, rawUser('2')],
    }]);

    const result = await fetchFollowing(requester, () => undefined);
    assert.deepEqual(
        [result.users['1']?.is_private, result.users['1']?.has_anonymous_profile_picture],
        [true, false],
    );
    assert.deepEqual(Object.keys(result.users['2'] ?? {}).includes('is_private'), false);
});
