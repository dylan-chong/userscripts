// ==UserScript==
// @name        dim-mode
// @description Dim overlay for OLED screens + edge-detection filter
// @version     1.1.1
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
  let canvasMode = null;

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

  function findVideo() {
    var videos = document.querySelectorAll('video');
    for (var i = 0; i < videos.length; i++) {
      if (!videos[i].paused) return videos[i];
    }
    return videos[0] || null;
  }

  function enterCanvasMode() {
    var video = findVideo();
    if (!video) return;

    var container = document.createElement('div');
    container.id = 'dim-mode-canvas-container';
    container.style.cssText =
      'position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:999997;background:#000;display:flex;flex-direction:column;align-items:center;justify-content:center;';

    var canvas = document.createElement('canvas');
    canvas.style.cssText = 'filter:url(#dim-mode-edge);max-width:100vw;max-height:calc(100vh - 60px);';
    container.appendChild(canvas);

    var controls = document.createElement('div');
    controls.style.cssText = 'display:flex;gap:16px;padding:12px;';

    function makeBtn(text, title, onClick) {
      var btn = document.createElement('button');
      btn.textContent = text;
      btn.title = title;
      btn.style.cssText =
        'all:initial;display:flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:50%;border:2px solid #666;background-color:#333;color:#fff;font-size:18px;cursor:pointer;';
      btn.addEventListener('click', onClick);
      return btn;
    }

    controls.appendChild(makeBtn('⏪', 'Back 10s', function () { video.currentTime -= 10; }));
    controls.appendChild(makeBtn('⏯', 'Play/Pause', function () { video.paused ? video.play() : video.pause(); }));
    controls.appendChild(makeBtn('⏩', 'Forward 10s', function () { video.currentTime += 10; }));
    container.appendChild(controls);

    document.body.appendChild(container);

    var ctx = canvas.getContext('2d');
    var timeoutId = null;

    function draw() {
      if (!canvasMode) return;
      var vw = video.videoWidth || 300;
      var vh = video.videoHeight || 150;
      if (canvas.width !== vw) canvas.width = vw;
      if (canvas.height !== vh) canvas.height = vh;
      ctx.drawImage(video, 0, 0, vw, vh);
      canvasMode.timeoutId = setTimeout(draw, 1000 / 24);
    }

    canvasMode = { container: container, canvas: canvas, ctx: ctx, video: video, timeoutId: null };
    draw();
  }

  function exitCanvasMode() {
    if (!canvasMode) return;
    clearTimeout(canvasMode.timeoutId);
    if (canvasMode.container.parentElement) {
      canvasMode.container.parentElement.removeChild(canvasMode.container);
    }
    canvasMode = null;
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
      exitCanvasMode();
      enterCanvasMode();
    } else {
      exitCanvasMode();
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
