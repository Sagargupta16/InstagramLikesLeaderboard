# Instagram Likes Leaderboard

Find out who likes your Instagram posts the most!

This tool scans your posts and shows you a **ranked leaderboard** of your biggest fans — people you follow AND people you don't follow — sorted by how many of your posts they've liked.

**No downloads, no installations, no sign-ups.** Just copy-paste one line into your browser and go.

---

## How to Use (Step by Step)

### On Desktop (Chrome, Edge, Firefox)

1. **Open the tool page:** [https://sagargupta.live/InstagramLikesLeaderboard/](https://sagargupta.live/InstagramLikesLeaderboard/)

2. **Click the big "Copy Code" button** — this copies the script to your clipboard

3. **Go to Instagram** — open [instagram.com](https://www.instagram.com) and make sure you're logged in

4. **Open the browser console** — this is a hidden text box in your browser:
   - **Windows/Linux:** Press `Ctrl + Shift + J` (or `F12` then click "Console" tab)
   - **Mac:** Press `Cmd + Option + J`
   - You'll see a text area at the bottom of your screen — that's the console

5. **Paste the code** — click inside the console, press `Ctrl + V` (or `Cmd + V` on Mac), then press **Enter**

6. **Click RUN** — Instagram will be replaced by the Likes Leaderboard interface with a big circular RUN button. Click it!

7. **Wait for the scan** — the tool scans in 3 steps:
   - Step 1: Collects all your posts
   - Step 2: Checks who liked each post (this is the longest step)
   - Step 3: Gets your following list

   You'll see a progress bar and percentage for each step. You can **pause** anytime.

8. **View your results!** Two tabs will appear:
   - **Following** — people you follow, ranked by likes (includes people with 0 likes at the bottom)
   - **Not Following** — people you DON'T follow who liked your posts

### On Android Mobile

1. Download [Eruda Browser](https://github.com/liriliri/eruda-android/releases/) (free, lightweight browser with a built-in console)
2. Open instagram.com in Eruda Browser
3. Tap the Eruda floating icon to open the console
4. Follow the same steps as desktop (copy code from the tool page, paste in console, press Enter)

### On iPhone

Use Safari on your Mac to remotely debug Safari on your iPhone, or use a browser app that supports developer console (like Web Inspector on iOS).

---

## What You'll See

Each person in the leaderboard shows:
- **Rank** — #1, #2, #3 get trophy icons (gold, silver, bronze)
- **Profile picture and username** — click to visit their profile
- **Like bar** — visual bar showing how many of your posts they liked (e.g., 45/80)
- **Percentage** — what percent of your posts they liked (e.g., 56.3%)

### Sidebar Options
- **Sort** by like count, percentage, or username
- **Search** by name or username
- **Export** your data as a spreadsheet (CSV) or data file (JSON)
- **Pages** — navigate through results (50 per page)

### Settings (Gear Icon)
Before running a scan, click the gear icon to adjust timing settings. The default settings are safe for most accounts. Only change these if you know what you're doing — lowering the delays too much can cause Instagram to temporarily restrict your account.

---

## Important Notes

- **Your data stays private** — everything runs in YOUR browser. Nothing is sent to any server. No one can see your results.
- **Safe to use** — the tool only reads data (who liked your posts). It does NOT like, unlike, follow, unfollow, or modify anything on your account.
- **Be patient with large accounts** — if you have hundreds of posts, the scan will take a while because the tool intentionally pauses between requests to avoid Instagram rate limits.
- **You can pause and resume** at any time during the scan.
- **Works on Chrome, Edge, Firefox, and Brave** on desktop.

---

## FAQ

**Q: Is this safe? Will my account get banned?**
A: The tool uses the same requests your browser makes when you browse Instagram normally. It just automates the process. With the default timing settings, the risk is minimal. However, like any automation tool, use it at your own discretion.

**Q: Why does it take so long?**
A: The tool deliberately waits between requests to avoid triggering Instagram's rate limits. This protects your account. The more posts you have, the longer Phase 2 takes.

**Q: Why are some people showing 0 likes?**
A: The "Following" tab shows everyone you follow, including those who never liked any of your posts. This helps you see who doesn't engage with your content.

**Q: Can others see that I used this tool?**
A: No. The tool runs entirely in your browser. Instagram doesn't notify anyone.

**Q: Do I need to install anything?**
A: No. Just copy-paste the code into your browser console. No extensions, no downloads.

---

## Features

- Scan all your posts and see who liked them the most
- Two leaderboards: Following and Not Following
- Trophy icons for top 3 (gold, silver, bronze)
- Visual like-percentage bars
- Sort by likes, percentage, or username
- Search and filter results
- Export as CSV (spreadsheet) or JSON (data file)
- Adjustable scan speed settings
- Pause and resume scanning
- Progress display with percentage for each phase
- Dark theme interface
- Works on desktop and mobile
- 100% private — no data leaves your browser

---

## For Developers

- **Tech stack:** Preact + TypeScript + Webpack 5 + SCSS
- **Node version:** 16.14.0 (use `nvm use` if you have nvm)
- **Install:** `npm install`
- **Dev build:** `npm run build-dev`
- **Production build:** `npm run build`
- **API:** Uses Instagram's v1 REST API (`/api/v1/feed/user/`, `/api/v1/media/{id}/likers/`, `/api/v1/friendships/{id}/following/`)
- **Output:** Single minified JS bundle (~72KB) embedded in `public/index.html`
- **Deployment:** Auto-deploys to GitHub Pages on push to `master`

---

## Legal

**Disclaimer:** This tool is not affiliated with, endorsed by, or officially connected to Instagram or Meta.

Use at your own risk.

Licensed under the [MIT License](LICENSE) — free to use, copy, and modify.
