# Instagram Likes Leaderboard

A browser-based tool that shows you who likes your Instagram posts the most.
See ranked leaderboards of your biggest fans — both people you follow and people you don't.
<u>No downloads or installations required!</u>

## WARNING

This tool utilizes Instagram's internal GraphQL API. Excessive use may result in temporary rate limits on your account.
The scan duration scales with the number of posts and likers on your account.

## Desktop Usage

1. Go to the tool page and click the **COPY** button to copy the code

2. Go to Instagram website and log in to your account

3. Open the developer console:
   - Windows: `Ctrl + Shift + J`
   - Mac OS: `Cmd + Option + I`

4. Paste the code and press Enter. You'll see this interface with a **RUN** button

5. Click **RUN** to start scanning. The scan has three phases:
   - **Phase 1 — Posts**: Fetches all your posts
   - **Phase 2 — Likes**: For each post, fetches all likers (this is the longest phase)
   - **Phase 3 — Following**: Fetches your following list to categorize likers

6. After scanning completes, you'll see the **Leaderboard** with two tabs:
   - **Following**: People you follow, ranked by how many of your posts they liked
   - **Not Following**: People you don't follow who like your posts

7. Each entry shows:
   - Rank (trophy icons for top 3)
   - Avatar and username (clickable link to their profile)
   - Visual bar showing likes out of total posts (e.g., 45/120)
   - Percentage of your posts they liked

8. Use the sidebar to:
   - Sort by like count, percentage, or username
   - Toggle ascending/descending order
   - Navigate pages
   - Export results as CSV or JSON

9. Use the search bar to filter by username or full name

10. Customize scan timings via the **Settings** gear icon (available before starting a scan)

## Mobile Usage

For Android users who want to use it on mobile:

1. Download the latest version of [Eruda Android Browser](https://github.com/liriliri/eruda-android/releases/)
2. Open Instagram web through the Eruda browser
3. Follow the same steps as desktop (the console will be automatically available when clicking the eruda icon)

## Performance Notes

- Scan duration depends on your number of posts and the number of likers per post
- An account with ~50 posts scans reasonably fast
- An account with 200+ posts will require patience — the tool sleeps between requests to avoid rate limits
- Script works on both Chromium and Firefox-based browsers
- You can **pause and resume** the scan at any time
- All processing happens in your browser — no data is sent anywhere

## Features

- Scan all your posts and aggregate likes per user
- Two ranked leaderboard tables: Following and Not Following
- Trophy icons for top 3 ranks (gold, silver, bronze)
- Visual percentage bars showing like ratio
- Sort by like count, percentage, or username
- Search/filter leaderboard entries in real-time
- Export leaderboard as CSV or JSON
- Configurable rate-limiting timings (6 parameters)
- Pause/Resume scanning at any phase
- Three-phase progress display with percentage
- Clean, dark minimalist interface
- Fully responsive — works on desktop and mobile
- All data processed locally — no external servers

## Development

- Node version: 16.14.0 (If using nvm, run `nvm use`)
- Install dependencies: `npm install`
- Development build with watch: `npm run build-dev`
- Production build: `npm run build`
- After modifying source files, run `npm run build` to compile, bundle, and embed the script into `public/index.html`

## How It Works

1. The tool runs as a single JavaScript snippet in Instagram's browser console
2. It uses Instagram's internal GraphQL endpoints (authenticated via your session cookies)
3. **Phase 1** paginates through `edge_owner_to_timeline_media` to collect all your posts
4. **Phase 2** for each post, paginates through `edge_liked_by` to collect all likers, aggregating counts per user
5. **Phase 3** paginates through `edge_follow` to build your following list
6. Results are split into two leaderboards based on whether each liker is in your following list
7. The entire app is built with Preact + TypeScript, compiled into a single ~71KB bundle

## Legal & License

**Disclaimer:** This tool is not affiliated, associated, authorized, endorsed by, or officially connected with Instagram.

Use at your own risk!

Licensed under the [MIT License](LICENSE)
- Free to use, copy, and modify
- Open source and community-friendly
- See [LICENSE](LICENSE) file for full terms
