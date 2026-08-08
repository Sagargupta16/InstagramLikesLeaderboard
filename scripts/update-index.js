'use strict';

const fs = require('node:fs');

const BUNDLE_START = '/*__ILL_BUNDLE_START__*/';
const BUNDLE_END = '/*__ILL_BUNDLE_END__*/';

function countOccurrences(value, marker) {
    return value.split(marker).length - 1;
}

function serializeBundle(bundle) {
    return JSON.stringify(bundle)
        .replace(/</g, '\\u003c')
        .replace(/>/g, '\\u003e')
        .replace(/&/g, '\\u0026')
        .replace(/\u2028/g, '\\u2028')
        .replace(/\u2029/g, '\\u2029');
}

function embedBundle(indexData, bundle) {
    if (bundle.length === 0) {
        throw new Error('Bundle is empty.');
    }
    if (countOccurrences(indexData, BUNDLE_START) !== 1 || countOccurrences(indexData, BUNDLE_END) !== 1) {
        throw new Error('Expected exactly one start marker and one end marker.');
    }

    const start = indexData.indexOf(BUNDLE_START) + BUNDLE_START.length;
    const end = indexData.indexOf(BUNDLE_END);
    if (start >= end) {
        throw new Error('Bundle markers are out of order.');
    }

    return `${indexData.slice(0, start)}${serializeBundle(bundle)}${indexData.slice(end)}`;
}

function main(argv) {
    const check = argv[0] === '--check';
    const args = check ? argv.slice(1) : argv;
    if (args.length !== 2) {
        throw new Error('Usage: node scripts/update-index.js [--check] <index.html> <bundle.js>');
    }

    const [indexPath, bundlePath] = args;
    const indexData = fs.readFileSync(indexPath, 'utf8');
    const bundle = fs.readFileSync(bundlePath, 'utf8');
    const generated = embedBundle(indexData, bundle);

    if (check) {
        if (generated !== indexData) {
            throw new Error(`${indexPath} does not contain the current generated bundle.`);
        }
        console.log('Generated bundle is current.');
        return;
    }

    if (generated !== indexData) {
        fs.writeFileSync(indexPath, generated, 'utf8');
    }
    console.log('Embedded bundle updated.');
}

if (require.main === module) {
    try {
        main(process.argv.slice(2));
    } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
    }
}

module.exports = { BUNDLE_END, BUNDLE_START, embedBundle, serializeBundle };
