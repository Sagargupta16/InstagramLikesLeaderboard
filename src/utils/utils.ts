import { LikerUserNode, LikerAccumulator } from '../model/user';
import { LeaderboardEntry } from '../model/leaderboard-entry';
import { SortField } from '../model/sort-field';
import {
    IG_APP_ID,
    LEADERBOARD_ENTRIES_PER_PAGE,
    POSTS_PER_PAGE,
    REQUEST_POLICY,
    RequestPolicy,
} from '../constants/constants';

export function assertUnreachable(_value: never): never {
    throw new Error('Statement should be unreachable');
}

export type RequestErrorKind =
    | 'auth'
    | 'challenge'
    | 'rate_limit'
    | 'timeout'
    | 'stopped'
    | 'bounds'
    | 'network'
    | 'http'
    | 'invalid_response';

export class RequestError extends Error {
    readonly kind: RequestErrorKind;
    readonly status?: number;
    readonly retryAt?: number;
    readonly originalError?: unknown;

    constructor(
        kind: RequestErrorKind,
        message: string,
        options: { readonly status?: number; readonly retryAt?: number; readonly originalError?: unknown } = {},
    ) {
        super(message);
        this.name = 'RequestError';
        this.kind = kind;
        this.status = options.status;
        this.retryAt = options.retryAt;
        this.originalError = options.originalError;
    }
}

export function isRequestError(error: unknown): error is RequestError {
    return error instanceof RequestError;
}

export function getCookie(name: string): string | null {
    if (typeof document === 'undefined') {
        return null;
    }
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length !== 2) {
        return null;
    }
    return parts.pop()!.split(';').shift() || null;
}

export function getInstagramOwnerId(): string | null {
    return getCookie('ds_user_id');
}

export function abortableSleep(ms: number, signal: AbortSignal): Promise<void> {
    if (signal.aborted) {
        return Promise.reject(new RequestError('stopped', 'Scan stopped.'));
    }
    if (ms <= 0) {
        return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
        let timer: ReturnType<typeof globalThis.setTimeout>;
        const onAbort = () => {
            globalThis.clearTimeout(timer);
            reject(new RequestError('stopped', 'Scan stopped.'));
        };
        timer = globalThis.setTimeout(() => {
            signal.removeEventListener('abort', onAbort);
            resolve();
        }, ms);
        signal.addEventListener('abort', onAbort, { once: true });
    });
}

interface PauseRef {
    readonly current: boolean;
}

interface RequestStartRef {
    current: number | null;
}

interface RetryNotice {
    readonly label: string;
    readonly attempt: number;
    readonly maxAttempts: number;
    readonly delayMs: number;
}

export interface IgRequester {
    readonly ownerId: string;
    readonly policy: Readonly<RequestPolicy>;
    readonly requestCount: number;
    request<T>(url: string, label: string): Promise<T>;
}

interface IgRequesterOptions {
    readonly ownerId: string;
    readonly signal: AbortSignal;
    readonly pauseRef: PauseRef;
    readonly lastRequestAtRef?: RequestStartRef;
    readonly onRetry?: (notice: RetryNotice) => void;
    readonly fetchImpl?: typeof fetch;
    readonly policy?: Readonly<RequestPolicy>;
    readonly now?: () => number;
    readonly random?: () => number;
}

const TRANSIENT_STATUSES = new Set([408, 500, 502, 503, 504]);

function signalText(payload: unknown): string {
    if (!payload || typeof payload !== 'object') {
        return '';
    }
    const record = payload as Record<string, unknown>;
    return [
        record.message,
        record.error_type,
        record.status,
        record.feedback_message,
        record.checkpoint_url,
        record.challenge,
    ].filter(value => typeof value === 'string').join(' ').toLowerCase();
}

function parseRetryAfter(value: string | null, now: number): number | null {
    if (!value) {
        return null;
    }
    const seconds = Number(value);
    if (Number.isFinite(seconds) && seconds >= 0) {
        return seconds * 1_000;
    }
    const date = Date.parse(value);
    return Number.isFinite(date) ? Math.max(0, date - now) : null;
}

