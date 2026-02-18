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
  let allButtons = [];

  function getStorageKey(setting) {
    return `darkmode_${domain}_${setting}`;
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

  function parseRgba(color) {
    const parts = color.match(/[\d.]+/g);
    if (!parts || parts.length < 3) return null;
    return {
      r: parseInt(parts[0]),
      g: parseInt(parts[1]),
      b: parseInt(parts[2]),
      a: parts.length >= 4 ? parseFloat(parts[3]) : 1,
    };
  }

  function rgbaBrightness(rgba) {
    return (rgba.r * 299 + rgba.g * 587 + rgba.b * 114) / 1000;
  }

  function getGradientBrightness(backgroundImage) {
    if (!backgroundImage || backgroundImage === 'none') return null;
    const colorRegex = /rgba?\([^)]+\)/g;
    const colors = backgroundImage.match(colorRegex);
    if (!colors || colors.length === 0) return null;

    let total = 0, count = 0;
    for (const color of colors) {
      const rgba = parseRgba(color);
      if (rgba && rgba.a >= 0.1) {
        total += rgbaBrightness(rgba);
        count++;
      }
    }
    return count > 0 ? total / count : null;
  }

  function getBackgroundBrightness(style) {
    const rgba = parseRgba(style.backgroundColor);
    if (rgba && rgba.a >= 0.1) return rgbaBrightness(rgba);
    return getGradientBrightness(style.backgroundImage);
  }

  function getVisibleBrightness(el) {
    while (el) {
      const brightness = getBackgroundBrightness(window.getComputedStyle(el));
      if (brightness !== null) return { el, brightness };
      el = el.parentElement;
    }
    return { el: document.documentElement, brightness: 255 };
  }

  function isPageDark() {
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
    return avgBrightness < 128;
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
      
      video {
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

  function updateButtonPositions() {
    allButtons.forEach(button => {
      if (buttonsOnRight) {
        button.style.right = '16px';
        button.style.left = 'auto';
      } else {
        button.style.left = '16px';
        button.style.right = 'auto';
      }
    });
  }

  function createImageToggleButton(imageStyle) {
    const button = document.createElement('button');
    button.id = 'dark-mode-image-toggle';
    button.textContent = '🖼️';
    button.title = 'Toggle image/video inversion';
    button.style.cssText = `
      position: fixed;
      bottom: 16px;
      ${buttonsOnRight ? 'right: 16px;' : 'left: 16px;'}
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: 2px solid #666;
      background-color: #333;
      color: #fff;
      font-size: 16px;
      cursor: pointer;
      z-index: 999999;
      box-shadow: 0 2px 10px rgba(0,0,0,0.3);
      transition: all 0.2s ease;
      opacity: ${imagesInverted ? '1' : '0.5'};
    `;

    button.addEventListener('mouseenter', () => {
      button.style.transform = 'scale(1.1)';
    });

    button.addEventListener('mouseleave', () => {
      button.style.transform = 'scale(1)';
    });

    button.addEventListener('click', () => {
      imagesInverted = !imagesInverted;
      updateImageInversion(imageStyle);
      button.style.opacity = imagesInverted ? '1' : '0.5';
      saveSettings();
    });

    document.body.appendChild(button);
    allButtons.push(button);
    return button;
  }

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

  function createDarkModeToggleButton() {
    const button = document.createElement('button');
    button.id = 'dark-mode-toggle';
    button.textContent = getDarkModeIcon(darkModeState);
    button.title = getDarkModeTitle(darkModeState);
    button.style.cssText = `
      position: fixed;
      bottom: 56px;
      ${buttonsOnRight ? 'right: 16px;' : 'left: 16px;'}
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: 2px solid #666;
      background-color: #333;
      color: #fff;
      font-size: 16px;
      cursor: pointer;
      z-index: 999999;
      box-shadow: 0 2px 10px rgba(0,0,0,0.3);
      transition: all 0.2s ease;
    `;

    button.addEventListener('mouseenter', () => {
      button.style.transform = 'scale(1.1)';
    });

    button.addEventListener('mouseleave', () => {
      button.style.transform = 'scale(1)';
    });

    button.addEventListener('click', () => {
      const states = ['auto', 'off', 'on'];
      const currentIndex = states.indexOf(darkModeState);
      darkModeState = states[(currentIndex + 1) % 3];
      button.textContent = getDarkModeIcon(darkModeState);
      button.title = getDarkModeTitle(darkModeState);
      checkAndApplyDarkMode();
      saveSettings();
    });

    document.body.appendChild(button);
    allButtons.push(button);
    return button;
  }

  function createPositionToggleButton() {
    const button = document.createElement('button');
    button.id = 'dark-mode-position-toggle';
    button.textContent = buttonsOnRight ? '←' : '→';
    button.title = 'Toggle button position';
    button.style.cssText = `
      position: fixed;
      bottom: 96px;
      ${buttonsOnRight ? 'right: 16px;' : 'left: 16px;'}
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: 2px solid #666;
      background-color: #333;
      color: #fff;
      font-size: 16px;
      cursor: pointer;
      z-index: 999999;
      box-shadow: 0 2px 10px rgba(0,0,0,0.3);
      transition: all 0.2s ease;
    `;

    button.addEventListener('mouseenter', () => {
      button.style.transform = 'scale(1.1)';
    });

    button.addEventListener('mouseleave', () => {
      button.style.transform = 'scale(1)';
    });

    button.addEventListener('click', () => {
      buttonsOnRight = !buttonsOnRight;
      button.textContent = buttonsOnRight ? '←' : '→';
      updateButtonPositions();
      saveSettings();
    });

    document.body.appendChild(button);
    allButtons.push(button);
    return button;
  }

  let hasSavedSettings = false;
  let imageStyle = null;

  function init() {
    loadSettings();
    
    const savedDarkModeState = localStorage.getItem(getStorageKey('darkModeState'));
    hasSavedSettings = savedDarkModeState !== null;
    
    if (!imageStyle) {
      imageStyle = createImageInvertStyle();
    }
    updateImageInversion(imageStyle);
    
    if (document.body && allButtons.length === 0) {
      createImageToggleButton(imageStyle);
      createDarkModeToggleButton();
      createPositionToggleButton();
    } else if (!document.body) {
      const observer = new MutationObserver(() => {
        if (document.body && allButtons.length === 0) {
          createImageToggleButton(imageStyle);
          createDarkModeToggleButton();
          createPositionToggleButton();
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
    const run = () => {
      try {
        checkAndApplyDarkMode();
      } catch (e) {
        console.error(e);
      }
    };

    const fastInterval = setInterval(run, 1000 / 10);
    setTimeout(() => {
      clearInterval(fastInterval);
      setInterval(run, 1000 / 4);
    }, 10000);
  }

  init();
  checkAndApplyDarkMode();
  startPeriodicChecking();

  window.isPageDark = isPageDark;
})();
