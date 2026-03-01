// ==UserScript==
// @name        youtube-no-subscriptions
// @description Redirects from YouTube subscriptions page to a specific video
// @version     1.0
// @match       *://*.youtube.com/*
// @updateURL   https://raw.githubusercontent.com/dylan-chong/userscripts/main/youtube-no-subscriptions.user.js
// @downloadURL https://raw.githubusercontent.com/dylan-chong/userscripts/main/youtube-no-subscriptions.user.js
// ==/UserScript==

const REDIRECT_URL = 'https://www.youtube.com/watch?v=b1iq8y9Tvd4';

let lastRedirectedAt = 0;

setInterval(() => {
    const isSubscriptionsPage = window.location.href.match(/youtube\.com\/feed\/subscriptions/);
    if (isSubscriptionsPage && Date.now() - lastRedirectedAt > 2000) {
        window.location.replace(REDIRECT_URL);
        lastRedirectedAt = Date.now();
    }
}, 500);
