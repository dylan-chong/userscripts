// ==UserScript==
// @name         Simple Dark Mode (Invert)
// @namespace    http://tampermonkey.net/
// @version      2.4
// @description  Apply dark mode to websites using color inversion with toggles
// @author       You
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function() {
  'use strict';

  let imagesInverted = true;
  let darkModeEnabled = true;
  let buttonsOnRight = true;
  let darkModeStyle = null;
  const domain = window.location.hostname;
  let allButtons = [];

  function getStorageKey(setting) {
    return `darkmode_${domain}_${setting}`;
  }

  function saveSettings() {
    try {
      localStorage.setItem(getStorageKey('darkModeEnabled'), darkModeEnabled);
      localStorage.setItem(getStorageKey('imagesInverted'), imagesInverted);
      localStorage.setItem(getStorageKey('buttonsOnRight'), buttonsOnRight);
      console.log('Settings saved for', domain);
    } catch (e) {
      console.error('Failed to save settings:', e);
    }
  }

  function loadSettings() {
    try {
      const savedDarkMode = localStorage.getItem(getStorageKey('darkModeEnabled'));
      const savedImagesInverted = localStorage.getItem(getStorageKey('imagesInverted'));
      const savedButtonsOnRight = localStorage.getItem(getStorageKey('buttonsOnRight'));
      
      if (savedDarkMode !== null) {
        darkModeEnabled = savedDarkMode === 'true';
        console.log('Loaded darkModeEnabled:', darkModeEnabled);
      }
      
      if (savedImagesInverted !== null) {
        imagesInverted = savedImagesInverted === 'true';
        console.log('Loaded imagesInverted:', imagesInverted);
      }
      
      if (savedButtonsOnRight !== null) {
        buttonsOnRight = savedButtonsOnRight === 'true';
        console.log('Loaded buttonsOnRight:', buttonsOnRight);
      }
    } catch (e) {
      console.error('Failed to load settings:', e);
    }
  }

  function isDarkMode() {
    const body = document.body;
    const bgColor = window.getComputedStyle(body).backgroundColor;
    
    console.log('Detected background color:', bgColor);
    
    const rgb = bgColor.match(/\d+/g);
    if (rgb && rgb.length >= 3) {
      const r = parseInt(rgb[0]);
      const g = parseInt(rgb[1]);
      const b = parseInt(rgb[2]);
      
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      
      console.log(`RGB: (${r}, ${g}, ${b}), Brightness: ${brightness.toFixed(2)}`);
      
      const isDark = brightness < 128;
      console.log('Is dark mode:', isDark);
      
      return isDark;
    }
    
    return false;
  }

  function applyDarkMode(force = false) {
    if (!force) {
      const alreadyDark = isDarkMode();
      
      if (alreadyDark) {
        console.log('Dark mode already detected, skipping...');
        darkModeEnabled = false;
        return;
      }
    }

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

    console.log('Dark mode (invert) applied!');
  }

  function removeDarkMode() {
    if (darkModeStyle) {
      darkModeStyle.textContent = '';
    }
    console.log('Dark mode removed!');
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
        button.style.right = '20px';
        button.style.left = 'auto';
      } else {
        button.style.left = '20px';
        button.style.right = 'auto';
      }
    });
  }

  function createImageToggleButton(imageStyle) {
    const button = document.createElement('button');
    button.id = 'dark-mode-image-toggle';
    button.textContent = '🖼️';
    button.title = 'Toggle image inversion';
    button.style.cssText = `
      position: fixed;
      bottom: 20px;
      ${buttonsOnRight ? 'right: 20px;' : 'left: 20px;'}
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border: 2px solid #666;
      background-color: #333;
      color: #fff;
      font-size: 20px;
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

  function createDarkModeToggleButton() {
    const button = document.createElement('button');
    button.id = 'dark-mode-toggle';
    button.textContent = '🌙';
    button.title = 'Toggle dark mode';
    button.style.cssText = `
      position: fixed;
      bottom: 70px;
      ${buttonsOnRight ? 'right: 20px;' : 'left: 20px;'}
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border: 2px solid #666;
      background-color: #333;
      color: #fff;
      font-size: 20px;
      cursor: pointer;
      z-index: 999999;
      box-shadow: 0 2px 10px rgba(0,0,0,0.3);
      transition: all 0.2s ease;
      opacity: ${darkModeEnabled ? '1' : '0.5'};
    `;

    button.addEventListener('mouseenter', () => {
      button.style.transform = 'scale(1.1)';
    });

    button.addEventListener('mouseleave', () => {
      button.style.transform = 'scale(1)';
    });

    button.addEventListener('click', () => {
      darkModeEnabled = !darkModeEnabled;
      if (darkModeEnabled) {
        applyDarkMode(true);
      } else {
        removeDarkMode();
      }
      button.style.opacity = darkModeEnabled ? '1' : '0.5';
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
      bottom: 120px;
      ${buttonsOnRight ? 'right: 20px;' : 'left: 20px;'}
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border: 2px solid #666;
      background-color: #333;
      color: #fff;
      font-size: 20px;
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

  function init() {
    loadSettings();
    
    if (darkModeEnabled) {
      applyDarkMode();
    } else {
      const alreadyDark = isDarkMode();
      if (alreadyDark) {
        darkModeEnabled = false;
      }
    }
    
    const imageStyle = createImageInvertStyle();
    updateImageInversion(imageStyle);
    
    if (document.body) {
      createImageToggleButton(imageStyle);
      createDarkModeToggleButton();
      createPositionToggleButton();
    } else {
      const observer = new MutationObserver(() => {
        if (document.body) {
          createImageToggleButton(imageStyle);
          createDarkModeToggleButton();
          createPositionToggleButton();
          observer.disconnect();
        }
      });
      observer.observe(document.documentElement, { childList: true });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  setTimeout(init, 500);

})();
