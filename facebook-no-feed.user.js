// ==UserScript==
// @name        facebook-no-feed
// @description Hide the Facebook news feed and show a "Don't waste time" message
// @version     1.0
// @match       *://*.facebook.com/*
// @updateURL   https://raw.githubusercontent.com/dylan-chong/userscripts/main/facebook-no-feed.user.js
// @downloadURL https://raw.githubusercontent.com/dylan-chong/userscripts/main/facebook-no-feed.user.js
// ==/UserScript==

(function () {
    let replaced = false;

    function isHomePage() {
        const path = window.location.pathname;
        return path === '/' || path === '/home.php';
    }

    function replaceMessage() {
        return `
            <div style="
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 60vh;
                font-size: 2rem;
                color: #888;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            ">
                Don't waste time
            </div>
        `;
    }

    function tryReplaceFeed() {
        if (!isHomePage()) {
            replaced = false;
            return;
        }
        if (replaced) return;

        const feed = document.querySelector('div[role="feed"]') ||
                     document.querySelector('div[role="main"]');
        if (!feed) return;

        feed.innerHTML = replaceMessage();
        replaced = true;
    }

    setInterval(tryReplaceFeed, 500);
})();
