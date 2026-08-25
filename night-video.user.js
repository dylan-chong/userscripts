// ==UserScript==
// @name        night-video
// @description Fullscreen edge-detection filter for OLED night viewing (requires floating-menu script)
// @version     1.7.1
// @match       *://*/*
// @run-at      document-start
// @grant       none
// @updateURL   https://raw.githubusercontent.com/dylan-chong/userscripts/main/night-video.user.js
// @downloadURL https://raw.githubusercontent.com/dylan-chong/userscripts/main/night-video.user.js
// ==/UserScript==

(function () {
  'use strict';

  const STORAGE_KEY = 'night_video_v1';

  const FILTERS = [
    { id: null, title: 'Night Video: OFF' },
    { id: 'night-video-1', title: 'Night Video: Edge Detect' },
    { id: 'night-video-1-dim', title: 'Night Video: Edge Detect + Dim Original' },
  ];

  let filterIndex = 0;
  let svgFilter = null;
  let canvasMode = null;
  let button = null;

  function loadState() {
    try {
      var stored = parseInt(localStorage.getItem(STORAGE_KEY), 10);
      filterIndex = isNaN(stored) || stored < 0 || stored >= FILTERS.length ? 0 : stored;
    } catch (e) {}
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, String(filterIndex));
    } catch (e) {}
  }

  function ensureSvgFilter() {
    if (svgFilter) return;
    var ns = 'http://www.w3.org/2000/svg';
    svgFilter = document.createElementNS(ns, 'svg');
    svgFilter.setAttribute('width', '0');
    svgFilter.setAttribute('height', '0');
    svgFilter.style.position = 'absolute';

    function makeConvolve(kernelMatrix, resultName, inName) {
      var m = document.createElementNS(ns, 'feConvolveMatrix');
      m.setAttribute('order', '3');
      m.setAttribute('kernelMatrix', kernelMatrix);
      m.setAttribute('preserveAlpha', 'true');
      if (inName) m.setAttribute('in', inName);
      if (resultName) m.setAttribute('result', resultName);
      return m;
    }

    function makeLinearComponentTransfer(slope, intercept, inName, resultName) {
      var ct = document.createElementNS(ns, 'feComponentTransfer');
      if (inName) ct.setAttribute('in', inName);
      if (resultName) ct.setAttribute('result', resultName);
      ['feFuncR', 'feFuncG', 'feFuncB'].forEach(function (tag) {
        var fn = document.createElementNS(ns, tag);
        fn.setAttribute('type', 'linear');
        fn.setAttribute('slope', String(slope));
        fn.setAttribute('intercept', String(intercept));
        ct.appendChild(fn);
      });
      return ct;
    }

    function makeGammaComponentTransfer(exponent, inName, resultName) {
      var ct = document.createElementNS(ns, 'feComponentTransfer');
      if (inName) ct.setAttribute('in', inName);
      if (resultName) ct.setAttribute('result', resultName);
      ['feFuncR', 'feFuncG', 'feFuncB'].forEach(function (tag) {
        var fn = document.createElementNS(ns, tag);
        fn.setAttribute('type', 'gamma');
        fn.setAttribute('amplitude', '1');
        fn.setAttribute('exponent', String(exponent));
        fn.setAttribute('offset', '0');
        ct.appendChild(fn);
      });
      return ct;
    }

    function makeDilate(radius, inName, resultName) {
      var m = document.createElementNS(ns, 'feMorphology');
      m.setAttribute('operator', 'dilate');
      m.setAttribute('radius', String(radius));
      if (inName) m.setAttribute('in', inName);
      if (resultName) m.setAttribute('result', resultName);
      return m;
    }

    // Edge detect, optionally blended over a dimmed original.
    // Per-channel gamma expansion (exponent < 1) pulls apart near-black RGB values
    // before the edge kernel runs, so dark-brown/dark-blue-vs-black (small per-channel
    // differences that a linear contrast boost would clip to 0) still produce a
    // detectable edge.
    function makeEdgeDetectFilter(id, dimOriginal) {
      var f = document.createElementNS(ns, 'filter');
      f.setAttribute('id', id);
      f.appendChild(makeGammaComponentTransfer(0.35, 'SourceGraphic', 'contrastBoosted'));
      f.appendChild(makeConvolve('0 -1 0 -1 4 -1 0 -1 0', 'edgesRaw', 'contrastBoosted'));
      f.appendChild(makeDilate(2, 'edgesRaw', 'edges'));
      if (dimOriginal) {
        f.appendChild(makeLinearComponentTransfer(0.05, 0, 'SourceGraphic', 'dim'));
        var blend = document.createElementNS(ns, 'feBlend');
        blend.setAttribute('mode', 'screen');
        blend.setAttribute('in', 'dim');
        blend.setAttribute('in2', 'edges');
        f.appendChild(blend);
      }
      return f;
    }

    svgFilter.appendChild(makeEdgeDetectFilter('night-video-1', false));
    svgFilter.appendChild(makeEdgeDetectFilter('night-video-1-dim', true));

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

    var canvasArea = document.createElement('div');
    canvasArea.style.cssText = 'width:100%;height:calc(100vh - 60px);display:flex;align-items:center;justify-content:center;';

    var canvas = document.createElement('canvas');
    canvas.style.cssText =
      'filter:url(#' + FILTERS[filterIndex].id + ');width:100%;height:100%;object-fit:contain;';
    canvasArea.appendChild(canvas);
    container.appendChild(canvasArea);

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
      canvasMode.timeoutId = setTimeout(draw, 1000 / 16);
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
    if (filterIndex > 0) {
      exitCanvasMode();
      enterCanvasMode();
    } else {
      exitCanvasMode();
    }
    if (button) {
      button.textContent = '📺';
      button.title = FILTERS[filterIndex].title;
    }
  }

  function cycle() {
    filterIndex = (filterIndex + 1) % FILTERS.length;
    saveState();
    apply();
  }

  function init() {
    loadState();
    var poll = setInterval(function () {
      if (window.__userscriptFloatingMenu) {
        clearInterval(poll);
        button = window.__userscriptFloatingMenu.addButton(
          '📺',
          FILTERS[filterIndex].title,
          cycle,
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
