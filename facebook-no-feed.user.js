// ==UserScript==
// @name        facebook-no-feed
// @description Hide the Facebook news feed and show a "Don't waste time" message
// @version     1.0
// @match       *://*.facebook.com/*
// @updateURL   https://raw.githubusercontent.com/dylan-chong/userscripts/main/facebook-no-feed.user.js
// @downloadURL https://raw.githubusercontent.com/dylan-chong/userscripts/main/facebook-no-feed.user.js
// ==/UserScript==

(function () {
    function isHomePage() {
        const path = window.location.pathname;
        return path === '/' || path === '/home.php';
    }

    const MESSAGE_ID = 'fb-no-feed-message';

    function createMessage() {
        const div = document.createElement('div');
        div.id = MESSAGE_ID;
        div.style.cssText = `
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 60vh;
            font-size: 2rem;
            color: #888;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;
        div.textContent = "Don't waste time";
        return div;
    }

    function replaceFeedDesktop(feed) {
        feed.innerHTML = '';
        feed.appendChild(createMessage());
    }

    function replaceFeedMobile(vscroller) {
        for (const child of Array.from(vscroller.children)) {
            if (child.querySelector('[role="tablist"]') || child.getAttribute('role') === 'tablist' || child.id === MESSAGE_ID) continue;
            child.style.display = 'none';
        }
        if (!vscroller.querySelector('#' + MESSAGE_ID)) {
            vscroller.appendChild(createMessage());
        }
    }

    function tryReplaceFeed() {
        if (!isHomePage()) return;

        const desktopFeed = document.querySelector('div[role="feed"]');
        if (desktopFeed) {
            replaceFeedDesktop(desktopFeed);
            return;
        }

        const mobileFeed = document.querySelector('div[data-type="vscroller"]');
        if (mobileFeed) {
            replaceFeedMobile(mobileFeed);
            return;
        }

        const main = document.querySelector('div[role="main"]');
        if (main) {
            replaceFeedDesktop(main);
        }
    }

    setInterval(tryReplaceFeed, 500);
})();
