export const INSTAGRAM_HOSTNAME = 'www.instagram.com';
export const LEADERBOARD_ENTRIES_PER_PAGE = 50;

// Instagram Web App ID required by the private web endpoints used by this tool.
export const IG_APP_ID = '936619743392459';
export const POSTS_PER_PAGE = 33;

export interface RequestPolicy {
    readonly minGapMs: number;
    readonly maxGapMs: number;
    readonly requestTimeoutMs: number;
    readonly maxAttempts: number;
    readonly retryDelayMs: number;
    readonly maxTransientRetryAfterMs: number;
    readonly rateLimitFallbackMs: number;
    readonly maxRequests: number;
    readonly maxScanMs: number;
    readonly maxPosts: number;
}

// Fixed conservative limits. They reduce request pressure, but cannot prevent
// Instagram throttling, checkpoints, temporary restrictions, or enforcement.
export const REQUEST_POLICY: Readonly<RequestPolicy> = {
    minGapMs: 2_000,
    maxGapMs: 3_000,
    requestTimeoutMs: 20_000,
    maxAttempts: 2,
    retryDelayMs: 5_000,
    maxTransientRetryAfterMs: 60_000,
    rateLimitFallbackMs: 15 * 60_000,
    maxRequests: 250,
    maxScanMs: 15 * 60_000,
    maxPosts: 150,
};

export const LOCAL_STORAGE_KEY = 'ill_scan_results';
export const SAVED_SCAN_CACHE_TTL_MS = 24 * 60 * 60 * 1_000;
export const CAPTION_PREVIEW_LENGTH = 150;
