import assert from 'node:assert/strict';
import test from 'node:test';
import { REQUEST_POLICY, RequestPolicy } from '../src/constants/constants';
import { RequestError, createIgRequester } from '../src/utils/utils';

const testPolicy = (overrides: Partial<RequestPolicy> = {}): RequestPolicy => ({
    ...REQUEST_POLICY,
    minGapMs: 0,
    maxGapMs: 0,
    requestTimeoutMs: 100,
    retryDelayMs: 0,
    maxTransientRetryAfterMs: 0,
    maxScanMs: 5_000,
    ...overrides,
});

const jsonResponse = (body: unknown, status = 200, headers?: HeadersInit) =>
    new Response(JSON.stringify(body), { status, headers });

const errorKind = (kind: RequestError['kind']) => (error: unknown) =>
    error instanceof RequestError && error.kind === kind;

test('requester retries one transient network failure and then succeeds', async () => {
    let calls = 0;
    const requester = createIgRequester({
        ownerId: '123',
        signal: new AbortController().signal,
        pauseRef: { current: false },
        policy: testPolicy(),
        fetchImpl: (async () => {
            calls++;
            if (calls === 1) {
                throw new TypeError('offline');
            }
            return jsonResponse({ users: [] });
        }),
    });

    assert.deepEqual(await requester.request('/test', 'Test'), { users: [] });
    assert.equal(calls, 2);
    assert.equal(requester.requestCount, 2);
});

test('requester does not announce a retry beyond the request budget', async () => {
    let calls = 0;
    let retryNotices = 0;
    const requester = createIgRequester({
        ownerId: '123',
        signal: new AbortController().signal,
        pauseRef: { current: false },
        policy: testPolicy({ maxRequests: 1 }),
        onRetry: () => retryNotices++,
        fetchImpl: (async () => {
            calls++;
            throw new TypeError('offline');
        }),
    });

    await assert.rejects(requester.request('/test', 'Test'), errorKind('bounds'));
    assert.equal(calls, 1);
    assert.equal(retryNotices, 0);
});

test('requester never retries rate limits and exposes a retry time', async () => {
    let calls = 0;
    const requester = createIgRequester({
        ownerId: '123',
        signal: new AbortController().signal,
        pauseRef: { current: false },
        policy: testPolicy({ rateLimitFallbackMs: 30_000 }),
        now: () => 1_000,
        fetchImpl: (async () => {
            calls++;
            return jsonResponse({ message: 'Please wait a few minutes' }, 429);
        }),
    });

    await assert.rejects(requester.request('/test', 'Test'), error => {
        assert.ok(error instanceof RequestError);
        assert.equal(error.kind, 'rate_limit');
        assert.equal(error.retryAt, 31_000);
        return true;
    });
    assert.equal(calls, 1);
});

test('requester gives mixed throttle signals precedence over challenges', async t => {
    const cases = [
        { status: 403, body: { error_type: 'feedback_required' } },
        { status: 429, body: { checkpoint_url: '/challenge/' } },
    ];

    for (const { status, body } of cases) {
        await t.test(String(status), async () => {
            const requester = createIgRequester({
                ownerId: '123',
                signal: new AbortController().signal,
                pauseRef: { current: false },
                policy: testPolicy({ rateLimitFallbackMs: 30_000 }),
                now: () => 1_000,
                fetchImpl: (async () => jsonResponse(body, status)),
            });

            await assert.rejects(requester.request('/test', 'Test'), error => {
                assert.ok(error instanceof RequestError);
                assert.equal(error.kind, 'rate_limit');
                assert.equal(error.retryAt, 31_000);
                return true;
            });
        });
    }
});

test('requester treats auth and challenge responses as fatal', async t => {
    for (const [status, kind] of [[401, 'auth'], [403, 'challenge']] as const) {
        await t.test(String(status), async () => {
            let calls = 0;
            const requester = createIgRequester({
                ownerId: '123',
                signal: new AbortController().signal,
                pauseRef: { current: false },
                policy: testPolicy(),
                fetchImpl: (async () => {
                    calls++;
                    return jsonResponse({ status: 'fail' }, status);
                }),
            });

            await assert.rejects(requester.request('/test', 'Test'), errorKind(kind));
            assert.equal(calls, 1);
        });
    }
});

