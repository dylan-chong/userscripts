// ==UserScript==
// @name        night-video
// @description Fullscreen edge-detection video filter for OLED night viewing
// @version     1.1.1
// @match       *://*/*
// @run-at      document-start
// @grant       none
// @updateURL   https://raw.githubusercontent.com/dylan-chong/userscripts/main/night-video.user.js
// @downloadURL https://raw.githubusercontent.com/dylan-chong/userscripts/main/night-video.user.js
// ==/UserScript==

(function () {
  'use strict';

  const STORAGE_KEY = 'night_video_v1';

  let active = false;
  let svgFilter = null;
  let canvasMode = null;
  let button = null;

  function loadState() {
    try {
      active = localStorage.getItem(STORAGE_KEY) === '1';
    } catch (e) {}
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, active ? '1' : '0');
    } catch (e) {}
  }

  function ensureSvgFilter() {
    if (svgFilter) return;
    var ns = 'http://www.w3.org/2000/svg';
    svgFilter = document.createElementNS(ns, 'svg');
    svgFilter.setAttribute('width', '0');
    svgFilter.setAttribute('height', '0');
    svgFilter.style.position = 'absolute';
    var filter = document.createElementNS(ns, 'filter');
    filter.setAttribute('id', 'night-video-edge');
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
    ensureSvgFilter();
    var video = findVideo();
    if (!video) return;

    var container = document.createElement('div');
    container.id = 'night-video-container';
    container.style.cssText =
      'position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:999997;background:#000;display:flex;flex-direction:column;align-items:center;justify-content:center;';

    var canvas = document.createElement('canvas');
    canvas.style.cssText = 'filter:url(#night-video-edge);max-width:100vw;max-height:calc(100vh - 60px);';
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

  function apply() {
    if (active) {
      exitCanvasMode();
      enterCanvasMode();
    } else {
      exitCanvasMode();
    }
    if (button) {
      button.textContent = active ? '■' : '□';
      button.title = active ? 'Night Video: ON' : 'Night Video: OFF';
    }
  }

  function toggle() {
    active = !active;
    saveState();
    apply();
  }

  function init() {
    loadState();
    var poll = setInterval(function () {
      if (window.__userscriptFloatingMenu) {
        clearInterval(poll);
        button = window.__userscriptFloatingMenu.addButton(
          active ? '■' : '□',
          active ? 'Night Video: ON' : 'Night Video: OFF',
          toggle,
          { group: 'video', sortKey: 13 }
        );
        apply();
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
