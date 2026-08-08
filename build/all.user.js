// ==UserScript==
// @name        all-userscripts-bundle
// @description Combined bundle of all userscripts in this repo (each sub-script only runs on its original matched sites) — install this instead of individual scripts to keep everything updated in one place
// @version     0.4
// @match       *://*/*
// @run-at      document-start
// @grant       none
// @updateURL   https://raw.githubusercontent.com/dylan-chong/userscripts/main/build/all.user.js
// @downloadURL https://raw.githubusercontent.com/dylan-chong/userscripts/main/build/all.user.js
// ==/UserScript==

// floating-menu.user.js
(function () {
if (!(/^.*:\/\/.*\/.*$/.test(location.href))) return;
(function () {
  'use strict';

  const domain = window.location.hostname;
  const STORAGE_KEY = `floating_menu_v1_${domain}`;

  const DEFAULT_SETTINGS = {
    buttonsOnRight: true,
  };

  let settings = {};
  let menuOpen = false;
  let menuContainer = null;
  let buttonEntries = [];
  let groupContainer = null;

  function saveSettings() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {}
  }

  function loadSettings() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) settings = JSON.parse(raw);
    } catch (e) {}
  }

  function getSettings() {
    return { ...DEFAULT_SETTINGS, ...settings };
  }

  const BUTTON_STYLE = `
    all: initial;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    padding: 0;
    margin: 0;
    border-radius: 50%;
    border: 2px solid #666;
    background-color: #333;
    color: #fff;
    font-family: system-ui, sans-serif;
    font-size: 16px;
    font-weight: normal;
    line-height: 1;
    text-align: center;
    text-transform: none;
    letter-spacing: normal;
    text-indent: 0;
    text-decoration: none;
    cursor: pointer;
    z-index: 999999;
    box-sizing: border-box;
    box-shadow: 0 2px 10px rgba(0,0,0,0.3);
    transition: all 0.2s ease;
  `;

  function createMenuButton(text, title, onClick) {
    const button = document.createElement('button');
    button.textContent = text;
    button.title = title;
    button.style.cssText = BUTTON_STYLE;
    button.addEventListener('mouseenter', function () { button.style.transform = 'translateY(0) scale(1.1)'; });
    button.addEventListener('mouseleave', function () { button.style.transform = 'translateY(0) scale(1)'; });
    button.addEventListener('click', onClick);
    return button;
  }

  function getMenuLeft() {
    return getSettings().buttonsOnRight ? 'calc(100vw - 52px)' : '16px';
  }

  function renderButtons() {
    if (!groupContainer) return;

    while (groupContainer.firstChild) {
      groupContainer.removeChild(groupContainer.firstChild);
    }

    var sorted = buttonEntries.slice().sort(function (a, b) {
      if (a.sortKey !== b.sortKey) return a.sortKey - b.sortKey;
      return a.insertOrder - b.insertOrder;
    });

    var groups = [];
    var currentGroup = null;
    sorted.forEach(function (entry) {
      var key = entry.group || ('__solo_' + entry.insertOrder);
      if (!currentGroup || currentGroup.key !== key) {
        currentGroup = { key: key, entries: [], isSolo: !entry.group };
        groups.push(currentGroup);
      }
      currentGroup.entries.push(entry);
    });

    groups.forEach(function (group, gi) {
      var wrapper = document.createElement('div');

      if (!group.isSolo && group.entries.length > 1) {
        wrapper.style.cssText = 'display:none;flex-direction:column-reverse;align-items:center;gap:4px;padding:2px;border-radius:20px;background:#333;';
        group.entries.forEach(function (entry) {
          wrapper.appendChild(entry.button);
        });
      } else {
        wrapper.style.cssText = 'display:none;flex-direction:column-reverse;align-items:center;gap:6px;';
        group.entries.forEach(function (entry) {
          wrapper.appendChild(entry.button);
        });
      }

      groupContainer.appendChild(wrapper);
    });

    updateButtonVisibility();
  }

  function updateButtonVisibility() {
    if (!groupContainer) return;
    var wrappers = groupContainer.children;
    for (var i = 0; i < wrappers.length; i++) {
      var wrapper = wrappers[i];
      var buttons = wrapper.querySelectorAll('button');
      for (var j = 0; j < buttons.length; j++) {
        var btn = buttons[j];
        if (menuOpen) {
          btn.style.display = 'flex';
          btn.style.opacity = '0';
          btn.style.transform = 'translateY(10px) scale(0.8)';
          (function (b, delay) {
            requestAnimationFrame(function () {
              b.style.transition = 'opacity 0.2s ease ' + delay + 's, transform 0.2s ease ' + delay + 's';
              b.style.opacity = b._targetOpacity || '1';
              b.style.transform = 'translateY(0) scale(1)';
            });
          })(btn, i * 0.05 + j * 0.03);
        } else {
          btn.style.transition = 'opacity 0.15s ease, transform 0.15s ease';
          btn.style.opacity = '0';
          btn.style.transform = 'translateY(10px) scale(0.8)';
          (function (b) {
            setTimeout(function () { b.style.display = 'none'; }, 150);
          })(btn);
        }
      }
      if (menuOpen) {
        wrapper.style.display = 'flex';
      } else {
        (function (w) {
          setTimeout(function () { w.style.display = 'none'; }, 150);
        })(wrapper);
      }
    }
  }

  function toggleMenu() {
    menuOpen = !menuOpen;
    updateButtonVisibility();
  }

  function addButton(text, title, onClick, options) {
    options = options || {};
    var button = createMenuButton(text, title, onClick);
    button._targetOpacity = options.opacity || '1';
    button.style.display = 'none';

    var entry = {
      button: button,
      group: options.group || null,
      sortKey: typeof options.sortKey === 'number' ? options.sortKey : 999,
      insertOrder: buttonEntries.length,
    };
    buttonEntries.push(entry);

    renderButtons();
    return button;
  }

  function createUI() {
    menuContainer = document.createElement('div');
    menuContainer.id = 'floating-menu';
    menuContainer.style.cssText =
      'position:fixed;bottom:16px;left:' + getMenuLeft() + ';display:flex;flex-direction:column-reverse;align-items:center;gap:8px;z-index:999999;transition:left 0.3s ease;';

    var mainButton = createMenuButton('⚙', 'Menu', toggleMenu);
    menuContainer.appendChild(mainButton);

    groupContainer = document.createElement('div');
    groupContainer.style.cssText = 'display:flex;flex-direction:column-reverse;gap:12px;align-items:center;';
    menuContainer.appendChild(groupContainer);

    var positionEntry = {
      button: createMenuButton(
        getSettings().buttonsOnRight ? '←' : '→',
        'Toggle button position',
        function () {
          settings.buttonsOnRight = !getSettings().buttonsOnRight;
          positionEntry.button.textContent = getSettings().buttonsOnRight ? '←' : '→';
          menuContainer.style.left = getMenuLeft();
          saveSettings();
        }
      ),
      group: '__position',
      sortKey: 9999,
      insertOrder: -1,
    };
    positionEntry.button.style.display = 'none';
    buttonEntries.push(positionEntry);
    renderButtons();

    document.body.appendChild(menuContainer);

    window.__userscriptFloatingMenu = {
      addButton: addButton,
    };
  }

  function init() {
    loadSettings();
    if (document.body) {
      createUI();
    } else {
      var observer = new MutationObserver(function () {
        if (document.body) {
          createUI();
          observer.disconnect();
        }
      });
      observer.observe(document.documentElement, { childList: true });
    }
  }

  init();
})();
})();

// chess-quadrant-lines.user.js
(function () {
if (!(/^.*:\/\/.*\.chess\.com\/.*$/.test(location.href))) return;
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
    { label: 'B', title: 'Blur: 2px', value: 2 },
    { label: 'B', title: 'Blur: 4px', value: 4 },
    { label: 'B', title: 'Blur: 6px', value: 6 },
    { label: 'B', title: 'Blur: 8px', value: 8 },
    { label: 'B', title: 'Blur: 10px', value: 10 },
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
})();

