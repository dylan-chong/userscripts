// ==UserScript==
// @name        chess-quadrant-lines
// @description Draw quadrant lines and blur mode for chess.com board
// @version     2.1.0
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

  const LINE_MODES = [
    { title: 'Lines: OFF', thickness: 0 },
    { title: 'Lines: Thin (2px)', thickness: 2 },
    { title: 'Lines: Medium (6px)', thickness: 6 },
    { title: 'Lines: Thick (10px)', thickness: 10 },
  ];

  const BLUR_MODES = [
    { label: 'B', title: 'Blur: OFF', value: 0 },
    { label: 'B', title: 'Blur: Light (2px)', value: 2 },
    { label: 'B', title: 'Blur: Medium (5px)', value: 5 },
    { label: 'B', title: 'Blur: Heavy (10px)', value: 10 },
  ];

  let linesIndex = 2;
  let blurIndex = 0;
  let linesButton = null;
  let blurButton = null;

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var state = JSON.parse(raw);
        if (typeof state.linesIndex === 'number') linesIndex = state.linesIndex;
        if (typeof state.blurIndex === 'number') blurIndex = state.blurIndex;
      }
    } catch (e) {}
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ linesIndex: linesIndex, blurIndex: blurIndex }));
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
    var mode = LINE_MODES[linesIndex];

    if (mode.thickness > 0) {
      if (!hLine) {
        hLine = createLine(LINE_ID_H, true);
        board.appendChild(hLine);
      }
      if (!vLine) {
        vLine = createLine(LINE_ID_V, false);
        board.appendChild(vLine);
      }
      hLine.style.height = mode.thickness + 'px';
      vLine.style.width = mode.thickness + 'px';
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

  function cycleLines() {
    linesIndex = (linesIndex + 1) % LINE_MODES.length;
    saveState();
    applyLines();
    if (linesButton) {
      linesButton.title = LINE_MODES[linesIndex].title;
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
        LINE_MODES[linesIndex].title,
        cycleLines,
        { group: 'chess', sortKey: 20 }
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
