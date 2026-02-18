// ==UserScript==
// @name         Simple Dark Mode (Invert)
// @namespace    http://tampermonkey.net/
// @version      2.5
// @description  Apply dark mode to websites using color inversion with toggles
// @author       You
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function() {
  'use strict';

  let imagesInverted = true;
  let darkModeState = 'auto'; // 'auto', 'off', 'on'
  let buttonsOnRight = true;
  let darkModeStyle = null;
  const domain = window.location.hostname;

  function getStorageKey(setting) {
    return `darkmode_v2_${domain}_${setting}`;
  }

  function saveSettings() {
    try {
      localStorage.setItem(getStorageKey('darkModeState'), darkModeState);
      localStorage.setItem(getStorageKey('imagesInverted'), imagesInverted);
      localStorage.setItem(getStorageKey('buttonsOnRight'), buttonsOnRight);
    } catch (e) {
      console.error(e);
    }
  }

  function loadSettings() {
    try {
      const savedDarkModeState = localStorage.getItem(getStorageKey('darkModeState'));
      const savedImagesInverted = localStorage.getItem(getStorageKey('imagesInverted'));
      const savedButtonsOnRight = localStorage.getItem(getStorageKey('buttonsOnRight'));
      
      if (savedDarkModeState !== null && ['auto', 'off', 'on'].includes(savedDarkModeState)) {
        darkModeState = savedDarkModeState;
      }
      
      if (savedImagesInverted !== null) {
        imagesInverted = savedImagesInverted === 'true';
      }
      
      if (savedButtonsOnRight !== null) {
        buttonsOnRight = savedButtonsOnRight === 'true';
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

    if (/^rgba?\(/.test(color)) {
      if (alpha < 0.1) return null;
      const r = parseInt(nums[0]), g = parseInt(nums[1]), b = parseInt(nums[2]);
      return (r * 299 + g * 587 + b * 114) / 1000;
    }

    if (/^oklch\(|^oklab\(/.test(color)) {
      if (alpha < 0.1) return null;
      return parseFloat(nums[0]) * 255;
    }

    if (/^lch\(|^lab\(/.test(color)) {
      if (alpha < 0.1) return null;
      return parseFloat(nums[0]) * 2.55;
    }

    if (/^hsla?\(/.test(color)) {
      if (alpha < 0.1) return null;
      return parseFloat(nums[2]) * 2.55;
    }

    if (/^color\(/.test(color)) {
      const colorNums = color.replace(/^color\(\s*[\w-]+\s*/, '').match(/[\d.]+/g);
      if (!colorNums || colorNums.length < 3) return null;
      const a = colorNums.length >= 4 ? parseFloat(colorNums[3]) : 1;
      if (a < 0.1) return null;
      const r = parseFloat(colorNums[0]) * 255, g = parseFloat(colorNums[1]) * 255, b = parseFloat(colorNums[2]) * 255;
      return (r * 299 + g * 587 + b * 114) / 1000;
    }

    return null;
  }

  function getGradientBrightness(backgroundImage) {
    if (!backgroundImage || backgroundImage === 'none') return null;
    const tokens = backgroundImage.match(/\w+\([^)]+\)/g);
    if (!tokens) return null;

    let total = 0, count = 0;
    for (const token of tokens) {
      if (/^(linear|radial|conic|repeating)/.test(token)) continue;
      const brightness = getColorBrightness(token);
      if (brightness !== null) {
        total += brightness;
        count++;
      }
    }
    return count > 0 ? total / count : null;
  }

  function getBackgroundBrightness(style) {
    return getColorBrightness(style.backgroundColor) ?? getGradientBrightness(style.backgroundImage);
  }

  function getVisibleBrightness(el) {
    while (el) {
      const brightness = getBackgroundBrightness(window.getComputedStyle(el));
      if (brightness !== null) return { el, brightness };
      el = el.parentElement;
    }
    return { el: document.documentElement, brightness: 255 };
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

  function isPageDark() {
    const t0 = performance.now();
    // const darkScheme = hasDarkColorScheme();
    // if (darkScheme) {
    //   console.log('[DarkMode] hasDarkColorScheme=true, skipping pixel sampling');
    //   return true;
    // }

    const samplePoints = [];
    const cols = 10;
    const rows = 5;
    
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const x = (window.innerWidth / (cols + 1)) * (i + 1);
        const y = (window.innerHeight / (rows + 1)) * (j + 1);
        samplePoints.push({ x, y });
      }
    }

    const samples = [];
    samplePoints.forEach(({ x, y }) => {
      const el = document.elementFromPoint(x, y);
      if (el) {
        const result = getVisibleBrightness(el);
        samples.push({ x, y, ...result });
      }
    });

    const avgBrightness = samples.reduce((sum, s) => sum + s.brightness, 0) / samples.length;
    const isDark = avgBrightness < 128;

    console.log(
      `[DarkMode] avgBrightness=${avgBrightness.toFixed(1)} isDark=${isDark} samples=${samples.length} took=${(performance.now() - t0).toFixed(1)}ms`,
      '\n  per-sample:',
      samples.map(s => {
        const style = window.getComputedStyle(s.el);
        return `(${Math.round(s.x)},${Math.round(s.y)}) brightness=${s.brightness.toFixed(1)} el=<${s.el.tagName.toLowerCase()}> bg="${style.backgroundColor}" bgImg="${style.backgroundImage.slice(0, 60)}"`;
      }).join('\n  ')
    );

    return isDark;
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
    if (imagesInverted) {
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
    return buttonsOnRight ? `calc(100vw - 52px)` : '16px';
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
      buttonsOnRight ? '←' : '→',
      'Toggle button position',
      () => {
        buttonsOnRight = !buttonsOnRight;
        positionButton.textContent = buttonsOnRight ? '←' : '→';
        updateMenuPosition();
        saveSettings();
      }
    );
    positionButton.className = 'dm-child-btn';
    positionButton.style.display = 'none';
    menuContainer.appendChild(positionButton);

    const darkModeButton = createMenuButton(
      getDarkModeIcon(darkModeState),
      getDarkModeTitle(darkModeState),
      () => {
        const states = ['auto', 'off', 'on'];
        const currentIndex = states.indexOf(darkModeState);
        darkModeState = states[(currentIndex + 1) % 3];
        darkModeButton.textContent = getDarkModeIcon(darkModeState);
        darkModeButton.title = getDarkModeTitle(darkModeState);
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
        imagesInverted = !imagesInverted;
        updateImageInversion(imageStyle);
        imageButton._targetOpacity = imagesInverted ? '1' : '0.5';
        imageButton.style.opacity = imageButton._targetOpacity;
        saveSettings();
      }
    );
    imageButton._targetOpacity = imagesInverted ? '1' : '0.5';
    imageButton.style.opacity = imageButton._targetOpacity;
    imageButton.className = 'dm-child-btn';
    imageButton.style.display = 'none';
    menuContainer.appendChild(imageButton);

    document.body.appendChild(menuContainer);
  }

  function init() {
    loadSettings();

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
  }

  function updateDarkModeButton() {
    const darkModeButton = document.getElementById('dark-mode-toggle');
    if (darkModeButton) {
      darkModeButton.textContent = getDarkModeIcon(darkModeState);
      darkModeButton.title = getDarkModeTitle(darkModeState);
    }
  }

  function checkAndApplyDarkMode() {
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
  }

  function startPeriodicChecking() {
    const fastInterval = setInterval(checkAndApplyDarkMode, 1000 / 5);
    setTimeout(() => {
      clearInterval(fastInterval);
      setInterval(checkAndApplyDarkMode, 1000 / 2);
    }, 10000);
  }

  init();
  checkAndApplyDarkMode();
  startPeriodicChecking();

  window.isPageDark = isPageDark;
})();
