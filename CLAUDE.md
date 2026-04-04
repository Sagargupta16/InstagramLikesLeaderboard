# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A browser-based Instagram analyzer that scans your posts and provides three views: a likes leaderboard, follower analysis (who doesn't follow back, ghost followers, mutuals), and a stats dashboard. Users copy-paste a single JS snippet into their browser console on instagram.com. The snippet replaces the Instagram UI with a Preact app that calls Instagram's v1 REST API, collects data, and displays results. Results are cached in localStorage for instant reload.

## Commands

- **Install:** `npm install`
- **Dev build + serve:** `npm run build-dev` (webpack build then dev server)
- **Production build:** `npm run build` (webpack build + embed bundle into `public/index.html`)
- **Webpack only:** `npm run webpack-build`
- **Lint:** `npm run lint` (strict rules in `.eslintrc.json`)

There are no tests.

## Build Pipeline

Webpack compiles `src/main.tsx` into `dist/dist.js` (single minified bundle). Then `scripts/update-index.js` reads the bundle, escapes it, and injects it into `public/index.html` as a string constant (`instagramScript`). The landing page shows a "Copy Code" button that copies this embedded script to the clipboard. GitHub Actions deploys `public/` to GitHub Pages on push to `master`.

## Architecture

**Single-page Preact app** using React compatibility aliases (webpack + tsconfig both alias `react` to `preact/compat`). Written in TypeScript with SCSS styles. Target is ES5 (tsconfig) - avoid Set/Map spread operators, use `Array.from()` instead.

### State Machine

The app has three states defined as a discriminated union in `src/model/state.ts`:
- `initial` - mode selector screen with checkboxes (Leaderboard, Dashboard, Follower Analysis) + load previous results option
- `scanning` - four sequential phases (fetching_posts, fetching_likes, fetching_following, fetching_followers)
- `results` - three switchable views via `ResultsNav`: Dashboard, Leaderboard, Follower Analysis

### Result Views

- **Dashboard** (`src/components/Dashboard.tsx`) - stat cards (posts, likes, engagement rate, etc.), top 5 fans, most liked post
- **Leaderboard** (`src/components/Leaderboard.tsx`) - ranked list with Following/Not Following tabs, verified account filter toggle, per-user hide button
- **Follower Analysis** (`src/components/FollowerAnalysis.tsx`) - four tabs: Don't Follow Back, Not Following Back, Mutual, Ghost Followers

### Scanning Pipeline

Scanning phases are extracted into `src/utils/scanner.ts` as standalone async functions:
- `fetchAllPosts()` - Phase 1
- `fetchAllLikers()` - Phase 2
- `fetchFollowing()` - Phase 3
- `fetchFollowers()` - Phase 4 (only if Follower Analysis mode selected)

`main.tsx` orchestrates these phases via a `useEffect` and manages state updates through callbacks.

### Instagram API

Uses v1 REST endpoints (not GraphQL):
- `/api/v1/feed/user/{id}/` - user's posts (paginated via `next_max_id`)
- `/api/v1/media/{id}/likers/` - likers for a single post
- `/api/v1/friendships/{id}/following/` - following list (paginated)
- `/api/v1/friendships/{id}/followers/` - followers list (paginated)

All requests go through `igFetch()` in `src/utils/utils.ts` which attaches the `x-ig-app-id`, CSRF token, and credentials headers.

### localStorage Persistence

`src/utils/storage.ts` handles saving/loading scan results under the `ill_scan_results` key. On load, if previous results exist, the mode selector shows a "Load previous results" button that skips directly to the results view.

### Key Files

- `src/main.tsx` - app entry, state management, scan orchestration
- `src/utils/scanner.ts` - scanning phase functions (posts, likers, following, followers)
- `src/utils/utils.ts` - API helpers, data aggregation, sort/filter/pagination, CSV/JSON export
- `src/utils/storage.ts` - localStorage persistence for scan results
- `src/constants/constants.ts` - timing defaults, retry limits, IG app ID
- `src/model/` - TypeScript types (State, ScanModes, ResultsView, FollowerTab, etc.)
- `src/components/` - UI components (ModeSelector, Dashboard, Leaderboard, FollowerAnalysis, ResultsNav, Scanning, Toolbar, SettingMenu, Toast)
- `scripts/update-index.js` - post-build script that embeds the bundle into the landing page

## Style Rules

- Single quotes, semicolons required, trailing commas on multiline
- `readonly` on interface fields and function params where possible
- Preact functional components with hooks only
- SCSS with BEM-like class naming under `.ill` namespace
- Node 24 (`.nvmrc`)

## Deployment

GitHub Pages via GitHub Actions (`main` branch trigger). The workflow installs deps, runs `npm run build`, then deploys the `public/` directory.
