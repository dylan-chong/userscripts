#!/usr/bin/env node
'use strict';

// Combines all *.user.js files in this directory into build/all.user.js,
// so there is a single script users can install and keep up to date.
// Each sub-script's body is wrapped in a runtime @match guard so it only
// executes on the sites it originally targeted.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUTPUT_DIR = path.join(ROOT, 'build');
const OUTPUT_PATH = path.join(OUTPUT_DIR, 'all.user.js');
const OUTPUT_BASENAME = 'all.user.js';

const REPO_RAW_BASE = 'https://raw.githubusercontent.com/dylan-chong/userscripts/main/build/all.user.js';

// floating-menu.user.js must load first: other scripts poll
// window.__userscriptFloatingMenu, but this keeps the bundle readable.
const PRIORITY_FIRST = ['floating-menu.user.js'];

function matchPatternToRegExp(pattern) {
    var escaped = pattern
        .split('*')
        .map(function (segment) {
            return segment.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
        })
        .join('.*');
    return new RegExp('^' + escaped + '$');
}

function parseUserScript(filePath) {
    var content = fs.readFileSync(filePath, 'utf8');
    var fileName = path.basename(filePath);

    var headerMatches = content.match(/\/\/ ==UserScript==[\s\S]*?\/\/ ==\/UserScript==/g);
    if (!headerMatches || headerMatches.length !== 1) {
        throw new Error(
            fileName + ': expected exactly one // ==UserScript== ... // ==/UserScript== block, found ' +
            (headerMatches ? headerMatches.length : 0)
        );
    }
    var header = headerMatches[0];

    var matchLines = header
        .split('\n')
        .map(function (line) { return line.trim(); })
        .filter(function (line) { return /^\/\/\s*@match\b/.test(line); })
        .map(function (line) { return line.replace(/^\/\/\s*@match\s+/, '').trim(); });

    if (matchLines.length === 0) {
        throw new Error(fileName + ': no @match directive found');
    }

    var body = content.slice(content.indexOf(header) + header.length).replace(/^\s*\n/, '');

    return { fileName: fileName, matchPatterns: matchLines, body: body };
}

function wrapWithMatchGuard(script) {
    var regexes = script.matchPatterns.map(matchPatternToRegExp);
    var condition = regexes
        .map(function (re) { return re.toString() + '.test(location.href)'; })
        .join(' || ');

    return (
        '// ' + script.fileName + '\n' +
        '(function () {\n' +
        'if (!(' + condition + ')) return;\n' +
        script.body.replace(/\s+$/, '') + '\n' +
        '})();\n'
    );
}

function readExistingVersion() {
    if (!fs.existsSync(OUTPUT_PATH)) return '0.1';
    var content = fs.readFileSync(OUTPUT_PATH, 'utf8');
    var match = content.match(/@version\s+(\S+)/);
    return match ? match[1] : '0.1';
}

function buildHeader(version) {
    return [
        '// ==UserScript==',
        '// @name        all-userscripts-bundle',
        '// @description Combined bundle of all userscripts in this repo (each sub-script only runs on its original matched sites) — install this instead of individual scripts to keep everything updated in one place',
        '// @version     ' + version,
        '// @match       *://*/*',
        '// @run-at      document-start',
        '// @grant       none',
        '// @updateURL   ' + REPO_RAW_BASE,
        '// @downloadURL ' + REPO_RAW_BASE,
        '// ==/UserScript==',
        '',
    ].join('\n');
}

function bumpVersion(version) {
    var parts = version.split('.');
    var major = parseInt(parts[0], 10);
    var minor = parseInt(parts[1], 10);
    return major + '.' + (minor + 1);
}

function main() {
    var files = fs
        .readdirSync(ROOT)
        .filter(function (f) { return f.endsWith('.user.js'); })
        .filter(function (f) { return f !== OUTPUT_BASENAME; });

    files.sort(function (a, b) {
        var aPriority = PRIORITY_FIRST.indexOf(a);
        var bPriority = PRIORITY_FIRST.indexOf(b);
        if (aPriority !== -1 || bPriority !== -1) {
            if (aPriority === -1) return 1;
            if (bPriority === -1) return -1;
            return aPriority - bPriority;
        }
        return a.localeCompare(b);
    });

    var scripts = files.map(function (f) { return parseUserScript(path.join(ROOT, f)); });

    var version = readExistingVersion();
    var newVersion = bumpVersion(version);
    var header = buildHeader(newVersion);
    var body = scripts.map(wrapWithMatchGuard).join('\n');

    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    fs.writeFileSync(OUTPUT_PATH, header + '\n' + body);

    console.log('Built ' + path.relative(ROOT, OUTPUT_PATH) + ' from ' + scripts.length + ' scripts (version ' + version + ' → ' + newVersion + ')');
}

main();
