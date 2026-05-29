// ==UserScript==
// @name        oauth-auto-close
// @description Auto-close OAuth callback tab after "You can now close this tab." message
// @version     1.1
// @match       http://127.0.0.1:56536/oauth/callback*
// @updateURL   https://raw.githubusercontent.com/dylan-chong/userscripts/main/oauth-auto-close.user.js
// @downloadURL https://raw.githubusercontent.com/dylan-chong/userscripts/main/oauth-auto-close.user.js
// ==/UserScript==

(function () {
    const MESSAGE = 'You can now close this tab.';
    const log = (...args) => console.log('[oauth-auto-close]', ...args);

    log('Script loaded on', window.location.href);

    function checkAndClose() {
        const text = document.body ? document.body.textContent : '';
        log('Checking body text:', JSON.stringify(text.substring(0, 200)));
        if (text.includes(MESSAGE)) {
            log('Message found! Closing tab in 1 second...');
            setTimeout(() => window.close(), 1000);
            return true;
        }
        log('Message not found');
        return false;
    }

    if (checkAndClose()) return;

    log('Setting up polling (every 250ms)');
    const intervalId = setInterval(() => {
        if (checkAndClose()) {
            log('Polling triggered close');
            clearInterval(intervalId);
        }
    }, 250);
})();
