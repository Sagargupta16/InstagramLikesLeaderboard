# Changelog

## [2.0.0] - 2026-04-04

### Added

- **Multi-mode scan selection** - choose which analyses to run before scanning (Leaderboard, Dashboard, Follower Analysis)
- **Stats Dashboard** - engagement metrics, average likes per post, engagement rate, top 5 fans, most liked post
- **Follower Analysis** - four tabs: Don't Follow Back, Not Following Back, Mutual, Ghost Followers
- **localStorage persistence** - scan results saved automatically, load previous results without re-scanning
- **Verified account filter** - toggle to hide verified/creator accounts from leaderboard
- **Per-user hide button** - remove individual users from leaderboard view
- **Followers API** - new Phase 4 fetches followers list (`/api/v1/friendships/{id}/followers/`)
- Follower timing settings in Settings menu

### Changed

- Scanning logic extracted from main.tsx into `src/utils/scanner.ts` for maintainability
- Initial screen replaced bare RUN button with mode selector UI
- Results screen now has top-level view switcher (Dashboard / Leaderboard / Follower Analysis)
- Scanning phase indicator supports 4 phases when Follower Analysis is enabled
- Bundle size increased from ~72KB to ~98KB

## [1.2.0] - 2026-03-06

- Merge Renovate dependency updates
- Migrate domain references to sagargupta.online

## [1.1.0] - 2026-02-27

- Add favicon, README badges, and screenshots
- Rewrite README for non-technical users
- Show 0-likes users in Following leaderboard

## [1.0.0] - 2026-02-27

- Initial release: browser bookmarklet for Instagram likes analysis
- Preact + TypeScript + Webpack, minified to ~72KB
- Three-phase scan: posts, likers, following list
- Ranked leaderboards with sort/search/export (CSV/JSON)
- Rate limiting, pause/resume support
