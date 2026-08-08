# Instagram Likes Leaderboard

![Version](https://img.shields.io/badge/version-2.2.1-5eead4?style=flat-square)
![GitHub stars](https://img.shields.io/github/stars/Sagargupta16/InstagramLikesLeaderboard?style=flat-square&cacheSeconds=86400)
![GitHub forks](https://img.shields.io/github/forks/Sagargupta16/InstagramLikesLeaderboard?style=flat-square&cacheSeconds=86400)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![GitHub Pages](https://img.shields.io/badge/demo-live-00ffff?logo=github)](https://sagargupta.online/InstagramLikesLeaderboard/)

A browser-console tool that builds a leaderboard from the liker identities Instagram returns for your recent posts. It can also show displayed post-like totals and optionally compare follower/following lists.

> [!WARNING]
> This project uses Instagram's private web endpoints. Fixed conservative pacing reduces request pressure, but no delay or implementation can guarantee avoiding throttling, checkpoints, temporary restrictions, or enforcement. Use it at your own risk.

## Use

1. Open the [tool page](https://sagargupta.online/InstagramLikesLeaderboard/) and select **Copy Code**.
2. Sign in at [instagram.com](https://www.instagram.com/).
3. Open the browser developer console:
   - Windows/Linux: `Ctrl + Shift + J`
   - macOS: `Cmd + Option + J`
4. Paste the copied code and press Enter.
5. Choose the optional views you need, then select **Start scan**.
6. Keep the tab open until the scan completes. Use **Pause** to prevent the next request or **Stop** to abort the run.

Follower comparison is off by default because it adds requests for your followers list. A scan always reads posts, returned liker identities, and the following list so it can separate people you follow from people you do not. A compatible endpoint-complete or genuine 150-post-limited scan for the same account is reused for 24 hours without contacting Instagram; delete the saved copy to refresh sooner.

## Understand the Results

Instagram's endpoints do not provide one complete, documented dataset. The UI and exports distinguish these values:

- **Displayed post likes:** the like count attached to each returned post. Dashboard totals and averages use these counts.
- **Identified likes:** liker identities returned by the per-post liker endpoint. Leaderboard counts and participation percentages use these identities.
- **No identified likes:** no identity was returned for that account in the scanned posts; this does not prove that the account never liked a post.
- **Recent-post limit:** post pages follow Instagram's continuation cursors until the endpoint finishes or 150 unique posts are collected. Results state when the 150-post bound was reached.
- **Relationship scope:** following and optional follower pages follow Instagram's continuation cursors until each endpoint finishes, subject to the global request/time safety bounds.

The liker endpoint is not paginated by this tool because its continuation behavior is undocumented and additional calls increase account risk. Consequently, identified-like totals can be lower than displayed post-like totals.

## Request Safety and Bounds

Every run uses one sequential requester. Users cannot lower its timing:

| Control | Behavior |
|---|---|
| Request gap | Random 2–3 seconds between request starts |
| Request timeout | 20 seconds, then the run stops |
| Transient retry | One retry for network errors and HTTP 408/500/502/503/504 |
| Retry delay | 5 seconds, or a server delay capped at 60 seconds |
| Auth/challenge/rate limit | No retry; the run stops immediately |
| Maximum run | 250 requests or 15 minutes |
| Post scope | Cursor-to-terminal traversal, capped at 150 unique posts |
| Follower/following scope | Cursor-to-terminal traversal within the global run bounds |

Reaching 150 posts completes with a clearly labeled recent scope. Relationship collection completes only when Instagram stops returning a continuation cursor. A repeated/malformed cursor, unexpected response, missing login, timeout, Stop action, or exhausted request/time bound ends the entire run. Failed scans are never shown or saved. A 429/feedback response locks new Instagram requests until the provided or conservative fallback retry time; a compatible cached scan can still load.

## Privacy and Saved Data

- The landing page loads no analytics, external fonts, or other third-party scripts.
- The injected app sends requests directly from your browser to Instagram using your existing session. There is no project-operated API or data-collection server.
- Credentials and session cookies are not copied into saved results.
- A completed scan is saved under `ill_scan_results` in Instagram's local storage.
- Schema-v3 saved data is validated at runtime and scoped to the captured Instagram account ID. Data from another account or an older schema is not loaded.
- Selecting Start reuses a compatible snapshot completed less than 24 hours ago before any requester is created. Automatic reuse requires endpoint-complete relationship lists and either endpoint-complete posts or a genuine 150-post scope; follower comparison also requires endpoint-complete follower data.
- The 24-hour limit applies to automatic reuse. **Load saved scan** can still open an older valid snapshot.
- Opaque relationship cursors are never persisted, resumed, or merged. After cache expiry, a fresh endpoint traversal atomically replaces the snapshot only after every enabled phase succeeds.
- Use **Delete saved copy** to remove the local result or force an earlier refresh. Clearing Instagram site data also removes it.

## Views

- **Leaderboard:** returned liker identities split into accounts positively matched in the returned following pages and accounts without a match, with local search, filters, sort, pagination, and CSV/JSON exports. A complete following list retains the usual follow/non-follow labels.
- **Dashboard:** posts scanned, displayed post likes, average displayed likes, identified likers, highest displayed like count, and top identified likers you follow.
- **Follower comparison (optional):** accounts that do not follow you back, accounts you do not follow back, mutuals, and followers with no identified likes in the scanned scope. Manually loaded legacy page-limited snapshots retain qualified unmatched labels; they are not reused automatically.

## Development

Requirements: Node 24 (`.nvmrc`) and npm/package-lock.

```bash
npm ci
npm run check
npm run build
```

| Command | Purpose |
|---|---|
| `npm run dev` | Build/embed once, then start Webpack's development server |
| `npm run build:bundle` | Produce `dist/dist.js` |
| `npm run embed` | Embed the bundle into `public/index.html` |
| `npm run build` | Production bundle plus embedding |
| `npm run check:generated` | Fail if the embedded bundle is stale |
| `npm run lint` | Lint TypeScript/TSX source and typed tests |
| `npm run typecheck` | Type-check source and typed tests without emitting |
| `npm test` | Run Node tests through `tsx` |
| `npm run check` | Run lint, typecheck, tests, and generated-file parity |

The app remains a single Preact/TypeScript/Webpack bundle. Tests use mocked transports and in-memory storage; they do not issue live Instagram requests. Pull requests run CI, while pushes to `main` build and deploy `public/` to GitHub Pages.

## Legal

This project is not affiliated with, endorsed by, or officially connected to Instagram or Meta. Instagram can change or remove the private endpoints at any time.

Licensed under the [MIT License](LICENSE).
