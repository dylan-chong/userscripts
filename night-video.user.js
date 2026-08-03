// ==UserScript==
// @name        night-video
// @description Fullscreen video filters (edge detect, sharpen, grayscale, emboss) for OLED night viewing
// @version     1.2.2
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
    { id: 'night-video-2', title: 'Night Video: Sharpen + Dim' },
    { id: 'night-video-3', title: 'Night Video: High Contrast Gray' },
    { id: 'night-video-4', title: 'Night Video: Edges + Dim Original' },
    { id: 'night-video-5', title: 'Night Video: Emboss' },
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

    function makeDilate(radius, inName, resultName) {
      var m = document.createElementNS(ns, 'feMorphology');
      m.setAttribute('operator', 'dilate');
      m.setAttribute('radius', String(radius));
      if (inName) m.setAttribute('in', inName);
      if (resultName) m.setAttribute('result', resultName);
      return m;
    }

    // Filter 1: Edge detect
    var f1 = document.createElementNS(ns, 'filter');
    f1.setAttribute('id', 'night-video-1');
    f1.appendChild(makeConvolve('0 -1 0 -1 4 -1 0 -1 0', 'edges'));
    f1.appendChild(makeDilate(2, 'edges'));
    svgFilter.appendChild(f1);

    // Filter 2: Sharpen + dim
    var f2 = document.createElementNS(ns, 'filter');
    f2.setAttribute('id', 'night-video-2');
    f2.appendChild(makeConvolve('0 -1 0 -1 6 -1 0 -1 0', 'sharpened'));
    f2.appendChild(makeDilate(1, 'sharpened'));
    f2.appendChild(makeLinearComponentTransfer(0.3, 0));
    svgFilter.appendChild(f2);

    // Filter 3: High contrast grayscale
    var f3 = document.createElementNS(ns, 'filter');
    f3.setAttribute('id', 'night-video-3');
    var saturate = document.createElementNS(ns, 'feColorMatrix');
    saturate.setAttribute('type', 'saturate');
    saturate.setAttribute('values', '0');
    f3.appendChild(saturate);
    f3.appendChild(makeLinearComponentTransfer(2, -0.4));
    f3.appendChild(makeLinearComponentTransfer(0.4, 0));
    svgFilter.appendChild(f3);

    // Filter 4: Edges blended with dim original
    var f4 = document.createElementNS(ns, 'filter');
    f4.setAttribute('id', 'night-video-4');
    f4.appendChild(makeLinearComponentTransfer(0.25, 0, 'SourceGraphic', 'dim'));
    f4.appendChild(makeConvolve('0 -1 0 -1 4 -1 0 -1 0', 'edgesRaw', 'SourceGraphic'));
    f4.appendChild(makeDilate(2, 'edgesRaw', 'edges'));
    var blend = document.createElementNS(ns, 'feBlend');
    blend.setAttribute('mode', 'screen');
    blend.setAttribute('in', 'dim');
    blend.setAttribute('in2', 'edges');
    f4.appendChild(blend);
    svgFilter.appendChild(f4);

    // Filter 5: Emboss
    var f5 = document.createElementNS(ns, 'filter');
    f5.setAttribute('id', 'night-video-5');
    f5.appendChild(makeConvolve('-2 -1 0 -1 1 1 0 1 2', 'embossed'));
    f5.appendChild(makeDilate(1, 'embossed'));
    svgFilter.appendChild(f5);

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
    canvas.style.cssText =
      'filter:url(#' + FILTERS[filterIndex].id + ');max-width:100vw;max-height:calc(100vh - 60px);';
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
