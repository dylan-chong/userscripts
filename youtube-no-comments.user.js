// ==UserScript==
// @name        youtube-no-comments
// @description Hide all YouTube comments on desktop and mobile
// @version     1.2
// @match       *://*.youtube.com/*
// @updateURL   https://raw.githubusercontent.com/dylan-chong/userscripts/main/youtube-no-comments.user.js
// @downloadURL https://raw.githubusercontent.com/dylan-chong/userscripts/main/youtube-no-comments.user.js
// ==/UserScript==

(function () {
    function hideComments() {
        document.querySelectorAll(
            'ytd-comments#comments, ytm-comment-section-renderer, #comment-teaser, ytm-engagement-panel-section-list-renderer[target-id="comment-item-section"]'
        ).forEach(function (el) {
            el.style.display = 'none';
        });

        document.querySelectorAll('yt-video-metadata-carousel-view-model').forEach(function (el) {
            if (el.querySelector('yt-comment-teaser-carousel-item-view-model')) {
                el.style.display = 'none';
            }
        });
    }

    setInterval(hideComments, 500);
})();
