// In-page stand-in for the Instagram endpoints the scanner calls. The demo runs the
// real requester and scanner against it, so pacing, pagination, validation, and the
// results views are the production code paths; only the transport is replaced.

import { POSTS_QUERY_URL, PostsQuery } from '../utils/utils';
import { POSTS_PER_PAGE, REQUEST_POLICY, RequestPolicy } from '../constants/constants';
import { DEMO_USERNAME, DemoAccount, DemoFixture } from './fixture';

const RELATIONSHIP_PAGE_SIZE = 100;

export const DEMO_POSTS_QUERY: PostsQuery = {
    username: DEMO_USERNAME,
    docId: '1',
    lsd: 'demo',
    fbDtsg: 'demo',
};

// Same bounds as production with shorter gaps, so a demo scan finishes in seconds.
export const DEMO_REQUEST_POLICY: Readonly<RequestPolicy> = {
    ...REQUEST_POLICY,
    minGapMs: 120,
    maxGapMs: 260,
};

export interface DemoFetchOptions {
    readonly latencyMs?: number;
}

function json(payload: unknown, status = 200): Response {
    return new Response(JSON.stringify(payload), {
        status,
        headers: { 'content-type': 'application/json' },
    });
}

function accountsFor(fixture: DemoFixture, ids: readonly string[]): DemoAccount[] {
    return ids.flatMap(id => {
        const account = fixture.accounts[id];
        return account ? [account] : [];
    });
}

function pageIndex(cursor: string | null | undefined): number {
    const index = Number(cursor ?? 0);
    return Number.isInteger(index) && index >= 0 ? index : 0;
}

function formParams(body: BodyInit | null | undefined): URLSearchParams {
    if (body instanceof URLSearchParams) {
        return body;
    }
    return new URLSearchParams(typeof body === 'string' ? body : '');
}

function requestUrl(input: RequestInfo | URL): string {
    if (typeof input === 'string') {
        return input;
    }
    return input instanceof URL ? input.href : input.url;
}

function postsPage(fixture: DemoFixture, body: BodyInit | null | undefined): Response {
    const params = formParams(body);
    const variables = JSON.parse(params.get('variables') ?? '{}') as { readonly after?: string | null };
    const start = pageIndex(variables.after);
    const end = Math.min(start + POSTS_PER_PAGE, fixture.posts.length);
    const hasNextPage = end < fixture.posts.length;
    return json({
        data: {
            xdt_api__v1__feed__user_timeline_graphql_connection: {
                edges: fixture.posts.slice(start, end).map(post => ({
                    node: {
                        pk: post.pk,
                        id: `${post.pk}_${fixture.ownerId}`,
                        like_count: post.like_count,
                        caption: post.caption === '' ? null : { text: post.caption },
                        user: { pk: fixture.ownerId, username: fixture.username },
                    },
                })),
                page_info: { has_next_page: hasNextPage, end_cursor: hasNextPage ? String(end) : null },
            },
        },
        status: 'ok',
    });
}

function relationshipPage(fixture: DemoFixture, ids: readonly string[], cursor: string | null): Response {
    const start = pageIndex(cursor);
    const end = Math.min(start + RELATIONSHIP_PAGE_SIZE, ids.length);
    return json({
        users: accountsFor(fixture, ids.slice(start, end)),
        ...(end < ids.length ? { next_max_id: String(end) } : {}),
        status: 'ok',
    });
}

function route(fixture: DemoFixture, url: string, init?: RequestInit): Response {
    if (url === POSTS_QUERY_URL && init?.method === 'POST') {
        return postsPage(fixture, init.body);
    }

    const parsed = new URL(url);
    const likers = /^\/api\/v1\/media\/([^/]+)\/likers\/$/.exec(parsed.pathname);
    if (likers) {
        const post = fixture.posts.find(item => item.pk === decodeURIComponent(likers[1] ?? ''));
        if (!post) {
            return json({ message: 'Media not found', status: 'fail' }, 404);
        }
        return json({
            users: accountsFor(fixture, post.likerIds),
            status: 'ok',
        });
    }

    const relationship = /^\/api\/v1\/friendships\/([^/]+)\/(following|followers)\/$/.exec(parsed.pathname);
    if (relationship?.[1] === fixture.ownerId) {
        const ids = relationship[2] === 'following' ? fixture.followingIds : fixture.followerIds;
        return relationshipPage(fixture, ids, parsed.searchParams.get('max_id'));
    }

    return json({ message: 'Not found', status: 'fail' }, 404);
}

function abortError(): Error {
    return new DOMException('The operation was aborted.', 'AbortError');
}

export function createDemoFetch(fixture: DemoFixture, options: DemoFetchOptions = {}): typeof fetch {
    const latencyMs = options.latencyMs ?? 90;
    return (input, init) => new Promise<Response>((resolve, reject) => {
        const signal = init?.signal;
        if (signal?.aborted) {
            reject(abortError());
            return;
        }
        const url = requestUrl(input);
        let timer: ReturnType<typeof globalThis.setTimeout>;
        const onAbort = () => {
            globalThis.clearTimeout(timer);
            reject(abortError());
        };
        timer = globalThis.setTimeout(() => {
            signal?.removeEventListener('abort', onAbort);
            try {
                resolve(route(fixture, url, init));
            } catch (error) {
                reject(error);
            }
        }, latencyMs);
        signal?.addEventListener('abort', onAbort, { once: true });
    });
}
