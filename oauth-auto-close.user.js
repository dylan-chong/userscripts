// ==UserScript==
// @name        oauth-auto-close
// @description Auto-close OAuth callback tab after "You can now close this tab." message
// @version     1.0
// @match       http://127.0.0.1:56536/oauth/callback*
// @updateURL   https://raw.githubusercontent.com/dylan-chong/userscripts/main/oauth-auto-close.user.js
// @downloadURL https://raw.githubusercontent.com/dylan-chong/userscripts/main/oauth-auto-close.user.js
// ==/UserScript==

(function () {
    const MESSAGE = 'You can now close this tab.';

    function checkAndClose() {
        if (document.body && document.body.textContent.includes(MESSAGE)) {
            setTimeout(() => window.close(), 1000);
            return true;
        }
        return false;
    }

    if (checkAndClose()) return;

    const observer = new MutationObserver(() => {
        if (checkAndClose()) observer.disconnect();
    });
    observer.observe(document.body || document.documentElement, {
        childList: true,
        subtree: true,
    });
})();
