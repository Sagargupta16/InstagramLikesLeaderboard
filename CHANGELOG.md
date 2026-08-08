# Changelog

## [2.2.0] - 2026-08-08

### Added

- Reused compatible same-account scans completed within 24 hours before creating an Instagram requester or sending any request

### Changed

- Persisted explicit following and follower completeness scopes in runtime-validated local storage schema v3
- Qualified negative relationship categories when a relationship list is bounded so missing accounts are not presented as confirmed non-relationships

### Fixed

- Completed valid following and follower collection at the 40-page safety bound instead of aborting the entire scan

## [2.1.1] - 2026-08-08

### Fixed

- Completed valid post collection at the six-page safety bound as a labeled recent scope instead of aborting the entire scan

## [2.1.0] - 2026-08-08

### Added

- Sequential per-run request controller with abortable delays/fetches, strict response classification, request timeout, and hard request/time/page/post bounds
- Explicit Stop control, rate-limit retry lock, owner/scope result notice, and saved-data deletion
- Runtime-validated, owner-scoped local storage schema v2 with derived results rebuilt on load
- Focused mocked tests for request behavior, bounded scanning, storage validation, defaults, and deterministic bundle embedding
- Pull-request CI and automated GitHub Pages deployment using Node 24, script-disabled clean installs, least-privilege permissions, and immutable action SHAs
- Repository governance, dependency automation, badges, cross-links, and development guidance accumulated since 2.0.0

### Changed

- Fixed request pacing at randomized 2–3 second gaps across Stop/restart boundaries; removed user-editable timing controls and automatic recovery loops
- Limited transient failures to one retry and made auth, challenge, rate-limit, timeout, malformed-response, and bounds failures fatal
- Moved host and login guards ahead of style/app initialization so unsupported pages remain untouched
- Made scans all-or-nothing: required-request failures no longer display or save partial data
- Bounded post collection at 150 unique recent posts and deduplicated posts, cursors, per-post liker identities, and user lists
- Defaulted follower comparison off to avoid unnecessary follower-list requests
- Corrected dashboard totals to use displayed post-like counts while labeling leaderboard values as identified likes
- Reworked progress, responsive layout, accessibility targets, reduced motion, local search, export field names, and incomplete-data wording
- Replaced manual bundle escaping with marker validation, safe serialization, deterministic `--check` parity, and streamlined npm scripts
- Exact-pinned the current Preact, TypeScript, ESLint, Sass, Webpack, and test toolchain; enabled stricter index-access checks and related hygiene fixes
- Corrected Node/deployment documentation and the request cooldown cadence

### Removed

- Google Analytics, external web fonts, raw bundle preview, modal copy confirmation, and deprecated clipboard fallback from the landing page
- Babel tooling, obsolete timing/settings UI, dead wrapper/icon components, and unused helper styles
- Vulnerable transitive dependency versions; `npm audit` reports zero known vulnerabilities for this release

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
