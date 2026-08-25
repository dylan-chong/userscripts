// ==UserScript==
// @name        dim-mode
// @description Dim overlay for OLED screens (requires floating-menu script)
// @version     2.2.1
// @match       *://*/*
// @run-at      document-start
// @grant       none
// @updateURL   https://raw.githubusercontent.com/dylan-chong/userscripts/main/dim-mode.user.js
// @downloadURL https://raw.githubusercontent.com/dylan-chong/userscripts/main/dim-mode.user.js
// ==/UserScript==

(function () {
  'use strict';

  const STORAGE_KEY = 'dim_mode_v1';
  const MODES = [
    { label: 'D', title: 'Dim: OFF', opacity: 0 },
    { label: 'D', title: 'Dim: 85%', opacity: 0.85 },
    { label: 'D', title: 'Dim: 70%', opacity: 0.70 },
    { label: 'D', title: 'Dim: 55%', opacity: 0.55 },
    { label: 'D', title: 'Dim: 40%', opacity: 0.40 }
  ];

  let modeIndex = 0;
  let overlay = null;
  let button = null;

  function loadMode() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved !== null) {
        var idx = parseInt(saved, 10) || 0;
        if (idx < MODES.length) modeIndex = idx;
      }
    } catch (e) {}
  }

  function saveMode() {
    try {
      localStorage.setItem(STORAGE_KEY, String(modeIndex));
    } catch (e) {}
  }

  function ensureOverlay() {
    if (overlay) return;
    overlay = document.createElement('div');
    overlay.id = 'dim-mode-overlay';
    overlay.style.cssText =
      'position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:999998;background:rgba(0,0,0,0);transition:background 0.3s ease;';
    document.body.appendChild(overlay);
  }

  function applyMode() {
    ensureOverlay();
    var mode = MODES[modeIndex];
    overlay.style.background = mode.opacity > 0
      ? 'rgba(0,0,0,' + mode.opacity + ')'
      : 'rgba(0,0,0,0)';
    if (button) {
      button.textContent = mode.label;
      button.title = mode.title;
    }
  }

  function cycleMode() {
    modeIndex = (modeIndex + 1) % MODES.length;
    saveMode();
    applyMode();
  }

  function init() {
    loadMode();
    var poll = setInterval(function () {
      if (window.__userscriptFloatingMenu) {
        clearInterval(poll);
        var mode = MODES[modeIndex];
        button = window.__userscriptFloatingMenu.addButton(
          mode.label,
          mode.title,
          cycleMode,
          { group: 'display', sortKey: 12 }
        );
        applyMode();
      }
    }, 100);
  }

  if (document.body) {
    init();
  } else {
    var observer = new MutationObserver(function () {
      if (document.body) {
        observer.disconnect();
        init();
      }
    });
    observer.observe(document.documentElement, { childList: true });
  }
})();
