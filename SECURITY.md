# Security Policy

## Reporting a Vulnerability

Use [GitHub's private vulnerability reporting form](https://github.com/Sagargupta16/InstagramLikesLeaderboard/security/advisories/new) or email `sg85207@gmail.com`. Do not include account cookies, API responses, or other personal data in a public issue.

## Data Boundaries

The landing page and injected application have no project-operated backend. The application:

- Uses the signed-in browser's Instagram cookies to make requests directly to Instagram
- Does not read, copy, or persist session cookies as result data
- Stores only a completed schema-v3 scan in Instagram's local storage
- Validates saved data at runtime and loads it only for the captured Instagram account ID
- Reuses a compatible snapshot for up to 24 hours before creating a requester, so cached loads send no Instagram traffic
- Never persists or resumes opaque pagination cursors; expired caches are replaced only after a new complete or bounded scan
- Provides a control to delete the saved local copy
- Loads no analytics, external fonts, or third-party scripts from the landing page

The generated bundle is embedded in `public/index.html` and can be audited against `src/`. `npm run check:generated` verifies that the embedded bundle matches a fresh production build.

## Account-Safety Boundaries

This project uses private, undocumented Instagram web endpoints. No implementation or delay can guarantee avoiding throttling, checkpoints, temporary restrictions, or enforcement.

Version 2.2.0 uses one sequential requester with fixed 2–3 second gaps, a 20-second timeout, a 250-request/15-minute run limit, a 150-post limit, and bounded pagination. It retries only a network failure or HTTP 408/500/502/503/504, at most once. It does not retry authentication failures, challenge/checkpoint responses, rate limits, timeouts, malformed responses, or user cancellation.

Reaching a configured post or relationship-list collection bound produces a labeled limited scope and still requires every later request to succeed. Malformed or repeated cursors and any required-request failure stop the run; failed scans are not displayed or persisted. Stop aborts delay and in-flight work; Pause only prevents the next request.

## Dependency and CI Policy

Dependencies are exact-pinned in `package.json` and locked by `package-lock.json`. CI uses `npm ci --ignore-scripts`, runs the full check suite, audits high-severity dependencies, and pins third-party GitHub Actions by immutable commit SHA.

## Supported Versions

Only the latest release on `main` is supported. Security fixes are not backported.
