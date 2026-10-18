'use strict';

// Writes the generated files GitHub Pages serves next to index.html:
//   public/demo.js                                   demo page bundle (mock data)
//   public/instagram-likes-leaderboard.user.js        userscript (unminified bundle + launcher)
//   public/instagram-likes-leaderboard.meta.js        userscript header for update checks
// They are build output (gitignored); the Pages workflow runs `npm run build` before upload.

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const PAGES_URL = 'https://sagargupta.online/InstagramLikesLeaderboard';
const USERSCRIPT_NAME = 'instagram-likes-leaderboard';

function userscriptHeader(version) {
    return [
        '// ==UserScript==',
        '// @name         Instagram Likes Leaderboard',
        '// @namespace    https://github.com/Sagargupta16/InstagramLikesLeaderboard',
        `// @version      ${version}`,
        '// @description  Rank who likes your recent Instagram posts, compare followers, and export CSV. Runs locally with fixed, sequential request pacing.',
        '// @author       Sagar Gupta',
        '// @license      MIT',
        '// @match        https://www.instagram.com/*',
        '// @grant        none',
        '// @inject-into  page',
        '// @run-at       document-idle',
        '// @noframes',
        '// @homepageURL  https://github.com/Sagargupta16/InstagramLikesLeaderboard',
        '// @supportURL   https://github.com/Sagargupta16/InstagramLikesLeaderboard/issues',
        `// @downloadURL  ${PAGES_URL}/${USERSCRIPT_NAME}.user.js`,
        `// @updateURL    ${PAGES_URL}/${USERSCRIPT_NAME}.meta.js`,
        '// ==/UserScript==',
        '',
    ].join('\n');
}

// The userscript never starts a scan by itself: it adds one launcher button, and the
// click runs the same guarded bootstrap the console paste runs.
function userscriptBody(bundle) {
    return `
(function () {
    'use strict';

    function runLeaderboard() {
${bundle.trimEnd()}
    }

    function addLauncher() {
        if (!document.body || document.getElementById('ill-userscript-launcher')) {
            return;
        }
        const button = document.createElement('button');
        button.id = 'ill-userscript-launcher';
        button.type = 'button';
        button.textContent = 'Likes Leaderboard';
        button.title = 'Open Instagram Likes Leaderboard. Run it from your own profile page.';
        button.style.cssText = [
            'position:fixed',
            'right:16px',
            'bottom:72px',
            'z-index:2147483646',
            'min-height:44px',
            'padding:0 16px',
            'border:1px solid #5eead4',
            'border-radius:999px',
            'background:#111113',
            'color:#5eead4',
            'font:600 14px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif',
            'cursor:pointer',
            'box-shadow:0 4px 16px rgba(0,0,0,0.35)',
        ].join(';');
        button.addEventListener('click', runLeaderboard);
        document.body.appendChild(button);
    }

    addLauncher();
})();
`;
}

function readText(relativePath) {
    const text = fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
    if (text.trim() === '') {
        throw new Error(`${relativePath} is empty. Run \`npm run build:bundle\` first.`);
    }
    return text;
}

function main() {
    const { version } = JSON.parse(readText('package.json'));
    const demoBundle = readText('dist/demo.js');
    const userscriptBundle = readText('dist/userscript.js');
    const header = userscriptHeader(version);

    fs.writeFileSync(path.join(ROOT, 'public/demo.js'), demoBundle, 'utf8');
    fs.writeFileSync(path.join(ROOT, `public/${USERSCRIPT_NAME}.user.js`), header + userscriptBody(userscriptBundle), 'utf8');
    fs.writeFileSync(path.join(ROOT, `public/${USERSCRIPT_NAME}.meta.js`), header, 'utf8');
    console.log(`Wrote public/demo.js and the ${version} userscript.`);
}

if (require.main === module) {
    try {
        main();
    } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
    }
}

module.exports = { userscriptBody, userscriptHeader };
