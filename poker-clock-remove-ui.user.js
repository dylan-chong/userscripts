// ==UserScript==
// @name        poker-clock-remove-ui
// @description This is your new file, start writing code
// @version     1.0
// @match       *://*clock.poker/*
// @updateURL   https://raw.githubusercontent.com/dylan-chong/userscripts/main/poker-clock-remove-ui.user.js
// @downloadURL https://raw.githubusercontent.com/dylan-chong/userscripts/main/poker-clock-remove-ui.user.js
// ==/UserScript==
// TODO doesn't match on website


setTimeout(() => {
    $('.title-container').style.display = 'none';
    $('.column h2').remove();
    $('.level-table').style.fontSize = "6vh";   
}, 2000);
