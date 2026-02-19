// ==UserScript==
// @name        poker-clock-remove-ui
// @description This is your new file, start writing code
// @match       *://*clock.poker/*
// ==/UserScript==
// TODO doesn't match on website


setTimeout(() => {
    $('.title-container').style.display = 'none';
    $('.column h2').remove();
    $('.level-table').style.fontSize = "6vh";   
}, 2000);
