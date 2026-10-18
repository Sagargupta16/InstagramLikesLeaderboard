'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { userscriptBody, userscriptHeader } = require('../scripts/build-pages-extras');

test('userscript header is a well-formed metadata block for this version', () => {
    const header = userscriptHeader('9.8.7');
    const lines = header.trimEnd().split('\n');
    assert.equal(lines[0], '// ==UserScript==');
    assert.equal(lines.at(-1), '// ==/UserScript==');
    assert.ok(lines.every(line => line.startsWith('// ')));
    assert.match(header, /^\/\/ @version {6}9\.8\.7$/m);
    assert.match(header, /^\/\/ @match {8}https:\/\/www\.instagram\.com\/\*$/m);
    assert.match(header, /^\/\/ @grant {8}none$/m);
});

test('userscript body only adds a launcher and runs the bundle on click', () => {
    const body = userscriptBody('globalThis.__illRan = (globalThis.__illRan || 0) + 1;\n');
    const listeners = [];
    const appended = [];
    const button = {
        style: {},
        addEventListener: (type, listener) => listeners.push({ type, listener }),
    };
    const fakeDocument = {
        body: { appendChild: node => appended.push(node) },
        getElementById: () => null,
        createElement: () => button,
    };

    globalThis.__illRan = 0;
    new Function('document', body)(fakeDocument);
    assert.equal(globalThis.__illRan, 0);
    assert.deepEqual(appended, [button]);
    assert.equal(button.textContent, 'Likes Leaderboard');

    const click = listeners.find(item => item.type === 'click');
    click.listener();
    assert.equal(globalThis.__illRan, 1);
    delete globalThis.__illRan;
});
