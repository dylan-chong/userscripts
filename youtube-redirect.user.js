// ==UserScript==
// @name        youtube-redirect
// @description This is your new file, start writing code
// @version     1.1
// @match       *://*.youtube.com/*
// @updateURL   https://raw.githubusercontent.com/dylan-chong/userscripts/main/youtube-redirect.user.js
// @downloadURL https://raw.githubusercontent.com/dylan-chong/userscripts/main/youtube-redirect.user.js
// ==/UserScript==

(function () {
    // Run once per window (e.g. bundle + individual install).
    var loaded = window.__userscriptsLoaded = window.__userscriptsLoaded || {};
    if (loaded['youtube-redirect']) return;
    loaded['youtube-redirect'] = true;

    const getDesiredYoutubeRedirectUrl = () => {
        if (window.location.href.match(/music.youtube.com/)) {
            return;
        }

        if (window.location.href.match(/youtube.com\/?$/)) {
            return 'https://www.youtube.com/feed/subscriptions';
        }

        const shortsMatch = window.location.href.match(/.*youtube.com\/shorts\/(.*)?$/)
        if (shortsMatch) {
            const shortId = shortsMatch[1];
            return window.location.href.replace('shorts/', 'watch?v=');
        }
    }
    let lastReplacedYoutubeURLAt = 0;

    setInterval(() => {
        const desiredUrl = getDesiredYoutubeRedirectUrl();
        if (desiredUrl && window.location.href !== desiredUrl && Date.now() - lastReplacedYoutubeURLAt > 2000) {
            window.location.replace(desiredUrl);
            lastReplacedYoutubeURLAt = Date.now();
        }
    }, 200);
})();
