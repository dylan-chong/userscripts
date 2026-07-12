// ==UserScript==
// @name        facebook-messenger-no-header
// @description Hide the header bar on messenger.com to remove notification badges and marketplace
// @version     1.0
// @match       *://*.messenger.com/*
// @updateURL   https://raw.githubusercontent.com/dylan-chong/userscripts/main/facebook-messenger-no-header.user.js
// @downloadURL https://raw.githubusercontent.com/dylan-chong/userscripts/main/facebook-messenger-no-header.user.js
// ==/UserScript==

(function () {
    function hideHeader() {
        const header = document.querySelector('nav, [role="banner"]');
        if (header) {
            header.style.display = 'none';
        }
    }

    setInterval(hideHeader, 500);
})();
