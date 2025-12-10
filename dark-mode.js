// ==UserScript==
// @name         Simple Dark Mode (Invert)
// @namespace    http://tampermonkey.net/
// @version      2.2
// @description  Apply dark mode to websites using color inversion with toggles
// @author       You
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function() {
  'use strict';

  let imagesInverted = true;
  let darkModeEnabled = true;
  let darkModeStyle = null;

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

  function applyDarkMode() {
    if (isDarkMode()) {
      console.log('Dark mode already detected, skipping...');
      return;
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

  function createImageToggleButton(imageStyle) {
    const button = document.createElement('button');
    button.id = 'dark-mode-image-toggle';
    button.textContent = '🖼️';
    button.title = 'Toggle image inversion';
    button.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
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
      imagesInverted = !imagesInverted;
      updateImageInversion(imageStyle);
      button.style.opacity = imagesInverted ? '1' : '0.5';
    });

    document.body.appendChild(button);
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
      right: 20px;
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
      darkModeEnabled = !darkModeEnabled;
      if (darkModeEnabled) {
        applyDarkMode();
      } else {
        removeDarkMode();
      }
      button.style.opacity = darkModeEnabled ? '1' : '0.5';
    });

    document.body.appendChild(button);
    return button;
  }

  function init() {
    applyDarkMode();
    
    if (!isDarkMode()) {
      const imageStyle = createImageInvertStyle();
      updateImageInversion(imageStyle);
      
      if (document.body) {
        createImageToggleButton(imageStyle);
        createDarkModeToggleButton();
      } else {
        const observer = new MutationObserver(() => {
          if (document.body) {
            createImageToggleButton(imageStyle);
            createDarkModeToggleButton();
            observer.disconnect();
          }
        });
        observer.observe(document.documentElement, { childList: true });
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  setTimeout(init, 500);

})();
