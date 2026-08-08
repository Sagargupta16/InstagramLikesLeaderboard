# CLAUDE.md

> This file stacks on top of the workspace root at `C:\Code\GitHub\`:
> - Root [`CLAUDE.md`](../../CLAUDE.md) -- voice, rules, routing map, references, skills, slash commands, conventions.
> - Root [`MEMORY.md`](../../MEMORY.md) -- live facts across repos.
> - Root [`STATUS.md`](../../STATUS.md) -- live PR/CI/security dashboard.
>
> Read those first. This file adds repository-specific context only.

## What This Is

Instagram Likes Leaderboard 2.1.0 is a browser-console Preact application. Users copy one generated bundle into the console on `www.instagram.com`; it replaces the page with a local UI and calls Instagram's private v1 web endpoints using the existing browser session. There is no backend.

Preserve the Preact/TypeScript/Webpack/SCSS architecture, npm/package-lock, ES2020 target, and single embedded production bundle. Do not add live Instagram calls to tests or CI.

## Commands

- Install exactly: `npm ci`
- Develop: `npm run dev`
- Build bundle: `npm run build:bundle`
- Embed existing bundle: `npm run embed`
- Production build: `npm run build`
- Lint: `npm run lint`
- Typecheck: `npm run typecheck`
- Test: `npm test`
- Full check: `npm run check`
- Generated parity: `npm run check:generated`
- Audit: `npm audit --audit-level=high`

Use Node 24 from `.nvmrc`.

## Request Contract

`createIgRequester()` in `src/utils/utils.ts` owns all Instagram traffic for one run. Requests must stay sequential. Fixed policy in `src/constants/constants.ts` enforces 2–3 second gaps, 20-second request timeout, one transient retry, 250 requests, 15 minutes, 150 posts, 6 post pages, and 40 pages per user list.

Never retry auth, challenge/checkpoint, rate-limit/feedback, timeout, Stop, bounds, or invalid-response errors. Only network errors and HTTP 408/500/502/503/504 receive one retry. Keep the pause gate immediately before every fetch/retry. Stop must abort delays and in-flight fetches.

No implementation can guarantee avoiding Instagram throttling or account enforcement. Do not add safety guarantees to UI or documentation.

## Scan and Data Contract

`src/utils/scanner.ts` performs posts, likers, following, and optional followers in order. Every required request must succeed; do not catch errors to continue with partial data. Keep cursor/page/post bounds and ID deduplication. Do not add liker pagination without documented, reviewed endpoint behavior.

Displayed post-like totals come from post records. Leaderboard counts use only identities returned by the liker endpoint and can be incomplete.

`src/utils/storage.ts` stores canonical schema-v2 inputs only after a complete scan. Runtime validation and owner-ID matching are mandatory. Derived leaderboards and aggregates are recomputed on load. Do not add a migration framework unless explicitly requested.

## Build Contract

Webpack emits `dist/dist.js`. `scripts/update-index.js` serializes it between the single `/*__ILL_BUNDLE_START__*/` and `/*__ILL_BUNDLE_END__*/` markers in `public/index.html`. `--check` must remain non-mutating and fail on stale content or invalid markers.

The landing page must not add analytics, external fonts, raw bundle previews, or unchecked clipboard fallbacks.

## Architecture

- `src/bootstrap.ts` -- guarded bundle entry; validates host/login before loading styles or app code
- `src/main.tsx` -- app mounting, per-run orchestration, AbortController lifecycle, state transitions, derived results
- `src/utils/utils.ts` -- requester, errors, URLs, aggregation, sorting, exports
- `src/utils/scanner.ts` -- bounded scan phases and response validation
- `src/utils/storage.ts` -- owner-scoped schema-v2 persistence
- `src/constants/constants.ts` -- fixed request policy and shared constants
- `src/components/` -- functional Preact components
- `src/styles/main.scss` -- styles scoped beneath `.ill`
- `test/` -- mocked requester/scanner/storage/embed tests

Use single quotes, semicolons, trailing commas on multiline structures, functional components/hooks, and readonly interface fields. Keep changes surgical and prefer removing obsolete paths over adding abstractions.
