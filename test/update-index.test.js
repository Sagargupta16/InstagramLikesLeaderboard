'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');
const {
    BUNDLE_END,
    BUNDLE_START,
    embedBundle,
    serializeBundle,
} = require('../scripts/update-index');

const template = `<script>const bundle = ${BUNDLE_START}"old"${BUNDLE_END};</script>`;

test('embedder replaces only the marked range deterministically', () => {
    const bundle = 'console.log("test");\n';
    const first = embedBundle(template, bundle);
    const second = embedBundle(first, bundle);

    assert.equal(first, second);
    assert.match(first, /console\.log/);
    assert.equal(first.includes('"old"'), false);
});

test('serializer prevents closing the containing script element', () => {
    const serialized = serializeBundle('</script>\u2028&');
    assert.equal(serialized.includes('</script>'), false);
    assert.match(serialized, /\\u003c\/script\\u003e/);
    assert.match(serialized, /\\u2028/);
    assert.match(serialized, /\\u0026/);
});

test('embedder rejects empty bundles and invalid markers', () => {
    assert.throws(() => embedBundle(template, ''), /empty/);
    assert.throws(() => embedBundle('<script></script>', 'x'), /exactly one/);
    assert.throws(() => embedBundle(`${template}${BUNDLE_START}`, 'x'), /exactly one/);
});

test('--check detects stale content without modifying it', t => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ill-embed-'));
    t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
    const indexPath = path.join(directory, 'index.html');
    const bundlePath = path.join(directory, 'bundle.js');
    const scriptPath = path.resolve(__dirname, '../scripts/update-index.js');
    fs.writeFileSync(indexPath, template);
    fs.writeFileSync(bundlePath, 'current bundle');

    const stale = spawnSync(process.execPath, [scriptPath, '--check', indexPath, bundlePath]);
    assert.notEqual(stale.status, 0);
    assert.equal(fs.readFileSync(indexPath, 'utf8'), template);

    fs.writeFileSync(indexPath, embedBundle(template, 'current bundle'));
    const current = spawnSync(process.execPath, [scriptPath, '--check', indexPath, bundlePath]);
    assert.equal(current.status, 0, current.stderr.toString());
});
