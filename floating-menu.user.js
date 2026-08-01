// ==UserScript==
// @name        floating-menu
// @description Shared floating button menu for userscripts
// @version     2.0.0
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
  let buttonEntries = [];
  let groupContainer = null;

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

  function renderButtons() {
    if (!groupContainer) return;

    while (groupContainer.firstChild) {
      groupContainer.removeChild(groupContainer.firstChild);
    }

    var sorted = buttonEntries.slice().sort(function (a, b) {
      if (a.sortKey !== b.sortKey) return a.sortKey - b.sortKey;
      return a.insertOrder - b.insertOrder;
    });

    var groups = [];
    var currentGroup = null;
    sorted.forEach(function (entry) {
      var key = entry.group || ('__solo_' + entry.insertOrder);
      if (!currentGroup || currentGroup.key !== key) {
        currentGroup = { key: key, entries: [], isSolo: !entry.group };
        groups.push(currentGroup);
      }
      currentGroup.entries.push(entry);
    });

    groups.forEach(function (group, gi) {
      var wrapper;
      if (!group.isSolo && group.entries.length > 1) {
        wrapper = document.createElement('div');
        wrapper.style.cssText = 'display:flex;flex-direction:column-reverse;gap:6px;padding:5px;border-radius:12px;background:rgba(255,255,255,0.06);';
      } else {
        wrapper = document.createElement('div');
        wrapper.style.cssText = 'display:flex;flex-direction:column-reverse;gap:6px;';
      }

      group.entries.forEach(function (entry) {
        wrapper.appendChild(entry.button);
      });

      groupContainer.appendChild(wrapper);
    });

    updateButtonVisibility();
  }

  function updateButtonVisibility() {
    if (!groupContainer) return;
    var wrappers = groupContainer.children;
    for (var i = 0; i < wrappers.length; i++) {
      var wrapper = wrappers[i];
      var buttons = wrapper.querySelectorAll('button');
      for (var j = 0; j < buttons.length; j++) {
        var btn = buttons[j];
        if (menuOpen) {
          btn.style.display = 'flex';
          btn.style.opacity = '0';
          btn.style.transform = 'translateY(10px) scale(0.8)';
          (function (b, delay) {
            requestAnimationFrame(function () {
              b.style.transition = 'opacity 0.2s ease ' + delay + 's, transform 0.2s ease ' + delay + 's';
              b.style.opacity = b._targetOpacity || '1';
              b.style.transform = 'translateY(0) scale(1)';
            });
          })(btn, i * 0.05 + j * 0.03);
        } else {
          btn.style.transition = 'opacity 0.15s ease, transform 0.15s ease';
          btn.style.opacity = '0';
          btn.style.transform = 'translateY(10px) scale(0.8)';
          (function (b) {
            setTimeout(function () { b.style.display = 'none'; }, 150);
          })(btn);
        }
      }
      if (menuOpen) {
        wrapper.style.display = 'flex';
      } else {
        (function (w) {
          setTimeout(function () { w.style.display = 'none'; }, 150);
        })(wrapper);
      }
    }
  }

  function toggleMenu() {
    menuOpen = !menuOpen;
    updateButtonVisibility();
  }

  function addButton(text, title, onClick, options) {
    options = options || {};
    var button = createMenuButton(text, title, onClick);
    button._targetOpacity = options.opacity || '1';
    button.style.display = 'none';

    var entry = {
      button: button,
      group: options.group || null,
      sortKey: typeof options.sortKey === 'number' ? options.sortKey : 999,
      insertOrder: buttonEntries.length,
    };
    buttonEntries.push(entry);

    renderButtons();
    return button;
  }

  function createUI() {
    menuContainer = document.createElement('div');
    menuContainer.id = 'floating-menu';
    menuContainer.style.cssText =
      'position:fixed;bottom:16px;left:' + getMenuLeft() + ';display:flex;flex-direction:column-reverse;gap:8px;z-index:999999;transition:left 0.3s ease;';

    var mainButton = createMenuButton('⚙', 'Menu', toggleMenu);
    menuContainer.appendChild(mainButton);

    groupContainer = document.createElement('div');
    groupContainer.style.cssText = 'display:flex;flex-direction:column-reverse;gap:12px;';
    menuContainer.appendChild(groupContainer);

    var positionEntry = {
      button: createMenuButton(
        getSettings().buttonsOnRight ? '←' : '→',
        'Toggle button position',
        function () {
          settings.buttonsOnRight = !getSettings().buttonsOnRight;
          positionEntry.button.textContent = getSettings().buttonsOnRight ? '←' : '→';
          menuContainer.style.left = getMenuLeft();
          saveSettings();
        }
      ),
      group: '__position',
      sortKey: 9999,
      insertOrder: -1,
    };
    positionEntry.button.style.display = 'none';
    buttonEntries.push(positionEntry);
    renderButtons();

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
