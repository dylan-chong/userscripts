// ==UserScript==
// @name        poker-clock-remove-ui
// @description This is your new file, start writing code
// @version     1.1
// @match       *://*clock.poker/*
// @updateURL   https://raw.githubusercontent.com/dylan-chong/userscripts/main/poker-clock-remove-ui.user.js
// @downloadURL https://raw.githubusercontent.com/dylan-chong/userscripts/main/poker-clock-remove-ui.user.js
// ==/UserScript==
// TODO doesn't match on website

(function () {
    // Run once per window (e.g. bundle + individual install).
    var loaded = window.__userscriptsLoaded = window.__userscriptsLoaded || {};
    if (loaded['poker-clock-remove-ui']) return;
    loaded['poker-clock-remove-ui'] = true;

    setTimeout(() => {
        $('.title-container').style.display = 'none';
        $('.column h2').remove();
        $('.level-table').style.fontSize = "6vh";   
    }, 2000);
})();
