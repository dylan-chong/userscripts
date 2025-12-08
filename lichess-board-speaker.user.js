// ==UserScript==
// @name        lichess-board-speaker
// @description This is your new file, start writing code
// @match       *://lichess.org/*
// @grant          none
// @inject-into    content
// ==/UserScript==

// Example board from lichess puzzle page
// <cg-container style="width: 156px; height: 156px;">
//     <cg-board>
//         <square class="last-move" style="transform: translate(39px, 39px);"></square>
//         <square class="last-move" style="transform: translate(58.5px, 19.5px);"></square>
//         <piece class="black rook" style="transform: translate(136.5px, 136.5px);"></piece>
//         <piece class="black bishop" style="transform: translate(39px, 136.5px);"></piece>
//         <piece class="white rook" style="transform: translate(19.5px, 136.5px);"></piece>
//         <piece class="black king" style="transform: translate(58.5px, 117px);"></piece>
//         <piece class="black pawn" style="transform: translate(136.5px, 97.5px);"></piece>
//         <piece class="black pawn" style="transform: translate(39px, 97.5px);"></piece>
//         <piece class="white queen" style="transform: translate(19.5px, 97.5px);"></piece>
//         <piece class="black bishop" style="transform: translate(117px, 78px);"></piece>
//         <piece class="black pawn" style="transform: translate(97.5px, 78px);"></piece>
//         <piece class="black pawn" style="transform: translate(58.5px, 78px);"></piece>
//         <piece class="black pawn" style="transform: translate(78px, 58.5px);"></piece>
//         <piece class="white pawn" style="transform: translate(58.5px, 58.5px);"></piece>
//         <piece class="white rook" style="transform: translate(19.5px, 39px);"></piece>
//         <piece class="white pawn" style="transform: translate(97.5px, 19.5px);"></piece>
//         <piece class="white bishop" style="transform: translate(78px, 19.5px);"></piece>
//         <piece class="white king" style="transform: translate(39px, 39px);"></piece>
//         <piece class="white pawn" style="transform: translate(39px, 19.5px);"></piece>
//         <piece class="white pawn" style="transform: translate(19.5px, 19.5px);"></piece>
//         <piece class="black queen" style="transform: translate(136.5px, 0px);"></piece>
//         <piece class="white knight" style="transform: translate(19.5px, 0px);"></piece>
//     </cg-board>
// </cg-container>