test('requester classifies a followed HTML login redirect as auth', async () => {
    const response = new Response('<!doctype html><title>Login</title>');
    Object.defineProperties(response, {
        redirected: { value: true },
        url: { value: 'https://www.instagram.com/accounts/login/' },
    });
    const requester = createIgRequester({
        ownerId: '123',
        signal: new AbortController().signal,
        pauseRef: { current: false },
        policy: testPolicy(),
        fetchImpl: (async () => response),
    });

    await assert.rejects(requester.request('/test', 'Test'), errorKind('auth'));
});

test('requester times out without retrying', async () => {
    let calls = 0;
    const requester = createIgRequester({
        ownerId: '123',
        signal: new AbortController().signal,
        pauseRef: { current: false },
        policy: testPolicy({ requestTimeoutMs: 10 }),
        fetchImpl: ((_url, init) => {
            calls++;
            return new Promise((_resolve, reject) => {
                init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
            });
        }),
    });

    await assert.rejects(requester.request('/test', 'Test'), errorKind('timeout'));
    assert.equal(calls, 1);
});

test('requester enforces the run deadline during an in-flight request', async () => {
    const requester = createIgRequester({
        ownerId: '123',
        signal: new AbortController().signal,
        pauseRef: { current: false },
        policy: testPolicy({ maxScanMs: 10, requestTimeoutMs: 100 }),
        fetchImpl: ((_url, init) => new Promise((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
        })),
    });

    await assert.rejects(requester.request('/test', 'Test'), errorKind('bounds'));
});

test('requester waits for resume before starting a request', async () => {
    let calls = 0;
    const pauseRef = { current: true };
    const requester = createIgRequester({
        ownerId: '123',
        signal: new AbortController().signal,
        pauseRef,
        policy: testPolicy(),
        fetchImpl: (async () => {
            calls++;
            return jsonResponse({ ok: true });
        }),
    });

    const pending = requester.request('/test', 'Test');
    await new Promise(resolve => setTimeout(resolve, 20));
    assert.equal(calls, 0);
    pauseRef.current = false;
    assert.deepEqual(await pending, { ok: true });
    assert.equal(calls, 1);
});

test('Stop aborts an in-flight request', async () => {
    const controller = new AbortController();
    const requester = createIgRequester({
        ownerId: '123',
        signal: controller.signal,
        pauseRef: { current: false },
        policy: testPolicy(),
        fetchImpl: ((_url, init) => new Promise((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
        })),
    });

    const pending = requester.request('/test', 'Test');
    controller.abort();
    await assert.rejects(pending, errorKind('stopped'));
});

test('requester preserves pacing between stopped runs', async () => {
    const lastRequestAtRef: { current: number | null } = { current: null };
    const policy = testPolicy({ minGapMs: 50, maxGapMs: 50, requestTimeoutMs: 500 });
    const firstController = new AbortController();
    const starts: number[] = [];
    let markFirstStarted: (() => void) | null = null;
    const firstStarted = new Promise<void>(resolve => {
        markFirstStarted = resolve;
    });
    const firstRequester = createIgRequester({
        ownerId: '123',
        signal: firstController.signal,
        pauseRef: { current: false },
        lastRequestAtRef,
        policy,
        fetchImpl: ((_url, init) => {
            starts.push(Date.now());
            markFirstStarted?.();
            return new Promise((_resolve, reject) => {
                init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
            });
        }),
    });

    const firstRequest = firstRequester.request('/first', 'First');
    await firstStarted;
    firstController.abort();
    await assert.rejects(firstRequest, errorKind('stopped'));

    const secondRequester = createIgRequester({
        ownerId: '123',
        signal: new AbortController().signal,
        pauseRef: { current: false },
        lastRequestAtRef,
        policy,
        fetchImpl: (async () => {
            starts.push(Date.now());
            return jsonResponse({ ok: true });
        }),
    });

    await secondRequester.request('/second', 'Second');
    assert.equal(starts.length, 2);
    assert.ok((starts[1] ?? 0) - (starts[0] ?? 0) >= 40);
});
