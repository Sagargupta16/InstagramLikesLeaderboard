import assert from 'node:assert/strict';
import test from 'node:test';
import { REQUEST_POLICY, RequestPolicy } from '../src/constants/constants';
import { PostNode } from '../src/model/post';
import { fetchAllLikers, fetchAllPosts, fetchFollowing } from '../src/utils/scanner';
import { IgRequester, RequestError } from '../src/utils/utils';

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

const rawPost = (id: string) => ({
    pk: id,
    like_count: Number(id) || 1,
    caption: null,
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
    const requester = fakeRequester([{
        items: [rawPost('1'), rawPost('1'), rawPost('2'), rawPost('3')],
        more_available: false,
    }], { maxPosts: 2 });

    const result = await fetchAllPosts(requester, () => undefined);
    assert.deepEqual(result.posts.map(item => item.id), ['1', '2']);
    assert.equal(result.postScope, 'recent_limit');
});

test('post scanner rejects a repeated cursor before completion', async () => {
    const requester = fakeRequester([
        { items: [rawPost('1')], more_available: true, next_max_id: 'same' },
        { items: [rawPost('2')], more_available: true, next_max_id: 'same' },
    ]);

    await assert.rejects(fetchAllPosts(requester, () => undefined), error =>
        error instanceof RequestError && error.kind === 'bounds');
});

test('scanner rejects missing usernames and invalid like counts', async () => {
    for (const likeCount of [undefined, -1, Number.NaN]) {
        const requester = fakeRequester([{
            items: [{ ...rawPost('1'), like_count: likeCount }],
            more_available: false,
        }]);
        await assert.rejects(fetchAllPosts(requester, () => undefined), error =>
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