// dark-mode.user.js
(function () {
if (!(/^.*:\/\/.*\/.*$/.test(location.href))) return;
(function () {
  'use strict';

  const domain = window.location.hostname;
  const STORAGE_KEY = `darkmode_v4_${domain}`;

  const DEFAULT_SETTINGS = {
    darkModeState: 'auto',
    imagesInverted: false,
  };

  let settings = {};
  let darkModeStyle = null;
  let preloadDimStyle = null;

  function saveSettings() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {
      console.error(e);
    }
  }

  function loadSettings() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      settings = JSON.parse(raw);
    } catch (e) {
      console.error(e);
    }
  }

  function getSettings() {
    return { ...DEFAULT_SETTINGS, ...settings };
  }

  function getColorBrightness(color) {
    if (!color || color === 'transparent') return null;

    const nums = color.match(/[\d.]+/g);
    if (!nums || nums.length < 3) return null;

    const alpha = nums.length >= 4 ? parseFloat(nums[3]) : 1;
    if (alpha < 0.05) return null;

    let brightness;
    if (/^rgba?\(/.test(color)) {
      const r = parseInt(nums[0]), g = parseInt(nums[1]), b = parseInt(nums[2]);
      brightness = (r * 299 + g * 587 + b * 114) / 1000;
    } else if (/^oklch\(|^oklab\(/.test(color)) {
      brightness = parseFloat(nums[0]) * 255;
    } else if (/^lch\(|^lab\(/.test(color)) {
      brightness = parseFloat(nums[0]) * 2.55;
    } else if (/^hsla?\(/.test(color)) {
      brightness = parseFloat(nums[2]) * 2.55;
    } else if (/^color\(/.test(color)) {
      const colorNums = color.replace(/^color\(\s*[\w-]+\s*/, '').match(/[\d.]+/g);
      if (!colorNums || colorNums.length < 3) return null;
      const a = colorNums.length >= 4 ? parseFloat(colorNums[3]) : 1;
      if (a < 0.1) return null;
      const r = parseFloat(colorNums[0]) * 255, g = parseFloat(colorNums[1]) * 255, b = parseFloat(colorNums[2]) * 255;
      brightness = (r * 299 + g * 587 + b * 114) / 1000;
    }

    if (brightness == null) return null;
    return { brightness, alpha };
  }

  function getGradientBrightness(backgroundImage) {
    if (!backgroundImage || backgroundImage === 'none') return null;
    const tokens = backgroundImage.match(/\w+\([^)]+\)/g);
    if (!tokens) return null;

    let totalBrightness = 0, totalAlpha = 0, count = 0;
    for (const token of tokens) {
      if (/^(linear|radial|conic|repeating)/.test(token)) continue;
      const result = getColorBrightness(token);
      if (result) {
        totalBrightness += result.brightness;
        totalAlpha += result.alpha;
        count++;
      }
    }
    if (count === 0) return null;
    return { brightness: totalBrightness / count, alpha: Math.min(totalAlpha / count, 1) };
  }

  function getBackgroundBrightness(style) {
    return getColorBrightness(style.backgroundColor) ?? getGradientBrightness(style.backgroundImage);
  }

  function getVisibleBrightness(elements) {
    let compositedBrightness = 0;
    let compositedAlpha = 0;
    const layers = [];

    for (const el of elements) {
      const style = window.getComputedStyle(el);
      const result = getBackgroundBrightness(style);
      if (!result) continue;

      const layerWeight = result.alpha * (1 - compositedAlpha);
      compositedBrightness += result.brightness * layerWeight;
      compositedAlpha += layerWeight;
      layers.push(`${'  '.repeat(layers.length)}<${el.tagName.toLowerCase()}> bg="${style.backgroundColor}" a=${result.alpha.toFixed(2)} b=${result.brightness.toFixed(0)} cumA=${compositedAlpha.toFixed(2)}`);
      if (compositedAlpha >= 0.95) {
        return { el, brightness: compositedBrightness / compositedAlpha, layers };
      }
    }

    if (compositedAlpha > 0.05) {
      const whiteFill = 255 * (1 - compositedAlpha);
      layers.push(`${'  '.repeat(layers.length)}<root> white fill, cumA=1.00`);
      return { el: document.documentElement, brightness: compositedBrightness + whiteFill, layers };
    }
    layers.push(`${'  '.repeat(layers.length)}<root> default white`);
    return { el: document.documentElement, brightness: 255, layers };
  }

  function hasDarkColorScheme() {
    const meta = document.querySelector('meta[name="color-scheme"]');
    if (meta && meta.content.includes('dark')) return true;
    const rootScheme = getComputedStyle(document.documentElement).colorScheme;
    if (rootScheme && rootScheme.includes('dark')) return true;
    if (document.body) {
      const bodyScheme = getComputedStyle(document.body).colorScheme;
      if (bodyScheme && bodyScheme.includes('dark')) return true;
    }
    return false;
  }

  function isPageDark({ log = false } = {}) {
    const t0 = performance.now();
    if (hasDarkColorScheme()) {
      if (log) console.info(`[DarkMode] hasDarkColorScheme=true, skipping pixel sampling, took=${(performance.now() - t0).toFixed(1)}ms`);
      return true;
    }

    const samplePoints = [];
    const cols = 8;
    const rows = 8;

    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const x = (window.innerWidth / (cols + 1)) * (i + 1);
        const y = (window.innerHeight / (rows + 1)) * (j + 1);
        samplePoints.push({ x, y });
      }
    }

    const samples = [];
    samplePoints.forEach(({ x, y }) => {
      const elements = document.elementsFromPoint(x, y);
      if (elements.length > 0) {
        const result = getVisibleBrightness(elements);
        samples.push({ x, y, hitEl: elements[0], ...result });
      }
    });

    const darkCount = samples.filter(s => s.brightness < 80).length;
    const darkRatio = darkCount / samples.length;
    const isDark = darkRatio > 0.8;

    if (log) {
      console.info(`[DarkMode] darkRatio=${(darkRatio * 100).toFixed(0)}% (${darkCount}/${samples.length}) isDark=${isDark} took=${(performance.now() - t0).toFixed(1)}ms`);
      for (const s of samples) {
        console.info(`  (${Math.round(s.x)},${Math.round(s.y)}) brightness=${s.brightness.toFixed(1)} hit=<${s.hitEl.tagName.toLowerCase()}${s.hitEl.id ? '#' + s.hitEl.id : ''}${s.hitEl.className ? '.' + String(s.hitEl.className).split(' ')[0] : ''}>`);
        for (const layer of s.layers) {
          console.info(`    ${layer}`);
        }
      }
    }

    return isDark;
  }

  function applyPreloadDim() {
    if (getSettings().darkModeState !== 'auto') return;
    preloadDimStyle = document.createElement('style');
    preloadDimStyle.id = 'dark-mode-preload-dim';
    preloadDimStyle.textContent = `
      html {
        filter: brightness(0.25);
        background-color: #000 !important;
      }
    `;
    (document.head || document.documentElement).appendChild(preloadDimStyle);
  }

  function removePreloadDim() {
    if (preloadDimStyle) {
      preloadDimStyle.remove();
      preloadDimStyle = null;
    }
  }

  const DARK_MODE_CSS = `
      html {
        filter: invert(1) hue-rotate(180deg);
        background-color: #fff;
      }

      iframe {
        filter: invert(1) hue-rotate(180deg) !important;
      }
    `;

  function applyDarkMode(force = false) {
    if (!darkModeStyle) {
      darkModeStyle = document.getElementById('simple-dark-mode-invert');
      if (!darkModeStyle) {
        darkModeStyle = document.createElement('style');
        darkModeStyle.id = 'simple-dark-mode-invert';
        document.head.appendChild(darkModeStyle);
      }
    }

    if (darkModeStyle.textContent === DARK_MODE_CSS) return;
    darkModeStyle.textContent = DARK_MODE_CSS;
  }

  function removeDarkMode() {
    if (darkModeStyle && darkModeStyle.textContent !== '') {
      darkModeStyle.textContent = '';
    }
  }

  function createImageInvertStyle() {
    const style = document.createElement('style');
    style.id = 'image-invert-toggle';
    document.head.appendChild(style);
    return style;
  }

  function isDarkModeActive() {
    const el = darkModeStyle || document.getElementById('simple-dark-mode-invert');
    return !!el && el.textContent !== '';
  }

  const IMAGE_INVERT_CSS = `
        img,
        video,
        [style*="background-image"],
        *[style*="background-image"] {
          filter: invert(1) hue-rotate(180deg) !important;
        }
      `;

  function updateImageInversion(style) {
    const { imagesInverted } = getSettings();
    const isDark = isDarkModeActive();
    const shouldInvert = isDark ? imagesInverted : !imagesInverted;
    const newContent = shouldInvert ? '' : IMAGE_INVERT_CSS;
    if (style.textContent === newContent) return;
    style.textContent = newContent;
  }

  let imageStyle = null;

  function getDarkModeIcon(state) {
    switch (state) {
      case 'auto': return '◐';
      case 'off': return '☀️';
      case 'on': return '🌙';
      default: return '◐';
    }
  }

  function getDarkModeTitle(state) {
    switch (state) {
      case 'auto': return 'Dark mode: Auto';
      case 'off': return 'Dark mode: Off';
      case 'on': return 'Dark mode: On';
      default: return 'Dark mode: Auto';
    }
  }

  let darkModeButton = null;

  function registerMenuButtons() {
    var menu = window.__userscriptFloatingMenu;
    if (!menu) return;

    if (!imageStyle) {
      imageStyle = createImageInvertStyle();
    }

    darkModeButton = menu.addButton(
      getDarkModeIcon(getSettings().darkModeState),
      getDarkModeTitle(getSettings().darkModeState),
      function () {
        const states = ['auto', 'off', 'on'];
        const currentIndex = states.indexOf(getSettings().darkModeState);
        settings.darkModeState = states[(currentIndex + 1) % 3];
        darkModeButton.textContent = getDarkModeIcon(getSettings().darkModeState);
        darkModeButton.title = getDarkModeTitle(getSettings().darkModeState);
        checkAndApplyDarkMode();
        saveSettings();
      },
      { group: 'display', sortKey: 10 }
    );

    var imageButton = menu.addButton(
      '🖼️',
      'Toggle image/video inversion',
      function () {
        settings.imagesInverted = !getSettings().imagesInverted;
        updateImageInversion(imageStyle);
        imageButton._targetOpacity = getSettings().imagesInverted ? '1' : '0.5';
        imageButton.style.opacity = imageButton._targetOpacity;
        saveSettings();
      },
      { opacity: getSettings().imagesInverted ? '1' : '0.5', group: 'display', sortKey: 11 }
    );
  }

  function init() {
    loadSettings();
    applyPreloadDim();

    var waitForMenu = setInterval(function () {
      if (!window.__userscriptFloatingMenu) return;
      clearInterval(waitForMenu);
      registerMenuButtons();
    }, 100);

    setTimeout(function () {
      removePreloadDim();
      checkAndApplyDarkMode();
      startPeriodicChecking();
    }, 250);
  }

  function updateDarkModeButton() {
    if (!darkModeButton) return;
    var darkModeState = getSettings().darkModeState;
    darkModeButton.textContent = getDarkModeIcon(darkModeState);
    darkModeButton.title = getDarkModeTitle(darkModeState);
  }

  function checkAndApplyDarkMode() {
    const darkModeState = getSettings().darkModeState;
    if (darkModeState === 'on') {
      applyDarkMode(true);
    } else if (darkModeState === 'off') {
      removeDarkMode();
    } else {
      const alreadyDark = isPageDark();
      if (alreadyDark) {
        removeDarkMode();
      } else {
        applyDarkMode(true);
      }
    }
    updateDarkModeButton();
    if (imageStyle) {
      updateImageInversion(imageStyle);
    }
  }

  function startPeriodicChecking() {
    const fastInterval = setInterval(checkAndApplyDarkMode, 1000 / 5);
    setTimeout(() => {
      clearInterval(fastInterval);
      setInterval(checkAndApplyDarkMode, 1000 / 2);
    }, 10000);
  }

  init();

  window.isPageDark = isPageDark;
})();
})();

// dim-mode.user.js
(function () {
if (!(/^.*:\/\/.*\/.*$/.test(location.href))) return;
(function () {
  'use strict';

  const STORAGE_KEY = 'dim_mode_v1';
  const MODES = [
    { label: 'D', title: 'Dim: OFF', opacity: 0 },
    { label: 'D', title: 'Dim: 70%', opacity: 0.7 },
    { label: 'D', title: 'Dim: 40% brightness', opacity: 0.6 },
  ];

  let modeIndex = 0;
  let overlay = null;
  let button = null;

  function loadMode() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved !== null) {
        var idx = parseInt(saved, 10) || 0;
        if (idx < MODES.length) modeIndex = idx;
      }
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

  function applyMode() {
    ensureOverlay();
    var mode = MODES[modeIndex];
    overlay.style.background = mode.opacity > 0
      ? 'rgba(0,0,0,' + mode.opacity + ')'
      : 'rgba(0,0,0,0)';
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
          cycleMode,
          { group: 'display', sortKey: 12 }
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
})();

// facebook-messenger-no-header.user.js
(function () {
if (!(/^.*:\/\/.*\.facebook\.com\/messages\/.*$/.test(location.href))) return;
(function () {
    function hideHeader() {
        const header = document.querySelector('nav, [role="banner"]');
        if (header) {
            header.style.display = 'none';
        }
    }

    setInterval(hideHeader, 500);
})();
})();

// facebook-no-feed.user.js
(function () {
if (!(/^.*:\/\/.*\.facebook\.com\/.*$/.test(location.href))) return;
(function () {
    function isHomePage() {
        const path = window.location.pathname;
        return path === '/' || path === '/home.php';
    }

    const MESSAGE_ID = 'fb-no-feed-message';

    function createMessage() {
        const div = document.createElement('div');
        div.id = MESSAGE_ID;
        div.style.cssText = `
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 60vh;
            font-size: 2rem;
            color: #888;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;
        div.textContent = "Don't waste time";
        return div;
    }

    function replaceFeedDesktop(feed) {
        feed.innerHTML = '';
        feed.appendChild(createMessage());
    }

    function replaceFeedMobile(vscroller) {
        for (const child of Array.from(vscroller.children)) {
            if (child.querySelector('[role="tablist"]') || child.getAttribute('role') === 'tablist' || child.id === MESSAGE_ID) continue;
            child.style.display = 'none';
        }
        if (!vscroller.querySelector('#' + MESSAGE_ID)) {
            vscroller.appendChild(createMessage());
        }
    }

    function tryReplaceFeed() {
        if (!isHomePage()) return;

        const desktopFeed = document.querySelector('div[role="feed"]');
        if (desktopFeed) {
            replaceFeedDesktop(desktopFeed);
            return;
        }

        const mobileFeed = document.querySelector('div[data-type="vscroller"]');
        if (mobileFeed) {
            replaceFeedMobile(mobileFeed);
            return;
        }

        const main = document.querySelector('div[role="main"]');
        if (main) {
            replaceFeedDesktop(main);
        }
    }

    setInterval(tryReplaceFeed, 500);
})();
})();

// github-circleci.user.js
(function () {
if (!(/^.*:\/\/github\.com\/.*\/.*$/.test(location.href))) return;
(function () {
    function getCircleCIUrl() {
        var match = window.location.pathname.match(/^\/([^/]+)\/([^/]+)(?:\/pull\/(\d+))?/);
        if (!match) return null;
        var owner = match[1];
        var repo = match[2];
        var pullNumber = match[3];
        var url = 'https://app.circleci.com/pipelines/gh/' + owner + '/' + repo;
        if (pullNumber) {
            url += '?branch=pull%2F' + pullNumber + '/head';
        }
        return url;
    }

    var waitForMenu = setInterval(function () {
        if (!window.__userscriptFloatingMenu) return;
        clearInterval(waitForMenu);

        var url = getCircleCIUrl();
        if (!url) return;

        window.__userscriptFloatingMenu.addButton('CI', 'Open CircleCI pipeline', function () {
            window.open(url, '_blank');
        }, { group: 'dev', sortKey: 30 });
    }, 100);
})();
})();

// night-video.user.js
(function () {
if (!(/^.*:\/\/.*\/.*$/.test(location.href))) return;
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
})();

// oauth-auto-close.user.js
(function () {
if (!(/^http:\/\/127\.0\.0\.1:56536\/oauth\/callback.*$/.test(location.href))) return;
(function () {
    const MESSAGE = 'can be used until your session expires';
    const log = (...args) => console.log('[oauth-auto-close]', ...args);

    log('Script loaded on', window.location.href);

    function checkAndClose() {
        const text = document.body ? document.body.textContent : '';
        log('Checking body text:', JSON.stringify(text.substring(0, 200)));
        if (text.includes(MESSAGE)) {
            log('Message found! Closing tab in 1 second...');
            setTimeout(() => window.close(), 1000);
            return true;
        }
        log('Message not found');
        return false;
    }

    if (checkAndClose()) return;

    log('Setting up polling (every 250ms)');
    const intervalId = setInterval(() => {
        if (checkAndClose()) {
            log('Polling triggered close');
            clearInterval(intervalId);
        }
    }, 250);
})();
})();

// poker-chip-forum-read-listings.user.js
(function () {
if (!(/^https:\/\/www\.pokerchipforum\.com\/.*$/.test(location.href))) return;
(function() {
  'use strict';

  // Add CSS for viewed and unviewed listings
  function addStyles() {
    if (document.getElementById('pcf-viewed-styles')) return;

    const style = document.createElement('style');
    style.id = 'pcf-viewed-styles';
    style.textContent = `
      .pcf-viewed {
        opacity: 0.5 !important;
        background-color: #262626 !important;
        max-height: 40px !important;
        overflow: hidden !important;
        position: relative;
        transition: all 0.3s ease;
      }
      
      .pcf-viewed .structItem-cell--main,
      .pcf-viewed .contentRow-main {
        padding: 4px 8px !important;
        display: flex;
        align-items: center;
      }
      
      .pcf-viewed .structItem-title,
      .pcf-viewed h3 {
        font-size: 13px !important;
        margin: 0 !important;
        line-height: 1.3 !important;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      
      .pcf-viewed .structItem-minor,
      .pcf-viewed .structItem-meta,
      .pcf-viewed .contentRow-minor,
      .pcf-viewed .contentRow-snippet,
      .pcf-viewed .structItem-cell:not(.structItem-cell--main),
      .pcf-viewed .contentRow-extra,
      .pcf-viewed .structItem-icon,
      .pcf-viewed .contentRow-figure {
        display: none !important;
      }
      
      .pcf-viewed::after {
        content: "READ";
        position: absolute;
        top: 5px;
        right: 5px;
        background: #999;
        color: white;
        padding: 2px 8px;
        font-size: 10px;
        border-radius: 3px;
        font-weight: bold;
        z-index: 10;
      }
      
      .pcf-preview-container {
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding: 12px 0;
        border-top: 1px solid #e0e0e0;
        margin-top: 8px;
      }
      
      .pcf-image-carousel {
        position: relative;
        width: 100%;
        overflow-x: auto;
        overflow-y: hidden;
        white-space: nowrap;
        scroll-behavior: smooth;
        -webkit-overflow-scrolling: touch;
        scrollbar-width: thin;
        scrollbar-color: #888 #f1f1f1;
      }
      
      .pcf-image-carousel::-webkit-scrollbar {
        height: 8px;
      }
      
      .pcf-image-carousel::-webkit-scrollbar-track {
        background: #f1f1f1;
        border-radius: 4px;
      }
      
      .pcf-image-carousel::-webkit-scrollbar-thumb {
        background: #888;
        border-radius: 4px;
      }
      
      .pcf-image-carousel::-webkit-scrollbar-thumb:hover {
        background: #555;
      }
      
      .pcf-preview-image {
        height: 300px;
        width: auto;
        display: inline-block;
        margin-right: 12px;
        border-radius: 4px;
        border: 1px solid #ddd;
        vertical-align: top;
        object-fit: contain;
        cursor: pointer;
      }
      
      .pcf-preview-placeholder {
        width: 100%;
        height: 200px;
        background: #262626;
        border-radius: 4px;
        border: 1px solid #ddd;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #999;
        font-size: 14px;
      }
      
      .pcf-mark-read-btn {
        padding: 6px 12px;
        background: #4CAF50;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        font-weight: bold;
        transition: background 0.2s;
        z-index: 1000;
        position: relative;
      }
      
      .pcf-mark-read-btn:hover {
        background: #45a049;
      }
      
      .pcf-loading {
        color: #999;
        font-size: 11px;
        font-style: italic;
      }
    `;

    document.head.appendChild(style);
  }

  // Get stored viewed listings
  function getViewedListings() {
    try {
      const stored = localStorage.getItem('pcf_viewed_listings');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  }

  // Store viewed listing
  function addViewedListing(threadId) {
    try {
      const viewed = getViewedListings();
      if (!viewed.includes(threadId)) {
        viewed.push(threadId);
        if (viewed.length > 1000) {
          viewed.splice(0, viewed.length - 1000);
        }
        localStorage.setItem('pcf_viewed_listings', JSON.stringify(viewed));
      }
    } catch (e) {
      console.warn('Could not save viewed listing:', e);
    }
  }

  // Extract thread ID from URL
  function getThreadId(url) {
    const match = url.match(/threads\/[^\/]*\.(\d+)\//);
    return match ? match[1] : null;
  }

  // Get full-size image URL from thumbnail or parent link
  function getFullSizeUrl(imgElement) {
    // First priority: Check if image is wrapped in a link (XenForo lightbox pattern)
    const parentLink = imgElement.closest('a[href]');
    if (parentLink) {
      const linkHref = parentLink.getAttribute('href');
      // If link points to an image or attachment, use that (this is the full-size version)
      if (linkHref && (/\.(jpg|jpeg|png|gif|webp)$/i.test(linkHref) || linkHref.includes('/attachments/'))) {
        return linkHref.startsWith('/') ? 'https://www.pokerchipforum.com' + linkHref : linkHref;
      }
    }

    // Fallback: try to extract full-size from the img src itself
    let imgSrc = imgElement.getAttribute('src');
    if (!imgSrc) return null;

    let fullUrl = imgSrc;

    // Remove thumbnail size parameters
    fullUrl = fullUrl.replace(/\/thumbnails\/[^\/]+/, '');
    fullUrl = fullUrl.replace(/\?thumbnail=\d+/, '');
    fullUrl = fullUrl.replace(/&thumbnail=\d+/, '');

    // XenForo attachment format: attachments/xxx.123/ to attachments/xxx.123/
    if (fullUrl.includes('/attachments/')) {
      fullUrl = fullUrl.replace(/\/attachments\/([^\/]+\.\d+)\/.*$/, '/attachments/$1/');
      // Add full parameter if not already there
      if (!fullUrl.includes('?')) {
        fullUrl += '?full=1';
      }
    }

    // Replace common thumbnail suffixes
    fullUrl = fullUrl.replace(/-thumb\.(jpg|jpeg|png|gif|webp)$/i, '.$1');
    fullUrl = fullUrl.replace(/_thumb\.(jpg|jpeg|png|gif|webp)$/i, '.$1');
    fullUrl = fullUrl.replace(/\.thumb\.(jpg|jpeg|png|gif|webp)$/i, '.$1');

    return fullUrl;
  }

  // Check if image should be filtered out based on attributes
  function shouldFilterImage(img, src) {
    const className = img.className || '';
    const width = img.getAttribute('width');
    const height = img.getAttribute('height');

    // Skip avatar/profile pictures and smilies
    if (src.includes('/avatars/') ||
      src.includes('avatar') ||
      className.includes('avatar') ||
      src.includes('/smilies/') ||
      className.includes('smilie') ||
      className.includes('emoji')) {
      return true;
    }

    // Skip images with explicit small dimensions in attributes
    if (width && height) {
      const w = parseInt(width);
      const h = parseInt(height);
      if (!isNaN(w) && !isNaN(h) && (w < 100 || h < 100)) {
        return true;
      }
    }

    // Skip common icon/button patterns
    if (src.includes('/styles/') ||
      src.includes('/icons/') ||
      src.includes('icon.') ||
      src.includes('button.')) {
      return true;
    }

    return false;
  }

  // Fetch all images from thread page (first post only)
  async function fetchPostImages(threadUrl) {
    try {
      const response = await fetch(threadUrl);
      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      // Look for images in the first post only
      const firstPost = doc.querySelector('.message-body, .message-content, article.message');
      if (firstPost) {
        const images = [];
        const imgElements = firstPost.querySelectorAll('img[src]');

        for (const img of imgElements) {
          const src = img.getAttribute('src');

          // Filter out unwanted images
          if (shouldFilterImage(img, src)) {
            continue;
          }

          // Get full-size version (prioritizes parent link href for XenForo lightbox)
          let imageSrc = getFullSizeUrl(img);
          if (!imageSrc) continue;
          
          if (imageSrc.startsWith('/')) {
            imageSrc = 'https://www.pokerchipforum.com' + imageSrc;
          }

          // Avoid duplicates
          if (!images.includes(imageSrc)) {
            images.push(imageSrc);
          }
        }

        return images;
      }
      return [];
    } catch (e) {
      console.warn('Could not fetch thread images:', e);
      return [];
    }
  }

  // Add preview and mark-as-read button to unread listings
  async function addPreviewToListing(container, threadUrl, threadId) {
    // Check if preview already exists
    if (container.querySelector('.pcf-preview-container')) return;

    const mainCell = container.querySelector('.structItem-cell--main, .contentRow-main');
    if (!mainCell) return;

    // Create preview container
    const previewContainer = document.createElement('div');
    previewContainer.className = 'pcf-preview-container';

    // Stop all clicks within preview container from bubbling
    previewContainer.addEventListener('click', function(e) {
      e.stopPropagation();
    }, true);

    // Create carousel container
    const carouselDiv = document.createElement('div');
    carouselDiv.className = 'pcf-image-carousel';

    // Create loading placeholder
    const placeholder = document.createElement('div');
    placeholder.className = 'pcf-preview-placeholder';
    placeholder.textContent = 'Loading images...';
    carouselDiv.appendChild(placeholder);

    previewContainer.appendChild(carouselDiv);

    // Create mark as read button
    const markReadBtn = document.createElement('button');
    markReadBtn.className = 'pcf-mark-read-btn';
    markReadBtn.textContent = 'Mark as Read';

    // Handle the actual mark as read action
    const handleMarkRead = function(e) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      
      console.log('Mark as read clicked for thread:', threadId);

      addViewedListing(threadId);
      container.classList.add('pcf-viewed');
      previewContainer.remove();

      // Clean up the container - hide all extra elements
      const minorElements = container.querySelectorAll('.structItem-minor, .structItem-meta, .contentRow-minor, .contentRow-snippet, .contentRow-extra, .structItem-icon, .contentRow-figure');
      minorElements.forEach(el => el.style.display = 'none');

      const extraCells = container.querySelectorAll('.structItem-cell:not(.structItem-cell--main)');
      extraCells.forEach(el => el.style.display = 'none');

      return false;
    };

    // Prevent propagation on all events
    const stopPropagation = function(e) {
      e.stopPropagation();
      e.stopImmediatePropagation();
    };

    // Prevent touchstart and touchmove from propagating (but don't prevent default)
    markReadBtn.addEventListener('touchstart', stopPropagation, true);
    markReadBtn.addEventListener('touchmove', stopPropagation, true);
    
    // Add the actual handler on touchend (for mobile) and click (for desktop)
    markReadBtn.addEventListener('touchend', handleMarkRead, true);
    markReadBtn.addEventListener('click', handleMarkRead, true);
    
    previewContainer.appendChild(markReadBtn);

    mainCell.appendChild(previewContainer);

    // Fetch and display all images
    const imageSrcs = await fetchPostImages(threadUrl);
    if (imageSrcs.length > 0) {
      // Remove placeholder
      placeholder.remove();

      // Add all images to horizontal scroll
      imageSrcs.forEach((imageSrc) => {
        const img = document.createElement('img');
        img.className = 'pcf-preview-image';
        img.src = imageSrc;
        img.onerror = function() {
          img.remove();
        };
        carouselDiv.appendChild(img);
      });
    } else {
      placeholder.textContent = 'No Images';
    }
  }

  // Mark listings as viewed or add previews
  function processListings() {
    const viewedListings = getViewedListings();

    const selectors = [
      '.structItem-cell--main',
      '.contentRow-main',
      '.structItem-title',
      '.searchResult-title'
    ];

    let threadElements = [];

    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        threadElements = Array.from(elements);
        break;
      }
    }

    if (threadElements.length === 0) {
      threadElements = Array.from(document.querySelectorAll('a[href*="/threads/"]'))
        .map(link => link.closest('.structItem, .contentRow, .searchResult') || link.parentElement)
        .filter(el => el);
    }

    threadElements.forEach(element => {
      const linkElement = element.querySelector('a[data-tp-primary="on"], a[href*="/threads/"]');
      if (linkElement) {
        const threadId = getThreadId(linkElement.href);
        if (threadId) {
          const container = element.closest('.structItem, .contentRow, .searchResult') || element;
          if (container) {
            if (viewedListings.includes(threadId)) {
              // Mark as viewed (shrink it)
              container.classList.add('pcf-viewed');
            } else {
              // Add preview for unread
              addPreviewToListing(container, linkElement.href, threadId);
            }
          }
        }
      }
    });
  }

  // Track clicks on listings
  function trackListingClicks() {
    document.addEventListener('click', function(e) {
      const link = e.target.closest('a[data-tp-primary="on"], a[href*="/threads/"]');
      if (link && link.href.includes('/threads/')) {
        const threadId = getThreadId(link.href);
        if (threadId) {
          addViewedListing(threadId);
        }
      }
    });
  }

  // Mark current thread as viewed
  function markCurrentThreadAsViewed() {
    const currentUrl = window.location.href;
    const threadId = getThreadId(currentUrl);
    if (threadId) {
      addViewedListing(threadId);
    }
  }

  // Check if we're on a listing page
  function isListingPage() {
    const currentUrl = window.location.href;
    return currentUrl.includes('/forums/for-sale.25/') ||
      currentUrl.includes('/search-forums/marketplace.175/') ||
      currentUrl.includes('/forums/') ||
      currentUrl.includes('/search');
  }

  // Initialize
  function init() {
    addStyles();

    const currentUrl = window.location.href;

    if (isListingPage()) {
      processListings();
      trackListingClicks();

      const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
          if (mutation.addedNodes.length > 0) {
            setTimeout(processListings, 100);
          }
        });
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });

    } else if (currentUrl.includes('/threads/')) {
      markCurrentThreadAsViewed();
    }
  }

  // Wait for page to load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Handle navigation
  window.addEventListener('pageshow', function(event) {
    setTimeout(init, 100);
  });

  document.addEventListener('visibilitychange', function() {
    if (!document.hidden && isListingPage()) {
      setTimeout(processListings, 100);
    }
  });

  let lastUrl = location.href;
  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      setTimeout(init, 500);
    }
  }).observe(document, { subtree: true, childList: true });

})();
})();

// poker-clock-remove-ui.user.js
(function () {
if (!(/^.*:\/\/.*clock\.poker\/.*$/.test(location.href))) return;
// TODO doesn't match on website


setTimeout(() => {
    $('.title-container').style.display = 'none';
    $('.column h2').remove();
    $('.level-table').style.fontSize = "6vh";   
}, 2000);
})();

// watch-south-park-iframe-popup-blocker.user.js
(function () {
if (!(/^https:\/\/myvidplay\.com\/.*$/.test(location.href) || /^https:\/\/.*\.myvidplay\.com\/.*$/.test(location.href))) return;
(function() {
  'use strict';

  // Completely disable window.open
  window.open = function() {
    console.log('[MyVidPlay] Blocked window.open');
    return window;
  };

  // Block all forms of navigation that open new windows
  const blockNewWindow = (e) => {
    const target = e.target;
    const link = target.closest ? target.closest('a') : null;
    
    if (link) {
      if (link.target === '_blank' || link.target === '_new') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        console.log('[MyVidPlay] Blocked _blank link');
        return false;
      }
      
      // Block external links entirely (except video sources)
      if (link.href && !link.href.includes('myvidplay.com') && !link.href.startsWith('#')) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        console.log('[MyVidPlay] Blocked external link:', link.href);
        return false;
      }
    }
    
    // Block clicks on overlay divs that might trigger popups
    if (target.tagName === 'DIV' && !target.closest('video')) {
      const computedStyle = window.getComputedStyle(target);
      const isOverlay = computedStyle.position === 'absolute' || 
                        computedStyle.position === 'fixed';
      
      if (isOverlay && parseInt(computedStyle.zIndex) > 100) {
        console.log('[MyVidPlay] Blocked suspicious overlay click');
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
      }
    }
  };

  // Capture all mouse events that could trigger popups
  ['mousedown', 'mouseup', 'click', 'auxclick', 'contextmenu'].forEach(eventType => {
    document.addEventListener(eventType, blockNewWindow, true);
  });

  // Block keyboard shortcuts that might open popups (Ctrl+click, etc)
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.shiftKey) {
      console.log('[MyVidPlay] Blocked modified key event');
      // Don't fully block, just log for now
    }
  }, true);

  // Prevent popunder technique
  let lastFocus = Date.now();
  window.addEventListener('blur', function() {
    if (Date.now() - lastFocus < 1000) {
      setTimeout(() => window.focus(), 10);
      console.log('[MyVidPlay] Blocked popunder');
    }
  });

  window.addEventListener('focus', function() {
    lastFocus = Date.now();
  });

  // Override createElement to neuter link creation
  const originalCreateElement = document.createElement.bind(document);
  document.createElement = function(tag) {
    const el = originalCreateElement(tag);
    
    if (tag.toLowerCase() === 'a') {
      // Prevent target="_blank" from being set
      Object.defineProperty(el, 'target', {
        set: function(val) {
          if (val === '_blank' || val === '_new') {
            console.log('[MyVidPlay] Blocked target setter');
            return;
          }
          this.setAttribute('target', val);
        },
        get: function() {
          return this.getAttribute('target') || '';
        }
      });
    }
    
    return el;
  };

  // Block setAttribute for target="_blank"
  const originalSetAttribute = Element.prototype.setAttribute;
  Element.prototype.setAttribute = function(name, value) {
    if (name === 'target' && (value === '_blank' || value === '_new')) {
      console.log('[MyVidPlay] Blocked setAttribute target="_blank"');
      return;
    }
    return originalSetAttribute.call(this, name, value);
  };

  // Remove onclick handlers that might open popups
  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === 1) {
          // Remove onclick from suspicious elements
          if (node.onclick) {
            node.onclick = null;
            console.log('[MyVidPlay] Removed onclick handler');
          }
          
          // Fix any _blank links
          if (node.querySelectorAll) {
            const links = node.querySelectorAll('a[target="_blank"], a[target="_new"]');
            links.forEach(link => {
              link.removeAttribute('target');
              console.log('[MyVidPlay] Removed target from dynamic link');
            });
          }
        }
      });
    });
  });

  // Start observing when body is available
  const startObserver = () => {
    if (document.body) {
      observer.observe(document.body, { 
        childList: true, 
        subtree: true,
        attributes: true,
        attributeFilter: ['target', 'onclick']
      });
      console.log('[MyVidPlay] Observer started');
    } else {
      setTimeout(startObserver, 10);
    }
  };
  
  startObserver();

  // Nuclear option: block all clicks except on video element
  let videoClickAllowed = false;
  document.addEventListener('click', (e) => {
    const video = e.target.closest('video');
    if (!video && !videoClickAllowed) {
      const isVideoControl = e.target.closest('[class*="control"]') || 
                            e.target.closest('[class*="play"]') ||
                            e.target.closest('button');
      
      if (!isVideoControl) {
        console.log('[MyVidPlay] Blocked non-video click');
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
      }
    }
  }, true);

  console.log('[MyVidPlay] Enhanced Pop-up Blocker active');
})();
})();

// watch-south-park-popup-blocker.user.js
(function () {
if (!(/^https:\/\/watchsouthpark\.tv\/.*$/.test(location.href) || /^https:\/\/.*\.watchsouthpark\.tv\/.*$/.test(location.href))) return;
(function() {
  'use strict';

  // Prevent new tabs/windows from opening
  function blockPopups() {
    // Override window.open
    const originalOpen = window.open;
    window.open = function() {
      console.log('Blocked popup attempt');
      return null;
    };

    // Block target="_blank" links
    document.addEventListener('click', function(e) {
      const link = e.target.closest('a');
      if (link && (link.target === '_blank' || link.target === '_new')) {
        e.preventDefault();
        e.stopPropagation();
        console.log('Blocked new tab link');
        return false;
      }
    }, true);

    // Block programmatic window opening attempts
    const originalCreateElement = document.createElement;
    document.createElement = function(tagName) {
      const element = originalCreateElement.call(document, tagName);
      if (tagName.toLowerCase() === 'a') {
        element.addEventListener('click', function(e) {
          if (this.target === '_blank' || this.target === '_new') {
            e.preventDefault();
            e.stopPropagation();
            console.log('Blocked dynamically created new tab link');
            return false;
          }
        });
      }
      return element;
    };
  }

  // Initialize popup blocking immediately
  blockPopups();

  // Monitor for dynamically added elements and reapply popup blocking
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      mutation.addedNodes.forEach(function(node) {
        if (node.nodeType === 1) { // Element node
          // Check for new links with target="_blank"
          const newLinks = node.querySelectorAll ? node.querySelectorAll('a[target="_blank"], a[target="_new"]') : [];
          newLinks.forEach(function(link) {
            link.addEventListener('click', function(e) {
              e.preventDefault();
              e.stopPropagation();
              console.log('Blocked dynamically added new tab link');
              return false;
            });
          });
        }
      });
    });
  });

  // Start observing
  observer.observe(document.body || document.documentElement, {
    childList: true,
    subtree: true
  });

  console.log('South Park TV Pop-up Blocker active');
})();
})();

// youtube-block-autoplay.user.js
(function () {
if (!(/^.*:\/\/.*\.youtube\.com\/.*$/.test(location.href))) return;
(function () {
    const BLOCK_AUTOPLAY_BTN_ID = 'yt-block-playlist-autoplay-btn';
    const STORAGE_KEY = 'yt-block-playlist-autoplay';
    let blockAutoplayEnabled = localStorage.getItem(STORAGE_KEY) !== 'false';
    let userInitiatedSkip = false;

    function isPlaylist() {
        return new URLSearchParams(window.location.search).has('list');
    }

    function markUserSkip() {
        userInitiatedSkip = true;
        setTimeout(() => { userInitiatedSkip = false; }, 3000);
    }

    const SVG_NS = 'http://www.w3.org/2000/svg';

    function buildBlockAutoplaySvg() {
        const svg = document.createElementNS(SVG_NS, 'svg');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('width', '24');
        svg.setAttribute('height', '24');
        svg.style.opacity = 1;

        const path = document.createElementNS(SVG_NS, 'path');
        path.setAttribute('d', 'M8 19l11-7L8 5v14zM19 5v14h3V5h-3z');
        path.setAttribute('fill', 'white');
        svg.appendChild(path);

        if (blockAutoplayEnabled) {
            const line = document.createElementNS(SVG_NS, 'line');
            line.setAttribute('x1', '4');
            line.setAttribute('y1', '20');
            line.setAttribute('x2', '20');
            line.setAttribute('y2', '4');
            line.setAttribute('stroke', '#ff4444');
            line.setAttribute('stroke-width', '3');
            line.setAttribute('stroke-linecap', 'round');
            svg.appendChild(line);
        }

        return svg;
    }

    function updateBlockAutoplayButton() {
        const btn = document.getElementById(BLOCK_AUTOPLAY_BTN_ID);
        if (!btn) return;
        btn.replaceChildren(buildBlockAutoplaySvg());
        btn.title = blockAutoplayEnabled
            ? 'Playlist autoplay blocked (click to allow)'
            : 'Playlist autoplay allowed (click to block)';
    }

    function createBlockAutoplayButton() {
        if (document.getElementById(BLOCK_AUTOPLAY_BTN_ID)) return;
        const loopRenderer = document.querySelector('ytd-playlist-loop-button-renderer') || document.querySelector('ytm-playlist-loop-button-renderer');
        if (!loopRenderer) return;

        const btn = document.createElement('button');
        btn.id = BLOCK_AUTOPLAY_BTN_ID;
        btn.style.cssText = 'background:none;border:none;cursor:pointer;width:40px;height:40px;padding:8px;display:inline-flex;align-items:center;justify-content:center;border-radius:50%;vertical-align:middle;';
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            blockAutoplayEnabled = !blockAutoplayEnabled;
            localStorage.setItem(STORAGE_KEY, blockAutoplayEnabled);
            updateBlockAutoplayButton();
        });
        loopRenderer.before(btn);
        updateBlockAutoplayButton();
    }

    function blockVideoNearEnd() {
        const video = document.querySelector('video');
        if (!video || video.paused) return;
        if (!blockAutoplayEnabled || !isPlaylist() || userInitiatedSkip) return;
        if (video.duration > 0 && video.duration - video.currentTime < 1.5) {
            video.pause();
        }
    }

    function setupVideoEndedListener() {
        const video = document.querySelector('video');
        if (!video || video._blockAutoplaySetup) return;
        video._blockAutoplaySetup = true;

        video.addEventListener('ended', (e) => {
            if (!blockAutoplayEnabled || !isPlaylist() || userInitiatedSkip) {
                userInitiatedSkip = false;
                return;
            }
            e.stopImmediatePropagation();
            e.preventDefault();
            video.pause();
        }, true);
    }

    function interceptPlayerNextVideo() {
        const player = document.getElementById('movie_player');
        if (!player?.nextVideo) return;
        if (player.nextVideo._isAutoplayBlockWrapper) return;

        const original = player.nextVideo.bind(player);
        const wrapper = function () {
            if (blockAutoplayEnabled && isPlaylist() && !userInitiatedSkip) {
                const video = document.querySelector('video');
                if (video) video.pause();
                return;
            }
            userInitiatedSkip = false;
            return original();
        };
        wrapper._isAutoplayBlockWrapper = true;
        player.nextVideo = wrapper;
    }

    function setupNextButtonTracking() {
        const btn = document.querySelector('.ytp-next-button');
        if (!btn || btn._blockAutoplayTracked) return;
        btn._blockAutoplayTracked = true;
        btn.addEventListener('click', markUserSkip, true);
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'N' && e.shiftKey) markUserSkip();
    }, true);

    setInterval(() => {
        blockVideoNearEnd();
        createBlockAutoplayButton();
        updateBlockAutoplayButton();
        setupVideoEndedListener();
        interceptPlayerNextVideo();
        setupNextButtonTracking();
    }, 250);
})();
})();

// youtube-no-comments.user.js
(function () {
if (!(/^.*:\/\/.*\.youtube\.com\/.*$/.test(location.href))) return;
(function () {
    function hideComments() {
        document.querySelectorAll(
            'ytd-comments#comments, ytm-comment-section-renderer, #comment-teaser, ytm-engagement-panel-section-list-renderer[target-id="comment-item-section"]'
        ).forEach(function (el) {
            el.style.display = 'none';
        });

        document.querySelectorAll('yt-video-metadata-carousel-view-model').forEach(function (el) {
            if (el.querySelector('yt-comment-teaser-carousel-item-view-model, yt-comment-input-box-carousel-item-view-model')) {
                el.style.display = 'none';
            }
        });
    }

    setInterval(hideComments, 500);
})();
})();

// youtube-no-subscriptions.user.js
(function () {
if (!(/^.*:\/\/.*\.youtube\.com\/.*$/.test(location.href))) return;
const REDIRECT_URL = 'https://www.youtube.com/watch?v=MK3lB-uY0gE';

let lastRedirectedAt = 0;

setInterval(() => {
    const isSubscriptionsPage = window.location.href.match(/youtube\.com\/feed\/subscriptions/);
    if (isSubscriptionsPage && Date.now() - lastRedirectedAt > 2000) {
        window.location.replace(REDIRECT_URL);
        lastRedirectedAt = Date.now();
    }
}, 500);
})();

// youtube-no-suggestions.user.js
(function () {
if (!(/^.*:\/\/.*\.youtube\.com\/.*$/.test(location.href))) return;
(function () {
    function hideSuggestions() {
        document.querySelectorAll(
            [
                'ytd-watch-next-secondary-results-renderer',
                '#related',
                '.ytp-endscreen-content',
                'ytd-compact-video-renderer',
                'yt-lockup-view-model',
                'ytm-related-video-list-renderer',
                'ytm-item-section-renderer[section-identifier="related-items"]',
            ].join(', ')
        ).forEach(function (el) {
            el.style.display = 'none';
        });

        if (window.location.pathname === '/' || window.location.pathname === '/feed') {
            const grid = document.querySelector('ytd-rich-grid-renderer, ytd-two-column-browse-results-renderer');
            if (grid) {
                grid.style.display = 'none';
            }
        }
    }

    function redirectHomepage() {
        if (window.location.pathname === '/' || window.location.pathname === '/feed') {
            window.location.replace('https://www.youtube.com/feed/subscriptions');
        }
    }

    redirectHomepage();
    setInterval(hideSuggestions, 500);
})();
})();

// youtube-redirect.user.js
(function () {
if (!(/^.*:\/\/.*\.youtube\.com\/.*$/.test(location.href))) return;
const getDesiredYoutubeRedirectUrl = () => {
    if (window.location.href.match(/music.youtube.com/)) {
        return;
    }

    if (window.location.href.match(/youtube.com\/?$/)) {
        return 'https://www.youtube.com/feed/subscriptions';
    }

    const shortsMatch = window.location.href.match(/.*youtube.com\/shorts\/(.*)?$/)
    if (shortsMatch) {
        const shortId = shortsMatch[1];
        return window.location.href.replace('shorts/', 'watch?v=');
    }
}
let lastReplacedYoutubeURLAt = 0;

setInterval(() => {
    const desiredUrl = getDesiredYoutubeRedirectUrl();
    if (desiredUrl && window.location.href !== desiredUrl && Date.now() - lastReplacedYoutubeURLAt > 2000) {
        window.location.replace(desiredUrl);
        lastReplacedYoutubeURLAt = Date.now();
    }
}, 200);
})();

// youtube-time-waste-blocker.user.js
(function () {
if (!(/^.*:\/\/.*\.youtube\.com\/.*$/.test(location.href))) return;
(function () {
    const SUBSCRIPTIONS_URL = 'https://www.youtube.com/feed/subscriptions';
    const MEDITATION_VIDEO_URL = 'https://www.youtube.com/watch?v=MK3lB-uY0gE';

    const CRITERIA = [
        { action: 'delay', type: 'channelOrTitle', keywords: ['Naroditsky', 'Mini Motorways'] },
        { action: 'permit', type: 'channelOrTitle', keywords: ['Meditation', 'Singing Bowls', 'ASMR', 'Exercise', 'Breathing', 'Mindfulness', 'Workout', 'Visualisation', 'Visualization', "Mind's Eye"] },
    ];

    const MEDITATION_DURATION_S = 5 * 60;
    const BREATHING_PATTERNS = [
        { name: 'Box Breathing', steps: [['Breathe in', 4], ['Hold', 4], ['Breathe out', 4], ['Hold', 4]] },
        { name: '4-7-8 Breathing', steps: [['Breathe in', 4], ['Hold', 7], ['Breathe out', 8]] },
        { name: 'Simple Breathing', steps: [['Breathe in', 4], ['Breathe out', 4]] },
    ];

    const COOLDOWN_MS = 30 * 60 * 1000;
    const COOLDOWN_STORAGE_KEY = 'yt-time-waste-blocker-last-completed';
    let lastCompletedAt = parseInt(localStorage.getItem(COOLDOWN_STORAGE_KEY)) || 0;
    let activeOverlay = null;

    function queryFirst(...selectors) {
        for (const s of selectors) {
            const el = document.querySelector(s);
            if (el?.textContent?.trim()) return el;
        }
        return null;
    }

    function getVideoTitle() {
        const titleFromDoc = document.title.replace(/ - YouTube$/, '');
        if (titleFromDoc && titleFromDoc !== document.title) {
            return titleFromDoc;
        }
        const el = queryFirst(
            'h1.ytd-watch-metadata yt-formatted-string',
            'h2.slim-video-information-title .yt-core-attributed-string',
        );
        return el?.textContent?.trim() ?? '';
    }

    function getChannelName() {
        const el = queryFirst(
            'ytd-video-owner-renderer ytd-channel-name yt-formatted-string a',
            'ytm-slim-owner-renderer .slim-owner-icon-and-title .yt-core-attributed-string',
        );
        if (el?.textContent?.trim()) {
            return el.textContent.trim();
        }
        const metaChannel = document.querySelector('span[itemprop="author"] link[itemprop="name"]');
        return metaChannel?.getAttribute('content')?.trim() ?? '';
    }

    function containsKeyword(text, keywords) {
        const lower = text.toLowerCase();
        return keywords.some(function (kw) { return lower.includes(kw.toLowerCase()); });
    }

    function matchesCriterion(channel, title, criterion) {
        switch (criterion.type) {
            case 'channel':
                return containsKeyword(channel, criterion.keywords);
            case 'channelOrTitle':
                return containsKeyword(channel, criterion.keywords) || containsKeyword(title, criterion.keywords);
            default:
                return false;
        }
    }

    function getAction(channel, title) {
        for (var i = 0; i < CRITERIA.length; i++) {
            if (matchesCriterion(channel, title, CRITERIA[i])) return CRITERIA[i].action;
        }
        return 'deny';
    }

    function isWatchPage() {
        return window.location.pathname === '/watch';
    }

    function pauseVideo() {
        var video = document.querySelector('video');
        if (video) video.pause();
    }

    function playVideo() {
        var video = document.querySelector('video');
        if (video) video.play();
    }

    function createBreathingOverlay() {
        var pattern = BREATHING_PATTERNS[Math.floor(Math.random() * BREATHING_PATTERNS.length)];

        var overlay = document.createElement('div');
        overlay.id = 'breathing-gate-overlay';
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.95);z-index:999999;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;color:#fff;';

        var title = document.createElement('div');
        title.style.cssText = 'font-size:1.2rem;opacity:0.6;margin-bottom:2rem;';
        title.textContent = pattern.name;
        overlay.appendChild(title);

        var circle = document.createElement('div');
        circle.style.cssText = 'width:120px;height:120px;border-radius:50%;border:3px solid rgba(255,255,255,0.3);transition:transform 1s ease-in-out;margin-bottom:2rem;';
        overlay.appendChild(circle);

        var instruction = document.createElement('div');
        instruction.style.cssText = 'font-size:2rem;margin-bottom:1rem;min-height:3rem;';
        overlay.appendChild(instruction);

        var progress = document.createElement('div');
        progress.style.cssText = 'font-size:1rem;opacity:0.5;margin-bottom:2rem;';
        overlay.appendChild(progress);

        var meditationLink = document.createElement('a');
        meditationLink.href = MEDITATION_VIDEO_URL;
        meditationLink.textContent = 'Or meditate with singing bowls instead';
        meditationLink.style.cssText = 'color:rgba(255,255,255,0.5);font-size:0.9rem;text-decoration:underline;cursor:pointer;';
        overlay.appendChild(meditationLink);

        document.body.appendChild(overlay);
        activeOverlay = overlay;

        runBreathingExercise(pattern, circle, instruction, progress, overlay);
    }

    function calculateCycles(pattern) {
      const oneCycleDuration = pattern.steps
        .map(([_name, duration]) => duration)
        .reduce((prev, current) => prev + current, 0);
      const cycles = MEDITATION_DURATION_S / oneCycleDuration;
      return Math.ceil(cycles);
    }

    function runBreathingExercise(pattern, circle, instruction, progress, overlay) {
        var currentCycle = 0;
        var cycles = calculateCycles(pattern);
        var currentStep = 0;
        var secondsLeft = pattern.steps[0][1];
        var paused = false;

        function updateDisplay() {
            var stepName = pattern.steps[currentStep][0];
            var stepDuration = pattern.steps[currentStep][1];
            instruction.textContent = stepName + '...';
            progress.textContent = 'Cycle ' + (currentCycle + 1) + ' of ' + cycles + '  •  ' + secondsLeft + 's';

            var scale = 1;
            var elapsed = stepDuration - secondsLeft;
            var t = elapsed / stepDuration;
            if (stepName === 'Breathe in') {
                scale = 1 + t * 0.5;
            } else if (stepName === 'Breathe out') {
                scale = 1.5 - t * 0.5;
            } else {
                scale = stepName === 'Hold' && currentStep > 0 && pattern.steps[currentStep - 1][0] === 'Breathe in' ? 1.5 : 1;
            }
            circle.style.transform = 'scale(' + scale + ')';
        }

        function tick() {
            if (paused) return;

            secondsLeft--;
            if (secondsLeft <= 0) {
                currentStep++;
                if (currentStep >= pattern.steps.length) {
                    currentStep = 0;
                    currentCycle++;
                    if (currentCycle >= cycles) {
                        completeExercise(overlay);
                        return;
                    }
                }
                secondsLeft = pattern.steps[currentStep][1];
            }
            updateDisplay();
        }

        document.addEventListener('visibilitychange', function handler() {
            if (!document.body.contains(overlay)) {
                document.removeEventListener('visibilitychange', handler);
                return;
            }
            paused = document.hidden;
        });

        updateDisplay();
        var intervalId = setInterval(function () {
            pauseVideo();
            tick();
        }, 1000);
        overlay._breathingIntervalId = intervalId;
    }

    function completeExercise(overlay) {
        if (overlay._breathingIntervalId) clearInterval(overlay._breathingIntervalId);
        while (overlay.firstChild) overlay.removeChild(overlay.firstChild);
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.95);z-index:999999;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;color:#fff;';

        var msg = document.createElement('div');
        msg.style.cssText = 'font-size:1.5rem;margin-bottom:2rem;';
        msg.textContent = 'Consider meditating instead';
        overlay.appendChild(msg);

        var link = document.createElement('a');
        link.href = MEDITATION_VIDEO_URL;
        link.textContent = 'Open singing bowls meditation';
        link.style.cssText = 'color:#7cb3ff;font-size:1.2rem;text-decoration:underline;margin-bottom:2rem;';
        overlay.appendChild(link);

        var countdown = document.createElement('div');
        countdown.style.cssText = 'font-size:1rem;opacity:0.5;';
        overlay.appendChild(countdown);

        var remaining = 15;
        countdown.textContent = 'Video available in ' + remaining + 's';

        var timer = setInterval(function () {
            remaining--;
            if (remaining <= 0) {
                clearInterval(timer);
                lastCompletedAt = Date.now();
                localStorage.setItem(COOLDOWN_STORAGE_KEY, String(lastCompletedAt));
                overlay.remove();
                activeOverlay = null;
                playVideo();
            } else {
                countdown.textContent = 'Video available in ' + remaining + 's';
            }
        }, 1000);
    }

    let lastCheckedUrl = '';

    setInterval(function () {
        if (!isWatchPage()) {
            if (activeOverlay) {
                activeOverlay.remove();
                activeOverlay = null;
            }
            return;
        }

        if (window.location.href === lastCheckedUrl) return;

        var channel = getChannelName();
        var title = getVideoTitle();
        if (!channel && !title) return;

        lastCheckedUrl = window.location.href;
        var action = getAction(channel, title);

        if (action === 'deny') {
            window.location.replace(SUBSCRIPTIONS_URL);
        } else if (action === 'delay' && (Date.now() - lastCompletedAt > COOLDOWN_MS)) {
            pauseVideo();
            if (!activeOverlay) {
                createBreathingOverlay();
            }
        }
    }, 500);
})();
})();
