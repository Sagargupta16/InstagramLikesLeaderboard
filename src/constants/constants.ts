export const INSTAGRAM_HOSTNAME = 'www.instagram.com';
export const LEADERBOARD_ENTRIES_PER_PAGE = 50;
export const MAX_RETRIES = 5;

// Instagram Web App ID (required header for v1 API)
export const IG_APP_ID = '936619743392459';

// Posts per page (Instagram allows up to ~50, 33 balances speed vs safety)
export const POSTS_PER_PAGE = 33;

// Timing defaults (ms)
export const DEFAULT_TIME_BETWEEN_POST_FETCHES = 1000;
export const DEFAULT_TIME_TO_WAIT_AFTER_SIX_POST_FETCHES = 10000;
export const DEFAULT_TIME_BETWEEN_LIKER_FETCHES = 1000;
export const DEFAULT_TIME_TO_WAIT_AFTER_FIVE_LIKER_FETCHES = 8000;
export const DEFAULT_TIME_BETWEEN_FOLLOWING_FETCHES = 1000;
export const DEFAULT_TIME_TO_WAIT_AFTER_SIX_FOLLOWING_FETCHES = 10000;
export const DEFAULT_TIME_BETWEEN_FOLLOWER_FETCHES = 1000;
export const DEFAULT_TIME_TO_WAIT_AFTER_SIX_FOLLOWER_FETCHES = 10000;

// Rate limiting
export const RATE_LIMIT_COOLDOWN_MS = 60000;  // 60s pause on 429
export const GLOBAL_COOLDOWN_THRESHOLD = 65;   // inject cooldown after this many requests
export const GLOBAL_COOLDOWN_MS = 30000;       // 30s global cooldown
export const PHASE_WARMUP_MS = 2500;           // delay before first request of each phase

export const LOCAL_STORAGE_KEY = 'ill_scan_results';