(function() {
  const SILENT_PAUSE = '... wait ...';
  const SPEAK_RATES = [
    0.2,
    0.5,
    0.7,
    1.0,
    1.1,
    1.2,
  ]
  const SPEAK_RATE_COMMAND = 'sr';
  let currentSpeakRateIndex = 1;

  const PARALLAX_ANGLES = [0, 20, 40, 50, 60, 65, 70, 80];
  const PARALLAX_COMMAND = 'px';
  let currentParallaxIndex = 0;

  const DIVIDERS_COMMAND = 'div';
  let dividersEnabled = false;

  const PIECE_STYLES = ['default', 'checker', 'sized-checkers'];
  const PIECE_STYLE_COMMAND = 'ps';
  let currentPieceStyleIndex = 0;

  const HOVER_MODE_COMMAND = 'hv';
  const HOVER_OSCILLATION_ANGLE = 1.5;
  const HOVER_OSCILLATION_PERIOD_MS = 2000;
  const HOVER_OSCILLATION_Y_ANGLE = 1.5;
  const HOVER_OSCILLATION_Y_PERIOD_MS = 2500;
  const HOVER_MODES = ['off', 'x-only', 'x-and-y'];
  let currentHoverModeIndex = 0;
  let hoverAnimationId = null;
  let hoverStartTime = null;

  const SETTINGS_KEY = 'lichess-board-speaker-settings';

  function saveSettings() {
    const settings = {
      speakRateIndex: currentSpeakRateIndex,
      parallaxIndex: currentParallaxIndex,
      dividersEnabled: dividersEnabled,
      pieceStyleIndex: currentPieceStyleIndex,
      hoverModeIndex: currentHoverModeIndex,
    };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    console.debug('[lichess-board-speaker] settings saved', settings);
  }

  function loadSettings() {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      if (!stored) return;

      const settings = JSON.parse(stored);

      if (settings.speakRateIndex !== undefined) {
        currentSpeakRateIndex = settings.speakRateIndex;
      }
      if (settings.parallaxIndex !== undefined) {
        currentParallaxIndex = settings.parallaxIndex;
      }
      if (settings.dividersEnabled !== undefined) {
        dividersEnabled = settings.dividersEnabled;
      }
      if (settings.pieceStyleIndex !== undefined) {
        currentPieceStyleIndex = settings.pieceStyleIndex;
      }
      if (settings.hoverModeIndex !== undefined) {
        currentHoverModeIndex = settings.hoverModeIndex;
      } else if (settings.hoverModeEnabled !== undefined) {
        currentHoverModeIndex = settings.hoverModeEnabled ? 1 : 0;
      }

      console.debug('[lichess-board-speaker] settings loaded', settings);
    } catch (error) {
      console.error('[lichess-board-speaker] failed to load settings', error);
    }
  }

  function updateButtonLabels() {
    const speakRateButton = commandButtons[formatCommand(SPEAK_RATE_COMMAND)];
    if (speakRateButton) {
      speakRateButton.innerText = formatSpeakRateButtonText({ withSuffix: true });
    }

    const parallaxButton = commandButtons[formatCommand(PARALLAX_COMMAND)];
    if (parallaxButton) {
      parallaxButton.innerText = formatParallaxButtonText({ withSuffix: true });
    }

    const dividersButton = commandButtons[formatCommand(DIVIDERS_COMMAND)];
    if (dividersButton) {
      dividersButton.innerText = formatDividersButtonText({ withSuffix: true });
    }

    const pieceStyleButton = commandButtons[formatCommand(PIECE_STYLE_COMMAND)];
    if (pieceStyleButton) {
      pieceStyleButton.innerText = formatPieceStyleButtonText({ withSuffix: true });
    }

    const hoverModeButton = commandButtons[formatCommand(HOVER_MODE_COMMAND)];
    if (hoverModeButton) {
      hoverModeButton.innerText = formatHoverModeButtonText({ withSuffix: true });
    }
  }

  function applyLoadedSettings() {
    if (currentParallaxIndex > 0) {
      applyParallaxTransform();
    }

    if (dividersEnabled) {
      drawDividers();
    }

    if (currentHoverModeIndex > 0) {
      startHoverMode();
    }
  }

  function formatSpeakRateButtonText({ withSuffix }) {
    const suffix = withSuffix ? ` (${formatCommand(SPEAK_RATE_COMMAND)})` : '';
    return `Speak rate (${SPEAK_RATES[currentSpeakRateIndex]}) ${suffix}`;
  }

  function formatParallaxButtonText({ withSuffix }) {
    const suffix = withSuffix ? ` (${formatCommand(PARALLAX_COMMAND)})` : '';
    return `Parallax (req kb) (${PARALLAX_ANGLES[currentParallaxIndex]}°) ${suffix}`;
  }

  function formatDividersButtonText({ withSuffix }) {
    const suffix = withSuffix ? ` (${formatCommand(DIVIDERS_COMMAND)})` : '';
    const status = dividersEnabled ? 'ON' : 'OFF';
    return `Dividers (${status}) ${suffix}`;
  }

  function formatPieceStyleButtonText({ withSuffix }) {
    const suffix = withSuffix ? ` (${formatCommand(PIECE_STYLE_COMMAND)})` : '';
    return `Piece style (${PIECE_STYLES[currentPieceStyleIndex]}) ${suffix}`;
  }

  function formatHoverModeButtonText({ withSuffix }) {
    const suffix = withSuffix ? ` (${formatCommand(HOVER_MODE_COMMAND)})` : '';
    const status = HOVER_MODES[currentHoverModeIndex];
    return `Hover mode (${status}) ${suffix}`;
  }

  const COMMAND_PREFIX = 'p';
  const COMMANDS = {
    a: {
      fullName: 'Speak all pieces',
      exec: () => generateFullMessagesAndSpeak(() => true)
    },

    wk: {
      fullName: "Speak w's k-side",
      exec: () => generateFullMessagesAndSpeak(({ col, row }) => col >= 5 && row <= 4)
    },
    wq: {
      fullName: "Speak w's q-side",
      exec: () => generateFullMessagesAndSpeak(({ col, row }) => col <= 4 && row <= 4)
    },
    bk: {
      fullName: "Speak b's k-side",
      exec: () => generateFullMessagesAndSpeak(({ col, row }) => col >= 5 && row >= 5)
    },
    bq: {
      fullName: "Speak b's q-side",
      exec: () => generateFullMessagesAndSpeak(({ col, row }) => col <= 4 && row >= 5)
    },

    ww: {
      fullName: "Speak w's pieces",
      exec: () => generateFullMessagesAndSpeak(({ row }) => row <= 4)
    },
    bb: {
      fullName: "Speak b's pieces",
      exec: () => generateFullMessagesAndSpeak(({ row }) => row >= 5)
    },

    [SPEAK_RATE_COMMAND]: {
      fullName: formatSpeakRateButtonText({ withSuffix: false }),
      exec: () => changeSpeakRate(),
    },
    ss: {
      fullName: 'Stop speaking',
      exec: () => window.speechSynthesis.cancel()
    },

    l: {
      fullName: 'List pieces',
      exec: displayPiecesList
    },

    "-annotate": {
      fullName: 'Annotate board',
      exec: setExampleAnnotation
    },

    // View related commands
    [PARALLAX_COMMAND]: {
      fullName: formatParallaxButtonText({ withSuffix: false }),
      exec: () => toggleParallax(),
    },
    [DIVIDERS_COMMAND]: {
      fullName: formatDividersButtonText({ withSuffix: false }),
      exec: () => toggleDividers(),
    },
    [PIECE_STYLE_COMMAND]: {
      fullName: formatPieceStyleButtonText({ withSuffix: false }),
      exec: () => togglePieceStyle(),
    },
    [HOVER_MODE_COMMAND]: {
      fullName: formatHoverModeButtonText({ withSuffix: false }),
      exec: () => toggleHoverMode(),
    },
  };

  const commandButtons = {};

  function formatCommand(commandName) {
    return `${COMMAND_PREFIX}${commandName}`;
  }

  const COMMANDS_WITH_PREFIX = Object.fromEntries(
    Object
      .entries(COMMANDS)
      .map(([name, command]) => [formatCommand(name), command])
  );

  const DRAWING_COLOR = '#ff6b6b';

  function parseSquare(square) {
    if (square.length !== 2) return null;
    const file = square[0];
    const rank = square[1];
    if (file < 'a' || file > 'h' || rank < '1' || rank > '8') return null;
    return { file, rank };
  }

  function parseDrawingCommand(command) {
    if (!command.startsWith('-')) return null;

    const content = command.substring(1);
    const parts = content.split(',');
    const circles = [];
    const arrows = [];

    for (const part of parts) {
      if (part.length === 2) {
        // Single square - circle
        const square = parseSquare(part);
        if (square) circles.push(square);
      } else if (part.length === 4) {
        // Four characters - arrow
        const from = parseSquare(part.substring(0, 2));
        const to = parseSquare(part.substring(2, 4));
        if (from && to) arrows.push({ from, to });
      } else if (part.length === 3) {
        // Three characters - circle the first two, ignore the third
        const square = parseSquare(part.substring(0, 2));
        if (square) circles.push(square);
      }
      // Ignore invalid parts
    }

    return { circles, arrows };
  }

  function squareToCoordinates(square, boardSize, isFlipped) {
    const fileIndex = square.file.charCodeAt(0) - 'a'.charCodeAt(0);
    const rankIndex = parseInt(square.rank) - 1;

    let x, y;
    if (isFlipped) {
      x = (7 - fileIndex) * boardSize / 8 + boardSize / 16;
      y = rankIndex * boardSize / 8 + boardSize / 16;
    } else {
      x = fileIndex * boardSize / 8 + boardSize / 16;
      y = (7 - rankIndex) * boardSize / 8 + boardSize / 16;
    }

    return { x, y };
  }

  function createOrGetSVG() {
    let svg = document.querySelector('cg-container svg.userscript-drawings');
    if (!svg) {
      const container = document.querySelector('cg-container');
      if (!container) return null;

      svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.classList.add('userscript-drawings')
      svg.style.position = 'absolute';
      svg.style.top = '0';
      svg.style.left = '0';
      svg.style.width = '100%';
      svg.style.height = '100%';
      svg.style.pointerEvents = 'none';
      svg.style.zIndex = '10';

      container.appendChild(svg);
    }
    return svg;
  }

  function clearDrawings() {
    const svg = document.querySelector('cg-container svg.userscript-drawings');
    if (svg) {
      svg.innerHTML = '';
    }
  }

  function drawCircle(svg, x, y, boardSize) {
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', x);
    circle.setAttribute('cy', y);
    circle.setAttribute('r', boardSize / 16);
    circle.setAttribute('fill', 'none');
    circle.setAttribute('stroke', DRAWING_COLOR);
    circle.setAttribute('stroke-width', '3');
    circle.setAttribute('opacity', '0.8');
    svg.appendChild(circle);
  }

  function drawArrow(svg, x1, y1, x2, y2, boardSize) {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const arrowLength = boardSize / 20;
    const arrowAngle = Math.PI / 6;

    // Calculate the arrowhead points first
    const arrowX1 = x2 - arrowLength * Math.cos(angle - arrowAngle);
    const arrowY1 = y2 - arrowLength * Math.sin(angle - arrowAngle);
    const arrowX2 = x2 - arrowLength * Math.cos(angle + arrowAngle);
    const arrowY2 = y2 - arrowLength * Math.sin(angle + arrowAngle);

    // Shorten the line so it ends at the base of the arrowhead
    const lineEndX = x2 - (arrowLength * 0.7) * Math.cos(angle);
    const lineEndY = y2 - (arrowLength * 0.7) * Math.sin(angle);

    // Draw the line (now shortened)
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x1);
    line.setAttribute('y1', y1);
    line.setAttribute('x2', lineEndX);
    line.setAttribute('y2', lineEndY);
    line.setAttribute('stroke', DRAWING_COLOR);
    line.setAttribute('stroke-width', '4');
    line.setAttribute('stroke-linecap', 'round');
    line.setAttribute('opacity', '0.8');
    svg.appendChild(line);

    // Draw arrowhead at the original end point
    const arrowhead = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    arrowhead.setAttribute('points', `${x2},${y2} ${arrowX1},${arrowY1} ${arrowX2},${arrowY2}`);
    arrowhead.setAttribute('fill', DRAWING_COLOR);
    arrowhead.setAttribute('opacity', '0.8');
    svg.appendChild(arrowhead);
  }

  function updateDrawings(command) {
    clearDrawings();

    const drawingData = parseDrawingCommand(command);
    if (!drawingData) return;

    const svg = createOrGetSVG();
    if (!svg) return;

    const container = document.querySelector('cg-container');
    const boardSize = container.offsetWidth;
    const isFlipped = !isPlayerWhite();

    // Draw circles
    for (const square of drawingData.circles) {
      const coords = squareToCoordinates(square, boardSize, isFlipped);
      drawCircle(svg, coords.x, coords.y, boardSize);
    }

    // Draw arrows
    for (const arrow of drawingData.arrows) {
      const fromCoords = squareToCoordinates(arrow.from, boardSize, isFlipped);
      const toCoords = squareToCoordinates(arrow.to, boardSize, isFlipped);
      drawArrow(svg, fromCoords.x, fromCoords.y, toCoords.x, toCoords.y, boardSize);
    }
  }

  function calculatePiecePosition(transform, squareSize, playerIsWhite) {
    const match = transform.match(/translate\(([\d.]+)px(?:,\s*([\d.]+)px)?\)/);
    if (!match) return null;

    let col = Math.floor(parseFloat(match[1]) / squareSize);
    let row = Math.floor(parseFloat(match[2] || 0) / squareSize);

    if (playerIsWhite) {
      row = 7 - row;
    } else {
      col = 7 - col;
    }

    return { col: col + 1, row: row + 1 };
  }

  function getPiecePositions(playerIsWhite) {
    const pieces = document.querySelectorAll('cg-board piece');
    const squareSize = document.querySelector('cg-board').offsetWidth / 8;

    return Array.from(pieces)
      .map(piece => {
        const position = calculatePiecePosition(piece.style.transform, squareSize, playerIsWhite);
        if (!position) return null;

        const pieceString = piece.className;
        const [_match, colour, type] = pieceString.match(/^(white|black)\s+(king|queen|rook|bishop|knight|pawn)$/) || [];
        if (!colour || !type) return null;

        const { col, row } = position;
        return {
          type,
          colour,
          col,
          colLetter: 'abcdefgh'[col - 1],
          row
        };
      })
      .filter(piece => piece);
  }

  function sortPieces(piecePositions) {
    return piecePositions.toSorted((a, b) => {
      if (a.col !== b.col) {
        return a.col - b.col;
      }
      return a.row - b.row;
    });
  }

  function generateSpeakablePosition({ colLetter, row }) {
    return `"${colLetter}" "${row}"`
  }

  function generateDisplayablePosition({ colLetter, row }) {
    return `${colLetter}${row}`
  }

  function generateSinglePositionMessage(piece) {
    const { colour, type } = piece;
    return [
      `${generateSpeakablePosition(piece)} ${colour} ${type}`,
      SILENT_PAUSE
    ];
  }

  function generateMessagesFromGroups(piecesGroupedByColourGroupedByType) {
    return Object
      .entries(piecesGroupedByColourGroupedByType)
      .flatMap(([colour, piecesGroupedByType]) => {
        return Object
          .entries(piecesGroupedByType)
          .flatMap(([type, pieces]) => {
            if (pieces.length === 0) return [];
            if (pieces.length === 1) return generateSinglePositionMessage(pieces[0]);

            const positions = pieces.map(generateSpeakablePosition).join(', ');
            return [
              `${colour} ${type}s on ${positions}`,
              SILENT_PAUSE,
              SILENT_PAUSE
            ]
          })
      });
  }

  function generateDisplayTextFromGroups(piecesGroupedByColourGroupedByType) {
    return Object
      .entries(piecesGroupedByColourGroupedByType)
      .flatMap(([colour, piecesGroupedByType]) => {
        const prefix = `${colour.toUpperCase()}:`;
        const textLinesForColour = Object
          .entries(piecesGroupedByType)
          .flatMap(([type, pieces]) => {
            if (pieces.length === 0) return [];

            const positions = pieces.map(generateDisplayablePosition).join(', ');
            return [
              `${type}: ${positions}`,
            ]
          });
        return [prefix, ...textLinesForColour, ''];
      });
  }

  function speakString(str, options = {}) {
    const utt = new SpeechSynthesisUtterance(str);
    utt.rate = SPEAK_RATES[currentSpeakRateIndex];
    Object.assign(utt, options)
    window.speechSynthesis.speak(utt);
    return utt;
  }

  function speakMessages(msgs) {
    console.debug('[lichess-board-speaker] speaking messages: ', msgs.join('\n'));

    msgs.forEach(msg => {
      speakString(msg, { volume: msg === SILENT_PAUSE ? 0 : 1 });
    });
  }

  function isPlayerWhite() {
    return Array.from(document.querySelector('coords').classList).indexOf('black') === -1;
  }

  function groupPiecesByColourAndType(pieces) {
    pieces = sortPieces(pieces);

    let piecesGroupedByColour = {
      white: pieces.filter(p => p.colour === 'white'),
      black: pieces.filter(p => p.colour === 'black'),
    };

    return {
      white: {
        pawn: piecesGroupedByColour.white.filter(p => p.type === 'pawn'),
        knight: piecesGroupedByColour.white.filter(p => p.type === 'knight'),
        bishop: piecesGroupedByColour.white.filter(p => p.type === 'bishop'),
        rook: piecesGroupedByColour.white.filter(p => p.type === 'rook'),
        queen: piecesGroupedByColour.white.filter(p => p.type === 'queen'),
        king: piecesGroupedByColour.white.filter(p => p.type === 'king'),
      },
      black: {
        pawn: piecesGroupedByColour.black.filter(p => p.type === 'pawn'),
        knight: piecesGroupedByColour.black.filter(p => p.type === 'knight'),
        bishop: piecesGroupedByColour.black.filter(p => p.type === 'bishop'),
        rook: piecesGroupedByColour.black.filter(p => p.type === 'rook'),
        queen: piecesGroupedByColour.black.filter(p => p.type === 'queen'),
        king: piecesGroupedByColour.black.filter(p => p.type === 'king'),
      }
    };
  }

  function generateFullMessages(filter) {
    const playerIsWhite = isPlayerWhite();
    const playerColourMsg = `You are ${playerIsWhite ? 'white' : 'black'}`;

    let pieces = getPiecePositions(playerIsWhite);
    pieces = pieces.filter(filter);

    const piecesGrouped = groupPiecesByColourAndType(pieces);
    const pieceMessages = generateMessagesFromGroups(piecesGrouped);

    return [playerColourMsg, ...pieceMessages];
  }

  function findPossibleCommandMatch(inputString) {
    const possibleCommandStrings = Object.keys(COMMANDS_WITH_PREFIX);
    return possibleCommandStrings.find(cs => cs.startsWith(inputString));
  }

  function setExampleAnnotation() {
    getMoveInput().value = "-e5f6,g7f6"
  }

  function removeWrongOnInput(moveInput) {
    const value = moveInput.value;

    // Handle drawing commands
    if (value.startsWith('-')) {
      updateDrawings(value);
      moveInput.classList.remove('wrong');
      return;
    }

    clearDrawings();

    // Handle regular commands
    const possibleCommand = findPossibleCommandMatch(value);
    if (!possibleCommand) return;
    moveInput.classList.remove('wrong');
  }

  function userInputChanged(moveInput) {
    const value = moveInput.value;

    // Handle drawing commands
    if (value.startsWith('-')) {
      updateDrawings(value);
      return;
    }

    // Handle regular commands
    const command = COMMANDS_WITH_PREFIX[value];
    if (!command) return;

    console.debug('[lichess-board-speaker] command triggered', { value });
    moveInput.value = '';
    clearDrawings();

    command.exec();
  }

  function createButtonContainer(parentContainer) {
    const container = document.createElement('div');
    container.style.marginLeft = '8px';
    container.style.maxHeight = '50px'; // don't shift text input down (it centres veritcally)
    parentContainer.appendChild(container);
    return container;
  }

  function createButtons(container) {
    Object
      .keys(COMMANDS_WITH_PREFIX)
      .map(createCommandButton)
      .map(button => container.appendChild(button));
  }

  function generateFullMessagesAndSpeak(filter) {
    const msgs = generateFullMessages(filter);
    speakMessages(msgs);
  }

  function changeSpeakRate() {
    window.speechSynthesis.cancel();

    currentSpeakRateIndex = (currentSpeakRateIndex + 1) % SPEAK_RATES.length;

    const button = commandButtons[formatCommand(SPEAK_RATE_COMMAND)];
    button.innerText = formatSpeakRateButtonText({ withSuffix: true });

    const suffix = currentSpeakRateIndex === SPEAK_RATES.length - 1 ? ' max' : '';

    saveSettings();

    setTimeout(() => {
      speakString('Rate ' + SPEAK_RATES[currentSpeakRateIndex] + suffix);
    }, 0);
  }

  let parallaxObserver = null;
  let resizeObserver = null;
  let clonedBoard = null;

  function createOrGetClonedBoard() {
    if (clonedBoard) return clonedBoard;

    const container = document.querySelector('cg-container');
    const board = document.querySelector('cg-board');
    if (!container || !board) return null;

    container.style.position = 'relative';

    clonedBoard = document.createElement('cg-board');
    clonedBoard.classList.add('userscript-parallax-clone');

    const computedStyle = window.getComputedStyle(board);
    clonedBoard.style.position = 'absolute';
    clonedBoard.style.top = '0';
    clonedBoard.style.left = '0';
    clonedBoard.style.width = computedStyle.width;
    clonedBoard.style.height = computedStyle.height;
    clonedBoard.style.pointerEvents = 'none';
    clonedBoard.style.zIndex = '100';
    clonedBoard.style.visibility = 'visible';
    clonedBoard.style.display = 'block';

    container.appendChild(clonedBoard);
    return clonedBoard;
  }

  function createCheckerPiece(color, sizePercent = 80) {
    const container = document.createElement('div');
    container.style.width = `${sizePercent}%`;
    container.style.height = `${sizePercent}%`;
    container.style.position = 'absolute';
    const offset = (100 - sizePercent) / 2;
    container.style.top = `${offset}%`;
    container.style.left = `${offset}%`;
    container.style.transformStyle = 'preserve-3d';

    const baseColor = color === 'white' ? '#e8e8e8' : '#1a1a1a';
    const darkColor = color === 'white' ? '#999999' : '#000000';
    const lightColor = color === 'white' ? '#ffffff' : '#333333';
    const thickness = 8;

    for (let i = 0; i < thickness; i++) {
      const layer = document.createElement('div');
      layer.style.width = '100%';
      layer.style.height = '100%';
      layer.style.position = 'absolute';
      layer.style.borderRadius = '50%';
      layer.style.transform = `translateZ(${i}px)`;

      const gradientStart = i === thickness - 1 ? lightColor : baseColor;
      const gradientEnd = i === 0 ? darkColor : baseColor;

      layer.style.background = `radial-gradient(circle at 30% 30%, ${gradientStart}, ${gradientEnd})`;

      if (i === 0) {
        layer.style.boxShadow = '0 2px 8px rgba(0,0,0,0.5)';
      }

      if (i === thickness - 1) {
        layer.style.border = `2px solid ${color === 'white' ? '#ffffff' : '#555555'}`;
        layer.style.boxSizing = 'border-box';
      }

      container.appendChild(layer);
    }

    return container;
  }

  function updateClonedBoard() {
    if (!clonedBoard) return;

    const board = document.querySelector('cg-board');
    if (!board) return;

    clonedBoard.innerHTML = board.innerHTML;
    clonedBoard.style.transformStyle = 'preserve-3d';

    const pieceStyle = PIECE_STYLES[currentPieceStyleIndex];
    if (pieceStyle === 'checker' || pieceStyle === 'sized-checkers') {
      const pieces = clonedBoard.querySelectorAll('piece');
      pieces.forEach(piece => {
        const classes = piece.className;
        const isWhite = classes.includes('white');
        const color = isWhite ? 'white' : 'black';

        let sizePercent;
        if (pieceStyle === 'checker') {
          sizePercent = 56;
        } else {
          const isPawn = classes.includes('pawn');
          const isQueen = classes.includes('queen');
          const isKing = classes.includes('king');

          if (isPawn) {
            sizePercent = 40;
          } else if (isQueen || isKing) {
            sizePercent = 80;
          } else {
            sizePercent = 58.5;
          }
        }

        piece.innerHTML = '';
        piece.style.background = 'none';
        piece.style.transformStyle = 'preserve-3d';

        const checker = createCheckerPiece(color, sizePercent);
        piece.appendChild(checker);
      });
    }
  }

  function removeClonedBoard() {
    if (clonedBoard) {
      clonedBoard.remove();
      clonedBoard = null;
    }
  }

  function handleContainerResize() {
    if (!clonedBoard) return;

    const board = document.querySelector('cg-board');
    if (!board) return;

    const computedStyle = window.getComputedStyle(board);
    clonedBoard.style.width = computedStyle.width;
    clonedBoard.style.height = computedStyle.height;

    updateClonedBoard();

    if (dividersEnabled) {
      drawDividers();
    }
  }

  function calculateScaleForAngle(angleDegrees) {
    const angleRadians = angleDegrees * Math.PI / 180;
    const cosValue = Math.cos(angleRadians);
    return Math.pow(cosValue, 0.5);
  }

  function applyParallaxTransform() {
    const board = document.querySelector('cg-board');
    if (!board) return;

    const angle = PARALLAX_ANGLES[currentParallaxIndex];

    if (angle === 0) {
      board.style.visibility = '';
      removeClonedBoard();

      if (parallaxObserver) {
        parallaxObserver.disconnect();
        parallaxObserver = null;
      }

      if (resizeObserver) {
        resizeObserver.disconnect();
        resizeObserver = null;
      }

      if (currentHoverModeIndex > 0) {
        currentHoverModeIndex = 0;
        const button = commandButtons[formatCommand(HOVER_MODE_COMMAND)];
        if (button) {
          button.innerText = formatHoverModeButtonText({ withSuffix: true });
        }
        stopHoverMode();
      }
    } else {
      board.style.visibility = 'hidden';

      const clone = createOrGetClonedBoard();
      if (!clone) return;

      updateClonedBoard();

      clone.style.transformStyle = 'preserve-3d';

      if (currentHoverModeIndex === 0) {
        const scale = calculateScaleForAngle(angle);
        clone.style.transform = `perspective(1000px) rotateX(${angle}deg) scale(${scale})`;
      }

      clone.style.transformOrigin = 'center center';

      setupParallaxMoveObserver();

      if (currentHoverModeIndex > 0) {
        hoverStartTime = null;
      }
    }
  }

  function setupParallaxMoveObserver() {
    if (parallaxObserver) {
      parallaxObserver.disconnect();
    }

    const board = document.querySelector('cg-board');
    if (!board) return;

    parallaxObserver = new MutationObserver(() => {
      updateClonedBoard();
    });

    parallaxObserver.observe(board, {
      childList: true,
      attributes: true,
      subtree: true
    });

    if (resizeObserver) {
      resizeObserver.disconnect();
    }

    const container = document.querySelector('cg-container');
    if (!container) return;

    resizeObserver = new ResizeObserver(() => {
      handleContainerResize();
    });

    resizeObserver.observe(container);
  }

  function toggleParallax() {
    currentParallaxIndex = (currentParallaxIndex + 1) % PARALLAX_ANGLES.length;

    const button = commandButtons[formatCommand(PARALLAX_COMMAND)];
    button.innerText = formatParallaxButtonText({ withSuffix: true });

    applyParallaxTransform();
    saveSettings();
  }

  function animateHoverMode(timestamp) {
    if (currentHoverModeIndex === 0) return;

    if (!hoverStartTime) {
      hoverStartTime = timestamp;
    }

    const elapsed = timestamp - hoverStartTime;
    const baseAngle = PARALLAX_ANGLES[currentParallaxIndex];
    const oscillationX = Math.sin(elapsed / HOVER_OSCILLATION_PERIOD_MS) * HOVER_OSCILLATION_ANGLE;
    const angleX = baseAngle + oscillationX;

    if (clonedBoard && baseAngle > 0) {
      const scale = calculateScaleForAngle(angleX);
      if (currentHoverModeIndex === 1) {
        clonedBoard.style.transform = `perspective(1000px) rotateX(${angleX}deg) scale(${scale})`;
      } else if (currentHoverModeIndex === 2) {
        const oscillationZ = Math.sin(elapsed / HOVER_OSCILLATION_Y_PERIOD_MS) * HOVER_OSCILLATION_Y_ANGLE;
        clonedBoard.style.transform = `perspective(1000px) rotateX(${angleX}deg) rotateZ(${oscillationZ}deg) scale(${scale})`;
      }
    }

    hoverAnimationId = requestAnimationFrame(animateHoverMode);
  }

  function startHoverMode() {
    if (hoverAnimationId) return;

    hoverStartTime = null;
    hoverAnimationId = requestAnimationFrame(animateHoverMode);
  }

  function stopHoverMode() {
    if (hoverAnimationId) {
      cancelAnimationFrame(hoverAnimationId);
      hoverAnimationId = null;
      hoverStartTime = null;
    }

    applyParallaxTransform();
  }

  function toggleHoverMode() {
    currentHoverModeIndex = (currentHoverModeIndex + 1) % HOVER_MODES.length;

    const button = commandButtons[formatCommand(HOVER_MODE_COMMAND)];
    button.innerText = formatHoverModeButtonText({ withSuffix: true });

    if (currentHoverModeIndex > 0) {
      if (currentParallaxIndex === 0) {
        currentParallaxIndex = 3;
        const parallaxButton = commandButtons[formatCommand(PARALLAX_COMMAND)];
        if (parallaxButton) {
          parallaxButton.innerText = formatParallaxButtonText({ withSuffix: true });
        }
        applyParallaxTransform();
      }
      startHoverMode();
    } else {
      stopHoverMode();
    }

    saveSettings();
  }

  function createOrGetDividersSVG() {
    let svg = document.querySelector('cg-board svg.userscript-dividers');
    if (!svg) {
      const board = document.querySelector('cg-board');
      if (!board) return null;

      svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.classList.add('userscript-dividers');
      svg.style.position = 'absolute';
      svg.style.top = '0';
      svg.style.left = '0';
      svg.style.width = '100%';
      svg.style.height = '100%';
      svg.style.pointerEvents = 'none';
      svg.style.zIndex = '10';

      board.appendChild(svg);
    }
    return svg;
  }

  function drawDividers() {
    const svg = createOrGetDividersSVG();
    if (!svg) return;

    svg.innerHTML = '';

    const board = document.querySelector('cg-board');
    const boardSize = board.offsetWidth;
    const midPoint = boardSize / 2;

    const horizontalLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    horizontalLine.setAttribute('x1', 0);
    horizontalLine.setAttribute('y1', midPoint);
    horizontalLine.setAttribute('x2', boardSize);
    horizontalLine.setAttribute('y2', midPoint);
    horizontalLine.setAttribute('stroke', 'black');
    horizontalLine.setAttribute('stroke-width', '4.5');
    svg.appendChild(horizontalLine);

    const verticalLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    verticalLine.setAttribute('x1', midPoint);
    verticalLine.setAttribute('y1', 0);
    verticalLine.setAttribute('x2', midPoint);
    verticalLine.setAttribute('y2', boardSize);
    verticalLine.setAttribute('stroke', 'black');
    verticalLine.setAttribute('stroke-width', '4.5');
    svg.appendChild(verticalLine);
  }

  function clearDividers() {
    const svg = document.querySelector('cg-board svg.userscript-dividers');
    if (svg) {
      svg.remove();
    }
  }

  function toggleDividers() {
    dividersEnabled = !dividersEnabled;

    const button = commandButtons[formatCommand(DIVIDERS_COMMAND)];
    button.innerText = formatDividersButtonText({ withSuffix: true });

    if (dividersEnabled) {
      drawDividers();
    } else {
      clearDividers();
    }

    saveSettings();
  }

  function togglePieceStyle() {
    currentPieceStyleIndex = (currentPieceStyleIndex + 1) % PIECE_STYLES.length;

    const button = commandButtons[formatCommand(PIECE_STYLE_COMMAND)];
    button.innerText = formatPieceStyleButtonText({ withSuffix: true });

    if (clonedBoard) {
      updateClonedBoard();
    }

    saveSettings();
  }

  function displayPiecesList() {
    const playerIsWhite = isPlayerWhite();
    const pieces = getPiecePositions(playerIsWhite);
    const piecesGrouped = groupPiecesByColourAndType(pieces);

    const text =
      generateDisplayTextFromGroups(piecesGrouped)
        .filter(msg => msg !== SILENT_PAUSE)
        .join('\n');

    alert(text);
  }

  function createCommandButton(commandName) {
    const command = COMMANDS_WITH_PREFIX[commandName];
    const { fullName, exec } = command;

    const button = document.createElement('button');
    button.innerText = `${fullName} (${commandName})`;
    button.style.display = 'block';
    button.style.width = '100%';
    button.style.padding = '2px';
    button.style.margin = '8px';
    button.style.textAlign = 'left';

    button.addEventListener('click', () => {
      console.debug('[lichess-board-speaker] button clicked', { fullName });
      exec();
    });

    commandButtons[commandName] = button;
    return button;
  }

  function getMoveInput() {
    return document.querySelector('.keyboard-move input');
  }

  function setupMoveInput(moveInput) {
    moveInput.addEventListener('input', (_event) => userInputChanged(moveInput));

    setInterval(() => removeWrongOnInput(moveInput), 50);

    console.debug('[lichess-board-speaker] input listeners set up');

    moveInput.style.minWidth = '200px';
  }

  function setup() {
    console.debug('[lichess-board-speaker] starting setup');

    const moveInput = getMoveInput();
    if (!moveInput) {
      setTimeout(setup, 250);
      return;
    }

    loadSettings();

    setupMoveInput(moveInput);
    const buttonContainer = createButtonContainer(moveInput.parentNode);
    createButtons(buttonContainer);

    updateButtonLabels();
    applyLoadedSettings();
  }

  function onDocumentReady(handler) {
    console.debug('[lichess-board-speaker] set up load handler ...', { COMMANDS_WITH_PREFIX });
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', handler);
    } else {
      handler();
    }
  }

  onDocumentReady(setup);
})();