function classifyResponse(
    response: Response,
    payload: unknown,
    policy: Readonly<RequestPolicy>,
    now: number,
): RequestError | null {
    const text = signalText(payload);
    const loginRedirect = response.redirected && response.url.includes('/accounts/login');

    if (response.status === 401 || loginRedirect || text.includes('login_required')) {
        return new RequestError('auth', 'Instagram login is required.', { status: response.status });
    }
    if (
        response.status === 429
        || text.includes('feedback_required')
        || text.includes('please wait')
        || text.includes('rate_limit')
        || text.includes('rate limit')
    ) {
        const retryAfter = parseRetryAfter(response.headers.get('retry-after'), now);
        return new RequestError('rate_limit', 'Instagram asked this account to slow down.', {
            status: response.status,
            retryAt: now + (retryAfter ?? policy.rateLimitFallbackMs),
        });
    }
    if (
        response.status === 403
        || text.includes('challenge_required')
        || text.includes('checkpoint')
        || text.includes('sentry_block')
    ) {
        return new RequestError('challenge', 'Instagram blocked the request with a challenge or checkpoint.', {
            status: response.status,
        });
    }
    if (!response.ok) {
        const retryAfter = parseRetryAfter(response.headers.get('retry-after'), now);
        return new RequestError('http', `Instagram returned HTTP ${response.status}.`, {
            status: response.status,
            retryAt: retryAfter === null
                ? undefined
                : now + Math.min(retryAfter, policy.maxTransientRetryAfterMs),
        });
    }
    return null;
}

async function fetchWithTimeout(
    url: string,
    fetchImpl: typeof fetch,
    runSignal: AbortSignal,
    timeoutMs: number,
    timeoutError: RequestError,
): Promise<{ readonly response: Response; readonly body: string }> {
    const controller = new AbortController();
    const onRunAbort = () => controller.abort();
    runSignal.addEventListener('abort', onRunAbort, { once: true });
    const timeout = globalThis.setTimeout(() => {
        controller.abort(timeoutError);
    }, timeoutMs);

    try {
        const response = await fetchImpl(url, {
            headers: {
                'accept': 'application/json',
                'x-ig-app-id': IG_APP_ID,
                'x-requested-with': 'XMLHttpRequest',
                'x-csrftoken': getCookie('csrftoken') || '',
            },
            credentials: 'include',
            signal: controller.signal,
        });
        const body = await response.text();
        return { response, body };
    } catch (error) {
        if (runSignal.aborted) {
            throw new RequestError('stopped', 'Scan stopped.', { originalError: error });
        }
        if (controller.signal.reason === timeoutError) {
            throw timeoutError;
        }
        if (error instanceof TypeError) {
            throw new RequestError('network', 'A network error interrupted the Instagram request.', {
                originalError: error,
            });
        }
        throw new RequestError('network', 'The Instagram request failed.', { originalError: error });
    } finally {
        globalThis.clearTimeout(timeout);
        runSignal.removeEventListener('abort', onRunAbort);
    }
}

