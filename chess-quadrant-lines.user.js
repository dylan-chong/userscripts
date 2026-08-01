// ==UserScript==
// @name        chess-quadrant-lines
// @description Draw quadrant lines and blur mode for chess.com board
// @version     2.0.1
// @match       *://*.chess.com/*
// @run-at      document-idle
// @grant       none
// @updateURL   https://raw.githubusercontent.com/dylan-chong/userscripts/main/chess-quadrant-lines.user.js
// @downloadURL https://raw.githubusercontent.com/dylan-chong/userscripts/main/chess-quadrant-lines.user.js
// ==/UserScript==
(function () {
  const STORAGE_KEY = 'chess_tools_v1';
  const LINE_ID_H = 'quadrant-line-horizontal';
  const LINE_ID_V = 'quadrant-line-vertical';
  const THICKNESS = '6px';

  const BLUR_MODES = [
    { label: 'B', title: 'Blur: OFF', value: 0 },
    { label: 'B', title: 'Blur: Light (2px)', value: 2 },
    { label: 'B', title: 'Blur: Medium (5px)', value: 5 },
    { label: 'B', title: 'Blur: Heavy (10px)', value: 10 },
  ];

  let linesEnabled = true;
  let blurIndex = 0;
  let linesButton = null;
  let blurButton = null;

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var state = JSON.parse(raw);
        if (typeof state.linesEnabled === 'boolean') linesEnabled = state.linesEnabled;
        if (typeof state.blurIndex === 'number') blurIndex = state.blurIndex;
      }
    } catch (e) {}
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ linesEnabled: linesEnabled, blurIndex: blurIndex }));
    } catch (e) {}
  }

  function createLine(id, isHorizontal) {
    const line = document.createElement('div');
    line.id = id;
    Object.assign(line.style, {
      position: 'absolute',
      backgroundColor: 'black',
      pointerEvents: 'none',
      zIndex: '9999',
    });
    if (isHorizontal) {
      line.style.height = THICKNESS;
    } else {
      line.style.width = THICKNESS;
    }
    return line;
  }

  function positionLines(board, hLine, vLine) {
    const surface = board.querySelector('canvas') || board;
    const boardRect = board.getBoundingClientRect();
    const surfaceRect = surface.getBoundingClientRect();
    const left = surfaceRect.left - boardRect.left;
    const top = surfaceRect.top - boardRect.top;
    const width = surfaceRect.width;
    const height = surfaceRect.height;

    Object.assign(hLine.style, {
      left: left + 'px',
      top: (top + height / 2) + 'px',
      width: width + 'px',
      transform: 'translateY(-50%)',
    });

    Object.assign(vLine.style, {
      top: top + 'px',
      left: (left + width / 2) + 'px',
      height: height + 'px',
      transform: 'translateX(-50%)',
    });
  }

  function applyLines() {
    const board = document.querySelector('wc-chess-board');
    if (!board) return;

    let hLine = board.querySelector('#' + LINE_ID_H);
    let vLine = board.querySelector('#' + LINE_ID_V);

    if (linesEnabled) {
      if (!hLine) {
        hLine = createLine(LINE_ID_H, true);
        board.appendChild(hLine);
      }
      if (!vLine) {
        vLine = createLine(LINE_ID_V, false);
        board.appendChild(vLine);
      }
      hLine.style.display = '';
      vLine.style.display = '';
      positionLines(board, hLine, vLine);
    } else {
      if (hLine) hLine.style.display = 'none';
      if (vLine) vLine.style.display = 'none';
    }
  }

  function applyBlur() {
    const board = document.querySelector('wc-chess-board');
    if (!board) return;
    var mode = BLUR_MODES[blurIndex];
    board.style.filter = mode.value > 0 ? 'blur(' + mode.value + 'px)' : '';
  }

  function toggleLines() {
    linesEnabled = !linesEnabled;
    saveState();
    applyLines();
    if (linesButton) {
      linesButton.title = linesEnabled ? 'Quadrant Lines: ON' : 'Quadrant Lines: OFF';
      linesButton._targetOpacity = linesEnabled ? '1' : '0.5';
      linesButton.style.opacity = linesButton._targetOpacity;
    }
  }

  function cycleBlur() {
    blurIndex = (blurIndex + 1) % BLUR_MODES.length;
    saveState();
    applyBlur();
    if (blurButton) {
      blurButton.title = BLUR_MODES[blurIndex].title;
    }
  }

  function registerButtons() {
    function doRegister() {
      var menu = window.__userscriptFloatingMenu;
      if (!menu) return false;

      linesButton = menu.addButton(
        '+',
        linesEnabled ? 'Quadrant Lines: ON' : 'Quadrant Lines: OFF',
        toggleLines,
        { group: 'chess', sortKey: 20, opacity: linesEnabled ? '1' : '0.5' }
      );

      blurButton = menu.addButton(
        'B',
        BLUR_MODES[blurIndex].title,
        cycleBlur,
        { group: 'chess', sortKey: 21 }
      );
      return true;
    }

    if (!doRegister()) {
      var poll = setInterval(function () {
        if (doRegister()) clearInterval(poll);
      }, 200);
    }
  }

  function init() {
    loadState();
    registerButtons();
    setInterval(function () {
      applyLines();
      applyBlur();
    }, 500);
    applyLines();
    applyBlur();
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
