// ==UserScript==
// @name        floating-menu
// @description Shared floating button menu for userscripts
// @version     1.0
// @match       *://*/*
// @run-at      document-start
// @grant       none
// @updateURL   https://raw.githubusercontent.com/dylan-chong/userscripts/main/floating-menu.user.js
// @downloadURL https://raw.githubusercontent.com/dylan-chong/userscripts/main/floating-menu.user.js
// ==/UserScript==

(function () {
  'use strict';

  const domain = window.location.hostname;
  const STORAGE_KEY = `floating_menu_v1_${domain}`;

  const DEFAULT_SETTINGS = {
    buttonsOnRight: true,
  };

  let settings = {};
  let menuOpen = false;
  let menuContainer = null;

  function saveSettings() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {}
  }

  function loadSettings() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) settings = JSON.parse(raw);
    } catch (e) {}
  }

  function getSettings() {
    return { ...DEFAULT_SETTINGS, ...settings };
  }

  const BUTTON_STYLE = `
    all: initial;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    padding: 0;
    margin: 0;
    border-radius: 50%;
    border: 2px solid #666;
    background-color: #333;
    color: #fff;
    font-family: system-ui, sans-serif;
    font-size: 16px;
    font-weight: normal;
    line-height: 1;
    text-align: center;
    text-transform: none;
    letter-spacing: normal;
    text-indent: 0;
    text-decoration: none;
    cursor: pointer;
    z-index: 999999;
    box-sizing: border-box;
    box-shadow: 0 2px 10px rgba(0,0,0,0.3);
    transition: all 0.2s ease;
  `;

  function createMenuButton(text, title, onClick) {
    const button = document.createElement('button');
    button.textContent = text;
    button.title = title;
    button.style.cssText = BUTTON_STYLE;
    button.addEventListener('mouseenter', function () { button.style.transform = 'translateY(0) scale(1.1)'; });
    button.addEventListener('mouseleave', function () { button.style.transform = 'translateY(0) scale(1)'; });
    button.addEventListener('click', onClick);
    return button;
  }

  function getMenuLeft() {
    return getSettings().buttonsOnRight ? 'calc(100vw - 52px)' : '16px';
  }

  function toggleMenu() {
    menuOpen = !menuOpen;
    var childButtons = menuContainer.querySelectorAll('.fm-child-btn');
    childButtons.forEach(function (btn, i) {
      if (menuOpen) {
        btn.style.display = 'block';
        btn.style.opacity = '0';
        btn.style.transform = 'translateY(10px) scale(0.8)';
        requestAnimationFrame(function () {
          btn.style.transition = 'opacity 0.2s ease ' + (i * 0.05) + 's, transform 0.2s ease ' + (i * 0.05) + 's';
          btn.style.opacity = btn._targetOpacity || '1';
          btn.style.transform = 'translateY(0) scale(1)';
        });
      } else {
        btn.style.transition = 'opacity 0.15s ease, transform 0.15s ease';
        btn.style.opacity = '0';
        btn.style.transform = 'translateY(10px) scale(0.8)';
        setTimeout(function () { btn.style.display = 'none'; }, 150);
      }
    });
  }

  function addButton(text, title, onClick, options) {
    options = options || {};
    var button = createMenuButton(text, title, onClick);
    button.className = 'fm-child-btn';
    button._targetOpacity = options.opacity || '1';
    if (menuOpen) {
      button.style.display = 'block';
      button.style.opacity = button._targetOpacity;
    } else {
      button.style.display = 'none';
    }
    menuContainer.appendChild(button);
    return button;
  }

  function createUI() {
    menuContainer = document.createElement('div');
    menuContainer.id = 'floating-menu';
    menuContainer.style.cssText =
      'position:fixed;bottom:16px;left:' + getMenuLeft() + ';display:flex;flex-direction:column-reverse;gap:8px;z-index:999999;transition:left 0.3s ease;';

    var mainButton = createMenuButton('⚙', 'Menu', toggleMenu);
    menuContainer.appendChild(mainButton);

    var positionButton = createMenuButton(
      getSettings().buttonsOnRight ? '←' : '→',
      'Toggle button position',
      function () {
        settings.buttonsOnRight = !getSettings().buttonsOnRight;
        positionButton.textContent = getSettings().buttonsOnRight ? '←' : '→';
        menuContainer.style.left = getMenuLeft();
        saveSettings();
      }
    );
    positionButton.className = 'fm-child-btn';
    positionButton.style.display = 'none';
    menuContainer.appendChild(positionButton);

    document.body.appendChild(menuContainer);

    window.__userscriptFloatingMenu = {
      addButton: addButton,
    };
  }

  function init() {
    loadSettings();
    if (document.body) {
      createUI();
    } else {
      var observer = new MutationObserver(function () {
        if (document.body) {
          createUI();
          observer.disconnect();
        }
      });
      observer.observe(document.documentElement, { childList: true });
    }
  }

  init();
})();
