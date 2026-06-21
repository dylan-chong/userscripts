// ==UserScript==
// @name        chess-quadrant-lines
// @description Draw black lines splitting the chess.com board into quadrants
// @version     1.2
// @match       *://*.chess.com/*
// @updateURL   https://raw.githubusercontent.com/dylan-chong/userscripts/main/chess-quadrant-lines.user.js
// @downloadURL https://raw.githubusercontent.com/dylan-chong/userscripts/main/chess-quadrant-lines.user.js
// ==/UserScript==

(function () {
    const LINE_ID_H = 'quadrant-line-horizontal';
    const LINE_ID_V = 'quadrant-line-vertical';
    const THICKNESS = '6px';

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
            Object.assign(line.style, {
                left: '0',
                top: '50%',
                width: '100%',
                height: THICKNESS,
                transform: 'translateY(-50%)',
            });
        } else {
            Object.assign(line.style, {
                top: '0',
                left: '50%',
                width: THICKNESS,
                height: '100%',
                transform: 'translateX(-50%)',
            });
        }
        return line;
    }

    function apply() {
        const board = document.querySelector('wc-chess-board');
        if (!board) return;

        if (!board.querySelector('#' + LINE_ID_H)) {
            board.appendChild(createLine(LINE_ID_H, true));
        }
        if (!board.querySelector('#' + LINE_ID_V)) {
            board.appendChild(createLine(LINE_ID_V, false));
        }
    }

    setInterval(apply, 500);
    apply();
})();
