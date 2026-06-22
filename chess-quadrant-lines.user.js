// ==UserScript==
// @name        chess-quadrant-lines
// @description Draw black lines splitting the chess.com board into quadrants
// @version     1.3
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
            line.style.height = THICKNESS;
        } else {
            line.style.width = THICKNESS;
        }
        return line;
    }

    function positionLines(board, hLine, vLine) {
        // Find the actual playing-surface element (the canvas), since the
        // board element itself may include extra space for coordinate
        // labels when they're rendered outside the board.
        const surface = board.querySelector('canvas') || board;

        const boardRect = board.getBoundingClientRect();
        const surfaceRect = surface.getBoundingClientRect();

        // Position/size of the surface, expressed relative to the board
        // element (since the lines are children of `board` and absolutely
        // positioned against it).
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

    function apply() {
        const board = document.querySelector('wc-chess-board');
        if (!board) return;

        let hLine = board.querySelector('#' + LINE_ID_H);
        if (!hLine) {
            hLine = createLine(LINE_ID_H, true);
            board.appendChild(hLine);
        }

        let vLine = board.querySelector('#' + LINE_ID_V);
        if (!vLine) {
            vLine = createLine(LINE_ID_V, false);
            board.appendChild(vLine);
        }

        positionLines(board, hLine, vLine);
    }

    setInterval(apply, 500);
    apply();
})();
