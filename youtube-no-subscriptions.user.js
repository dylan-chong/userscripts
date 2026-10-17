// ==UserScript==
// @name        youtube-no-subscriptions
// @description Redirects from YouTube subscriptions page to a specific video
// @version     1.1
// @match       *://*.youtube.com/*
// @updateURL   https://raw.githubusercontent.com/dylan-chong/userscripts/main/youtube-no-subscriptions.user.js
// @downloadURL https://raw.githubusercontent.com/dylan-chong/userscripts/main/youtube-no-subscriptions.user.js
// ==/UserScript==

(function () {
    // Run once per window (e.g. bundle + individual install).
    var loaded = window.__userscriptsLoaded = window.__userscriptsLoaded || {};
    if (loaded['youtube-no-subscriptions']) return;
    loaded['youtube-no-subscriptions'] = true;

    const REDIRECT_URL = 'https://www.youtube.com/watch?v=MK3lB-uY0gE';

    let lastRedirectedAt = 0;

    setInterval(() => {
        const isSubscriptionsPage = window.location.href.match(/youtube\.com\/feed\/subscriptions/);
        if (isSubscriptionsPage && Date.now() - lastRedirectedAt > 2000) {
            window.location.replace(REDIRECT_URL);
            lastRedirectedAt = Date.now();
        }
    }, 500);
})();
