// ==UserScript==
// @name        youtube-no-comments
// @description Hide all YouTube comments on desktop and mobile
// @version     1.6
// @match       *://*.youtube.com/*
// @updateURL   https://raw.githubusercontent.com/dylan-chong/userscripts/main/youtube-no-comments.user.js
// @downloadURL https://raw.githubusercontent.com/dylan-chong/userscripts/main/youtube-no-comments.user.js
// ==/UserScript==

(function () {
    // Run once per window (e.g. bundle + individual install).
    var loaded = window.__userscriptsLoaded = window.__userscriptsLoaded || {};
    if (loaded['youtube-no-comments']) return;
    loaded['youtube-no-comments'] = true;

    function hideComments() {
        document.querySelectorAll(
            'ytd-comments#comments, ytm-comment-section-renderer, #comment-teaser, ytm-engagement-panel-section-list-renderer[target-id="comment-item-section"]'
        ).forEach(function (el) {
            el.style.display = 'none';
        });

        document.querySelectorAll('yt-video-metadata-carousel-view-model').forEach(function (el) {
            if (el.querySelector('yt-comment-teaser-carousel-item-view-model, yt-comment-input-box-carousel-item-view-model')) {
                el.style.display = 'none';
            }
        });
    }

    setInterval(hideComments, 500);
})();
