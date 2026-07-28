// ==UserScript==
// @name        dim-mode
// @description Dim overlay for OLED screens + edge-detection filter
// @version     1.0.2
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
    { label: '0', title: 'Dim: OFF', opacity: 0 },
    { label: '1', title: 'Dim: 70%', opacity: 0.7 },
    { label: '2', title: 'Dim: 40% brightness', opacity: 0.6 },
    { label: '3', title: 'Dim: Edge Detection', opacity: 0, filter: true },
  ];

  let modeIndex = 0;
  let overlay = null;
  let svgFilter = null;
  let button = null;
  let filterObserver = null;

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
    overlay.id = 'dim-mode-overlay';
    overlay.style.cssText =
      'position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:999998;background:rgba(0,0,0,0);transition:background 0.3s ease;';
    document.body.appendChild(overlay);
  }

  function ensureSvgFilter() {
    if (svgFilter) return;
    var ns = 'http://www.w3.org/2000/svg';
    svgFilter = document.createElementNS(ns, 'svg');
    svgFilter.setAttribute('width', '0');
    svgFilter.setAttribute('height', '0');
    svgFilter.style.position = 'absolute';
    var filter = document.createElementNS(ns, 'filter');
    filter.setAttribute('id', 'dim-mode-edge');
    var matrix = document.createElementNS(ns, 'feConvolveMatrix');
    matrix.setAttribute('order', '3');
    matrix.setAttribute('kernelMatrix', '0 -1 0 -1 4 -1 0 -1 0');
    matrix.setAttribute('preserveAlpha', 'true');
    filter.appendChild(matrix);
    svgFilter.appendChild(filter);
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
      document.body.style.filter = 'url(#dim-mode-edge)';
      var menu = document.querySelector('#floating-menu');
      if (menu) menu.style.filter = 'none';
      applyFilterToMedia();
      startFilterObserver();
    } else {
      document.body.style.filter = '';
      removeFilterFromMedia();
      stopFilterObserver();
    }

    if (button) {
      button.textContent = mode.label;
      button.title = mode.title;
    }
  }

  function applyFilterToMedia() {
    document.querySelectorAll('video, img').forEach(function (el) {
      el.style.filter = 'url(#dim-mode-edge)';
    });
  }

  function removeFilterFromMedia() {
    document.querySelectorAll('video, img').forEach(function (el) {
      el.style.filter = '';
    });
  }

  function startFilterObserver() {
    if (filterObserver) return;
    filterObserver = new MutationObserver(function (mutations) {
      mutations.forEach(function (m) {
        m.addedNodes.forEach(function (node) {
          if (node.nodeType !== 1) return;
          if (node.tagName === 'VIDEO' || node.tagName === 'IMG') {
            node.style.filter = 'url(#dim-mode-edge)';
          }
          if (node.querySelectorAll) {
            node.querySelectorAll('video, img').forEach(function (el) {
              el.style.filter = 'url(#dim-mode-edge)';
            });
          }
        });
      });
    });
    filterObserver.observe(document.body, { childList: true, subtree: true });
  }

  function stopFilterObserver() {
    if (filterObserver) {
      filterObserver.disconnect();
      filterObserver = null;
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