export function createIgRequester(options: IgRequesterOptions): IgRequester {
    const policy = options.policy ?? REQUEST_POLICY;
    const fetchImpl = options.fetchImpl ?? fetch;
    const now = options.now ?? Date.now;
    const random = options.random ?? Math.random;
    const lastRequestAtRef = options.lastRequestAtRef ?? { current: null };
    const startedAt = now();
    const deadlineAt = startedAt + policy.maxScanMs;
    let requestCount = 0;
    let active = false;

    const runTimeError = () => new RequestError('bounds', 'The scan reached its maximum run time.');
    const remainingRunMs = () => deadlineAt - now();
    const ensureWithinRunTime = () => {
        if (remainingRunMs() <= 0) {
            throw runTimeError();
        }
    };

    const ensureAvailable = () => {
        if (options.signal.aborted) {
            throw new RequestError('stopped', 'Scan stopped.');
        }
        ensureWithinRunTime();
        if (requestCount >= policy.maxRequests) {
            throw new RequestError('bounds', 'The scan reached its maximum request count.');
        }
    };

    const sleepWithinRun = async (ms: number) => {
        ensureWithinRunTime();
        const remaining = remainingRunMs();
        if (ms >= remaining) {
            await abortableSleep(remaining, options.signal);
            throw runTimeError();
        }
        await abortableSleep(ms, options.signal);
        ensureWithinRunTime();
    };

    const waitForResume = async () => {
        while (options.pauseRef.current) {
            ensureAvailable();
            await sleepWithinRun(100);
        }
        ensureAvailable();
    };

    const waitForGap = async () => {
        if (lastRequestAtRef.current === null) {
            return;
        }
        const spread = Math.max(0, policy.maxGapMs - policy.minGapMs);
        const requiredGap = policy.minGapMs + Math.floor(random() * (spread + 1));
        const remaining = lastRequestAtRef.current + requiredGap - now();
        if (remaining > 0) {
            await sleepWithinRun(remaining);
        }
    };

    const request = async <T>(url: string, label: string): Promise<T> => {
        if (active) {
            throw new RequestError('bounds', 'Concurrent Instagram requests are not allowed.');
        }
        active = true;

        try {
            for (let attempt = 1; attempt <= policy.maxAttempts; attempt++) {
                await waitForResume();
                await waitForGap();
                await waitForResume();

                ensureWithinRunTime();
                const remaining = remainingRunMs();
                const limitedByRunTime = remaining <= policy.requestTimeoutMs;
                const timeoutMs = Math.min(policy.requestTimeoutMs, remaining);
                const timeoutError = limitedByRunTime
                    ? runTimeError()
                    : new RequestError('timeout', 'Instagram did not respond before the request timeout.');

                requestCount++;
                lastRequestAtRef.current = now();

                try {
                    const { response, body } = await fetchWithTimeout(
                        url,
                        fetchImpl,
                        options.signal,
                        timeoutMs,
                        timeoutError,
                    );
                    ensureWithinRunTime();
                    let payload: unknown = null;
                    let parseError: unknown = null;
                    if (body.trim() !== '') {
                        try {
                            payload = JSON.parse(body);
                        } catch (error) {
                            parseError = error;
                        }
                    }

                    const responseError = classifyResponse(response, payload, policy, now());
                    if (responseError) {
                        throw responseError;
                    }
                    if (parseError !== null) {
                        throw new RequestError('invalid_response', 'Instagram returned a non-JSON response.', {
                            status: response.status,
                            originalError: parseError,
                        });
                    }
                    if (payload === null) {
                        throw new RequestError('invalid_response', 'Instagram returned an empty response.', {
                            status: response.status,
                        });
                    }
                    return payload as T;
                } catch (error) {
                    const requestError = isRequestError(error)
                        ? error
                        : new RequestError('network', 'The Instagram request failed.', { originalError: error });
                    const retryable = requestError.kind === 'network'
                        || (requestError.kind === 'http'
                            && requestError.status !== undefined
                            && TRANSIENT_STATUSES.has(requestError.status));

                    if (!retryable || attempt >= policy.maxAttempts) {
                        throw requestError;
                    }
                    ensureAvailable();

                    const retryDelay = requestError.retryAt === undefined
                        ? policy.retryDelayMs
                        : Math.max(0, requestError.retryAt - now());
                    options.onRetry?.({
                        label,
                        attempt: attempt + 1,
                        maxAttempts: policy.maxAttempts,
                        delayMs: retryDelay,
                    });
                    await sleepWithinRun(retryDelay);
                }
            }
            throw new RequestError('network', `${label} failed after retrying.`);
        } finally {
            active = false;
        }
    };

    return {
        ownerId: options.ownerId,
        policy,
        get requestCount() {
            return requestCount;
        },
        request,
    };
}

export function userMediaUrlGenerator(ownerId: string, nextMaxId?: string): string {
    const cursor = nextMaxId === undefined ? '' : `&max_id=${encodeURIComponent(nextMaxId)}`;
    return `https://www.instagram.com/api/v1/feed/user/${encodeURIComponent(ownerId)}/?count=${POSTS_PER_PAGE}${cursor}`;
}

export function postLikersUrlGenerator(mediaId: string): string {
    return `https://www.instagram.com/api/v1/media/${encodeURIComponent(mediaId)}/likers/`;
}

export function followingUrlGenerator(ownerId: string, nextMaxId?: string): string {
    const cursor = nextMaxId === undefined ? '' : `&max_id=${encodeURIComponent(nextMaxId)}`;
    return `https://www.instagram.com/api/v1/friendships/${encodeURIComponent(ownerId)}/following/?count=200${cursor}`;
}

