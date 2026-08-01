// ==UserScript==
// @name         Simple Dark Mode (Invert)
// @namespace    http://tampermonkey.net/
// @version      6.1
// @description  Apply dark mode to websites using color inversion with toggles
// @author       You
// @match        *://*/*
// @run-at       document-start
// @grant        none
// @updateURL    https://raw.githubusercontent.com/dylan-chong/userscripts/main/dark-mode.user.js
// @downloadURL  https://raw.githubusercontent.com/dylan-chong/userscripts/main/dark-mode.user.js
// ==/UserScript==

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
