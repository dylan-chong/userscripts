// ==UserScript==
// @name         Simple Dark Mode (Invert)
// @namespace    http://tampermonkey.net/
// @version      3.3
// @description  Apply dark mode to websites using color inversion with toggles
// @author       You
// @match        *://*/*
// @run-at       document-start
// @grant        none
// @updateURL    https://raw.githubusercontent.com/dylan-chong/userscripts/main/dark-mode.user.js
// @downloadURL  https://raw.githubusercontent.com/dylan-chong/userscripts/main/dark-mode.user.js
// ==/UserScript==

(function() {
  'use strict';

  let settings = {
    darkModeState: 'auto',
    imagesInverted: false,
    buttonsOnRight: true,
  };
  let darkModeStyle = null;
  let preloadDimStyle = null;
  const domain = window.location.hostname;

  const STORAGE_KEY = `darkmode_v2_${domain}`;

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

      const saved = JSON.parse(raw);
      if (['auto', 'off', 'on'].includes(saved.darkModeState)) {
        settings.darkModeState = saved.darkModeState;
      }
      if (typeof saved.imagesInverted === 'boolean') {
        settings.imagesInverted = saved.imagesInverted;
      }
      if (typeof saved.buttonsOnRight === 'boolean') {
        settings.buttonsOnRight = saved.buttonsOnRight;
      }
    } catch (e) {
      console.error(e);
    }
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

    const avgBrightness = samples.reduce((sum, s) => sum + s.brightness, 0) / samples.length;
    const isDark = avgBrightness < 128;

    if (log) {
      console.info(`[DarkMode] avgBrightness=${avgBrightness.toFixed(1)} isDark=${isDark} samples=${samples.length} took=${(performance.now() - t0).toFixed(1)}ms`);
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
    if (settings.darkModeState !== 'auto') return;
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

  function applyDarkMode(force = false) {
    if (!darkModeStyle) {
      darkModeStyle = document.createElement('style');
      darkModeStyle.id = 'simple-dark-mode-invert';
      document.head.appendChild(darkModeStyle);
    }

    darkModeStyle.textContent = `
      html {
        filter: invert(1) hue-rotate(180deg);
        background-color: #fff;
      }
      
      video,
      iframe {
        filter: invert(1) hue-rotate(180deg);
      }
    `;
  }

  function removeDarkMode() {
    if (darkModeStyle) {
      darkModeStyle.textContent = '';
    }
  }

  function createImageInvertStyle() {
    const style = document.createElement('style');
    style.id = 'image-invert-toggle';
    document.head.appendChild(style);
    return style;
  }

  function updateImageInversion(style) {
    if (settings.imagesInverted) {
      style.textContent = '';
    } else {
      style.textContent = `
        img,
        video,
        [style*="background-image"],
        *[style*="background-image"] {
          filter: invert(1) hue-rotate(180deg) !important;
        }
      `;
    }
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

  let menuOpen = false;
  let menuContainer = null;
  let imageStyle = null;

  function createMenuButton(text, title, onClick) {
    const button = document.createElement('button');
    button.textContent = text;
    button.title = title;
    button.style.cssText = BUTTON_STYLE;
    button.addEventListener('mouseenter', () => { button.style.transform = 'translateY(0) scale(1.1)'; });
    button.addEventListener('mouseleave', () => { button.style.transform = 'translateY(0) scale(1)'; });
    button.addEventListener('click', onClick);
    return button;
  }

  function getMenuLeft() {
    return settings.buttonsOnRight ? `calc(100vw - 52px)` : '16px';
  }

  function updateMenuPosition() {
    if (!menuContainer) return;
    menuContainer.style.left = getMenuLeft();
  }

  function toggleMenu() {
    menuOpen = !menuOpen;
    const childButtons = menuContainer.querySelectorAll('.dm-child-btn');
    childButtons.forEach((btn, i) => {
      if (menuOpen) {
        btn.style.display = 'block';
        btn.style.opacity = '0';
        btn.style.transform = 'translateY(10px) scale(0.8)';
        requestAnimationFrame(() => {
          btn.style.transition = `opacity 0.2s ease ${i * 0.05}s, transform 0.2s ease ${i * 0.05}s`;
          btn.style.opacity = btn._targetOpacity || '1';
          btn.style.transform = 'translateY(0) scale(1)';
        });
      } else {
        btn.style.transition = 'opacity 0.15s ease, transform 0.15s ease';
        btn.style.opacity = '0';
        btn.style.transform = 'translateY(10px) scale(0.8)';
        setTimeout(() => { btn.style.display = 'none'; }, 150);
      }
    });
  }

  function createUI() {
    if (!imageStyle) {
      imageStyle = createImageInvertStyle();
    }
    updateImageInversion(imageStyle);

    menuContainer = document.createElement('div');
    menuContainer.id = 'dark-mode-menu';
    menuContainer.style.cssText = `
      position: fixed;
      bottom: 16px;
      left: ${getMenuLeft()};
      display: flex;
      flex-direction: column-reverse;
      gap: 8px;
      z-index: 999999;
      transition: left 0.3s ease;
    `;

    const mainButton = createMenuButton('⚙', 'Dark mode settings', toggleMenu);
    menuContainer.appendChild(mainButton);

    const positionButton = createMenuButton(
      settings.buttonsOnRight ? '←' : '→',
      'Toggle button position',
      () => {
        settings.buttonsOnRight = !settings.buttonsOnRight;
        positionButton.textContent = settings.buttonsOnRight ? '←' : '→';
        updateMenuPosition();
        saveSettings();
      }
    );
    positionButton.className = 'dm-child-btn';
    positionButton.style.display = 'none';
    menuContainer.appendChild(positionButton);

    const darkModeButton = createMenuButton(
      getDarkModeIcon(settings.darkModeState),
      getDarkModeTitle(settings.darkModeState),
      () => {
        const states = ['auto', 'off', 'on'];
        const currentIndex = states.indexOf(settings.darkModeState);
        settings.darkModeState = states[(currentIndex + 1) % 3];
        darkModeButton.textContent = getDarkModeIcon(settings.darkModeState);
        darkModeButton.title = getDarkModeTitle(settings.darkModeState);
        checkAndApplyDarkMode();
        saveSettings();
      }
    );
    darkModeButton.id = 'dark-mode-toggle';
    darkModeButton.className = 'dm-child-btn';
    darkModeButton.style.display = 'none';
    menuContainer.appendChild(darkModeButton);

    const imageButton = createMenuButton(
      '🖼️',
      'Toggle image/video inversion',
      () => {
        settings.imagesInverted = !settings.imagesInverted;
        updateImageInversion(imageStyle);
        imageButton._targetOpacity = settings.imagesInverted ? '1' : '0.5';
        imageButton.style.opacity = imageButton._targetOpacity;
        saveSettings();
      }
    );
    imageButton._targetOpacity = settings.imagesInverted ? '1' : '0.5';
    imageButton.style.opacity = imageButton._targetOpacity;
    imageButton.className = 'dm-child-btn';
    imageButton.style.display = 'none';
    menuContainer.appendChild(imageButton);

    document.body.appendChild(menuContainer);
  }

  function init() {
    loadSettings();
    applyPreloadDim();

    if (document.body) {
      createUI();
    } else {
      const observer = new MutationObserver(() => {
        if (document.body) {
          createUI();
          observer.disconnect();
        }
      });
      observer.observe(document.documentElement, { childList: true });
    }

    setTimeout(() => {
      removePreloadDim();
      checkAndApplyDarkMode();
      startPeriodicChecking();
    }, 250);
  }

  function updateDarkModeButton() {
    const darkModeButton = document.getElementById('dark-mode-toggle');
    if (darkModeButton) {
      darkModeButton.textContent = getDarkModeIcon(settings.darkModeState);
      darkModeButton.title = getDarkModeTitle(settings.darkModeState);
    }
  }

  function checkAndApplyDarkMode() {
    if (settings.darkModeState === 'on') {
      applyDarkMode(true);
    } else if (settings.darkModeState === 'off') {
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
