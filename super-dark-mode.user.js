// ==UserScript==
// @name        super-dark-mode
// @description Super dark overlay for OLED screens + edge-detection filter
// @version     1.0
// @match       *://*/*
// @run-at      document-start
// @grant       none
// @updateURL   https://raw.githubusercontent.com/dylan-chong/userscripts/main/super-dark-mode.user.js
// @downloadURL https://raw.githubusercontent.com/dylan-chong/userscripts/main/super-dark-mode.user.js
// ==/UserScript==

(function () {
  'use strict';

  const STORAGE_KEY = 'super_dark_mode_v1';
  const MODES = [
    { label: '🌙', title: 'Super Dark: OFF', opacity: 0 },
    { label: '🌑', title: 'Super Dark: 70%', opacity: 0.7 },
    { label: '⚫', title: 'Super Dark: 40% brightness', opacity: 0.6 },
    { label: '🔲', title: 'Super Dark: Edge Detection', opacity: 0, filter: true },
  ];

  let modeIndex = 0;
  let overlay = null;
  let svgFilter = null;
  let button = null;

  function loadMode() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved !== null) modeIndex = parseInt(saved, 10) || 0;
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
    overlay.id = 'super-dark-overlay';
    overlay.style.cssText =
      'position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:999998;background:rgba(0,0,0,0);transition:background 0.3s ease;';
    document.body.appendChild(overlay);
  }

  function ensureSvgFilter() {
    if (svgFilter) return;
    svgFilter = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svgFilter.setAttribute('width', '0');
    svgFilter.setAttribute('height', '0');
    svgFilter.style.position = 'absolute';
    svgFilter.innerHTML =
      '<filter id="super-dark-edge">' +
      '<feConvolveMatrix order="3" kernelMatrix="0 -1 0 -1 4 -1 0 -1 0" preserveAlpha="true"/>' +
      '</filter>';
    document.body.appendChild(svgFilter);
  }

  function applyMode() {
    ensureOverlay();
    ensureSvgFilter();

    const mode = MODES[modeIndex];

    if (mode.opacity > 0) {
      overlay.style.background = 'rgba(0,0,0,' + mode.opacity + ')';
    } else {
      overlay.style.background = 'rgba(0,0,0,0)';
    }

    if (mode.filter) {
      document.documentElement.style.filter = 'url(#super-dark-edge)';
    } else {
      document.documentElement.style.filter = '';
    }

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
          cycleMode
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