export function followersUrlGenerator(ownerId: string, nextMaxId?: string): string {
    const cursor = nextMaxId === undefined ? '' : `&max_id=${encodeURIComponent(nextMaxId)}`;
    return `https://www.instagram.com/api/v1/friendships/${encodeURIComponent(ownerId)}/followers/?count=200${cursor}`;
}

function rankEntries(entries: readonly LeaderboardEntry[]): LeaderboardEntry[] {
    return entries.map((entry, index) => ({ ...entry, rank: index + 1 }));
}

export function buildLeaderboard(
    likerMap: Readonly<Record<string, LikerAccumulator>>,
    followingIds: ReadonlySet<string>,
    totalPosts: number,
    isFollowing: boolean,
    followingUsersData?: Readonly<Record<string, LikerUserNode>>,
): LeaderboardEntry[] {
    const entries: LeaderboardEntry[] = [];
    const addedIds = new Set<string>();

    for (const [id, accumulator] of Object.entries(likerMap)) {
        if (isFollowing !== followingIds.has(id)) {
            continue;
        }
        entries.push({
            user: accumulator.user,
            likesCount: accumulator.likesCount,
            totalPosts,
            percentage: totalPosts === 0 ? 0 : Math.round((accumulator.likesCount / totalPosts) * 1_000) / 10,
            rank: 0,
        });
        addedIds.add(id);
    }

    if (isFollowing && followingUsersData) {
        for (const [id, user] of Object.entries(followingUsersData)) {
            if (!addedIds.has(id)) {
                entries.push({ user, likesCount: 0, totalPosts, percentage: 0, rank: 0 });
            }
        }
    }

    entries.sort((a, b) => b.likesCount - a.likesCount);
    return rankEntries(entries);
}

export function sortLeaderboard(
    entries: readonly LeaderboardEntry[],
    sortBy: SortField,
    direction: 'asc' | 'desc',
): LeaderboardEntry[] {
    const sorted = [...entries];
    sorted.sort((a, b) => {
        let comparison = 0;
        switch (sortBy) {
            case 'likes':
                comparison = a.likesCount - b.likesCount;
                break;
            case 'percentage':
                comparison = a.percentage - b.percentage;
                break;
            case 'username':
                comparison = a.user.username.localeCompare(b.user.username);
                break;
            default:
                assertUnreachable(sortBy);
        }
        return direction === 'desc' ? -comparison : comparison;
    });
    return rankEntries(sorted);
}

export function filterLeaderboard(
    entries: readonly LeaderboardEntry[],
    searchTerm: string,
): readonly LeaderboardEntry[] {
    if (searchTerm === '') {
        return entries;
    }
    const term = searchTerm.toLowerCase();
    return entries.filter(entry =>
        entry.user.username.toLowerCase().includes(term)
        || entry.user.full_name.toLowerCase().includes(term));
}

export function getMaxPage(totalEntries: number): number {
    return Math.max(1, Math.ceil(totalEntries / LEADERBOARD_ENTRIES_PER_PAGE));
}

export function getEntriesForPage(
    entries: readonly LeaderboardEntry[],
    page: number,
): readonly LeaderboardEntry[] {
    const start = (page - 1) * LEADERBOARD_ENTRIES_PER_PAGE;
    return entries.slice(start, start + LEADERBOARD_ENTRIES_PER_PAGE);
}

function downloadBlob(content: string, mimeType: string, filename: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function csvQuote(value: string): string {
    const escaped = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
    return `"${escaped.replace(/"/g, '""')}"`;
}

export function exportAsCsv(entries: readonly LeaderboardEntry[], filename: string): void {
    const header = 'Rank,Username,Full Name,Identified Likes,Posts Scanned,Participation\n';
    const rows = entries.map(entry =>
        `${entry.rank},${csvQuote(entry.user.username)},${csvQuote(entry.user.full_name)},${entry.likesCount},${entry.totalPosts},${entry.percentage}%`,
    ).join('\n');
    downloadBlob(header + rows, 'text/csv', filename);
}

export function exportAsJson(entries: readonly LeaderboardEntry[], filename: string): void {
    const rows = entries.map(entry => ({
        rank: entry.rank,
        username: entry.user.username,
        fullName: entry.user.full_name,
        identifiedLikes: entry.likesCount,
        postsScanned: entry.totalPosts,
        participationPercent: entry.percentage,
    }));
    downloadBlob(JSON.stringify(rows, null, 2), 'application/json', filename);
}
