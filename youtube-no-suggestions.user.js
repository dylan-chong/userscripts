// ==UserScript==
// @name        youtube-no-suggestions
// @description Remove all YouTube video suggestions (sidebar, homepage, end screen)
// @version     1.1
// @match       *://*.youtube.com/*
// @updateURL   https://raw.githubusercontent.com/dylan-chong/userscripts/main/youtube-no-suggestions.user.js
// @downloadURL https://raw.githubusercontent.com/dylan-chong/userscripts/main/youtube-no-suggestions.user.js
// ==/UserScript==

(function () {
    function hideSuggestions() {
        document.querySelectorAll(
            [
                'ytd-watch-next-secondary-results-renderer',
                '#related',
                '.ytp-endscreen-content',
                'ytd-compact-video-renderer',
                'yt-lockup-view-model',
                'ytm-related-video-list-renderer',
                'ytm-item-section-renderer[section-identifier="related-items"]',
            ].join(', ')
        ).forEach(function (el) {
            el.style.display = 'none';
        });

        if (window.location.pathname === '/' || window.location.pathname === '/feed') {
            const grid = document.querySelector('ytd-rich-grid-renderer, ytd-two-column-browse-results-renderer');
            if (grid) {
                grid.style.display = 'none';
            }
        }
    }

    // setInterval(hideSuggestions, 500);
})();
