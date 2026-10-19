// ==UserScript==
// @name        github-circleci
// @description Add a button to open CircleCI pipeline for the current GitHub repo/PR (requires floating-menu script)
// @version     1.4
// @match       *://github.com/*/*
// @grant       none
// @updateURL   https://raw.githubusercontent.com/dylan-chong/userscripts/main/github-circleci.user.js
// @downloadURL https://raw.githubusercontent.com/dylan-chong/userscripts/main/github-circleci.user.js
// ==/UserScript==

(function () {
    // Run once per window (e.g. bundle + individual install).
    var loaded = window.__userscriptsLoaded = window.__userscriptsLoaded || {};
    if (loaded['github-circleci']) return;
    loaded['github-circleci'] = true;

    function getCircleCIUrl() {
        var match = window.location.pathname.match(/^\/([^/]+)\/([^/]+)(?:\/pull\/(\d+))?/);
        if (!match) return null;
        var owner = match[1];
        var repo = match[2];
        var pullNumber = match[3];
        var url = 'https://app.circleci.com/pipelines/gh/' + owner + '/' + repo;
        if (pullNumber) {
            url += '?branch=pull%2F' + pullNumber + '/head';
        }
        return url;
    }

    // Chained setTimeout, not setInterval: clearInterval doesn't stop intervals on Facebook,
    // which left this poll adding duplicate menu buttons forever.
    (function waitForMenu() {
        if (!window.__userscriptFloatingMenu) {
            setTimeout(waitForMenu, 100);
            return;
        }

        // Resolve the URL on click, not here: GitHub navigates between repos/PRs without a reload.
        window.__userscriptFloatingMenu.addButton('CI', 'Open CircleCI pipeline', function () {
            var url = getCircleCIUrl();
            if (url) window.open(url, '_blank');
        }, { group: 'dev', sortKey: 30 });
    })();
})();
