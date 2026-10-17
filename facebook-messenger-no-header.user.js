// ==UserScript==
// @name        facebook-messenger-no-header
// @description Hide the header bar on messenger.com to remove notification badges and marketplace
// @version     1.2
// @match       *://*.facebook.com/messages/*
// @updateURL   https://raw.githubusercontent.com/dylan-chong/userscripts/main/facebook-messenger-no-header.user.js
// @downloadURL https://raw.githubusercontent.com/dylan-chong/userscripts/main/facebook-messenger-no-header.user.js
// ==/UserScript==

(function () {
    // Run once per window (e.g. bundle + individual install).
    var loaded = window.__userscriptsLoaded = window.__userscriptsLoaded || {};
    if (loaded['facebook-messenger-no-header']) return;
    loaded['facebook-messenger-no-header'] = true;

    function hideHeader() {
        const header = document.querySelector('nav, [role="banner"]');
        if (header) {
            header.style.display = 'none';
        }
    }

    setInterval(hideHeader, 500);
})();
