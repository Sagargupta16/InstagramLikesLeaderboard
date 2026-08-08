import { PostNode, PostScope } from '../model/post';
import { LikerAccumulator, LikerUserNode, UserListScope } from '../model/user';
import {
    IgRequester,
    RequestError,
    followersUrlGenerator,
    followingUrlGenerator,
    postLikersUrlGenerator,
    userMediaUrlGenerator,
} from './utils';

export interface PostsResult {
    readonly posts: readonly PostNode[];
    readonly postScope: PostScope;
}

export interface FetchUsersResult {
    readonly ids: Set<string>;
    readonly users: Record<string, LikerUserNode>;
    readonly scope: UserListScope;
}

function asRecord(value: unknown, context: string): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new RequestError('invalid_response', `Instagram returned invalid ${context} data.`);
    }
    return value as Record<string, unknown>;
}

function nonEmptyId(value: unknown, context: string): string {
    if ((typeof value !== 'string' && typeof value !== 'number') || String(value).trim() === '') {
        throw new RequestError('invalid_response', `Instagram returned a ${context} without an ID.`);
    }
    return String(value);
}

function optionalString(value: unknown): string {
    return typeof value === 'string' ? value : '';
}

function parseUser(value: unknown): LikerUserNode {
    const user = asRecord(value, 'user');
    if (typeof user.username !== 'string' || user.username === '') {
        throw new RequestError('invalid_response', 'Instagram returned a user without a username.');
    }
    return {
        id: nonEmptyId(user.pk ?? user.id, 'user'),
        username: user.username,
        full_name: optionalString(user.full_name),
        profile_pic_url: optionalString(user.profile_pic_url),
        is_verified: user.is_verified === true,
    };
}

function parsePost(value: unknown): PostNode {
    const item = asRecord(value, 'post');
    const caption = item.caption && typeof item.caption === 'object'
        ? optionalString((item.caption as Record<string, unknown>).text)
        : '';
    if (typeof item.like_count !== 'number' || !Number.isFinite(item.like_count) || item.like_count < 0) {
        throw new RequestError('invalid_response', 'Instagram returned a post without a valid like count.');
    }

    return {
        id: nonEmptyId(item.pk ?? item.id, 'post'),
        edge_media_preview_like: { count: item.like_count },
        edge_media_to_caption: {
            edges: caption === '' ? [] : [{ node: { text: caption } }],
        },
    };
}

function parseCursor(value: unknown, context: string): string | null {
    if (value === undefined || value === null || value === '') {
        return null;
    }
    if ((typeof value !== 'string' && typeof value !== 'number') || String(value).trim() === '') {
        throw new RequestError('bounds', `Instagram returned a malformed ${context} cursor.`);
    }
    return String(value);
}

export async function fetchAllPosts(
    requester: IgRequester,
    onProgress: (posts: readonly PostNode[]) => void,
): Promise<PostsResult> {
    const posts: PostNode[] = [];
    const postIds = new Set<string>();
    const cursors = new Set<string>();
    let cursor: string | undefined;

    for (;;) {
        const data = asRecord(
            await requester.request<unknown>(userMediaUrlGenerator(requester.ownerId, cursor), 'Posts'),
            'post list',
        );
        if (!Array.isArray(data.items) || typeof data.more_available !== 'boolean') {
            throw new RequestError('invalid_response', 'Instagram returned an invalid post list.');
        }

        let uniqueOnPage = 0;
        let exceededPostLimit = false;
        for (const value of data.items) {
            const post = parsePost(value);
            if (postIds.has(post.id)) {
                continue;
            }
            postIds.add(post.id);
            uniqueOnPage++;
            if (posts.length >= requester.policy.maxPosts) {
                exceededPostLimit = true;
                continue;
            }
            posts.push(post);
        }
        onProgress([...posts]);

        if (exceededPostLimit || (posts.length >= requester.policy.maxPosts && data.more_available)) {
            return { posts, postScope: 'recent_limit' };
        }
        if (!data.more_available) {
            return { posts, postScope: 'all_posts' };
        }
        if (uniqueOnPage === 0) {
            throw new RequestError('bounds', 'Instagram repeated a post page before the scan completed.');
        }

        const nextCursor = parseCursor(data.next_max_id, 'post');
        if (nextCursor === null) {
            throw new RequestError('bounds', 'Instagram declared more posts without a continuation cursor.');
        }
        if (cursors.has(nextCursor)) {
            throw new RequestError('bounds', 'Instagram repeated a post cursor before the scan completed.');
        }
        cursors.add(nextCursor);
        cursor = nextCursor;
    }
}

export async function fetchAllLikers(
    posts: readonly PostNode[],
    requester: IgRequester,
    onProgress: (
        currentIndex: number,
        identifiedLikerCount: number,
        percentage: number,
    ) => void,
): Promise<Record<string, LikerAccumulator>> {
    const likerMap: Record<string, LikerAccumulator> = {};
    let identifiedLikerCount = 0;

    for (const [index, post] of posts.entries()) {
        const data = asRecord(
            await requester.request<unknown>(postLikersUrlGenerator(post.id), `Likers ${index + 1}/${posts.length}`),
            'liker list',
        );
        if (!Array.isArray(data.users)) {
            throw new RequestError('invalid_response', 'Instagram returned an invalid liker list.');
        }

        const seenForPost = new Set<string>();
        for (const value of data.users) {
            const user = parseUser(value);
            if (seenForPost.has(user.id)) {
                continue;
            }
            seenForPost.add(user.id);

            const existing = likerMap[user.id];
            if (existing) {
                likerMap[user.id] = { user, likesCount: existing.likesCount + 1 };
            } else {
                likerMap[user.id] = { user, likesCount: 1 };
                identifiedLikerCount++;
            }
        }
        onProgress(index + 1, identifiedLikerCount, Math.round(((index + 1) / posts.length) * 100));
    }

    return likerMap;
}

async function fetchUserList(
    requester: IgRequester,
    urlGenerator: (ownerId: string, nextMaxId?: string) => string,
    label: string,
    onProgress: (count: number) => void,
): Promise<FetchUsersResult> {
    const ids = new Set<string>();
    const users: Record<string, LikerUserNode> = {};
    const cursors = new Set<string>();
    let cursor: string | undefined;

    for (;;) {
        const data = asRecord(
            await requester.request<unknown>(urlGenerator(requester.ownerId, cursor), label),
            `${label.toLowerCase()} list`,
        );
        if (!Array.isArray(data.users)) {
            throw new RequestError('invalid_response', `Instagram returned an invalid ${label.toLowerCase()} list.`);
        }

        for (const value of data.users) {
            const user = parseUser(value);
            ids.add(user.id);
            users[user.id] = user;
        }
        onProgress(ids.size);

        const nextCursor = parseCursor(data.next_max_id, label.toLowerCase());
        if (nextCursor === null) {
            return { ids, users, scope: 'endpoint_complete' };
        }
        if (cursors.has(nextCursor)) {
            throw new RequestError('bounds', `Instagram repeated the ${label.toLowerCase()} cursor.`);
        }
        cursors.add(nextCursor);
        cursor = nextCursor;
    }
}

export function fetchFollowing(
    requester: IgRequester,
    onProgress: (count: number) => void,
): Promise<FetchUsersResult> {
    return fetchUserList(requester, followingUrlGenerator, 'Following', onProgress);
}

export function fetchFollowers(
    requester: IgRequester,
    onProgress: (count: number) => void,
): Promise<FetchUsersResult> {
    return fetchUserList(requester, followersUrlGenerator, 'Followers', onProgress);
}
