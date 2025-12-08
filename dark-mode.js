// ==UserScript==
// @name         Simple Dark Mode (Invert)
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  Apply dark mode to websites using color inversion
// @author       You
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function() {
  'use strict';

  // Check if body already has dark background
  function isDarkMode() {
    const body = document.body;
    const bgColor = window.getComputedStyle(body).backgroundColor;
    
    // Parse RGB values
    const rgb = bgColor.match(/\d+/g);
    if (rgb && rgb.length >= 3) {
      const r = parseInt(rgb[0]);
      const g = parseInt(rgb[1]);
      const b = parseInt(rgb[2]);
      
      // Calculate brightness (perceived luminance)
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      
      // If brightness is less than 128, it's already dark
      return brightness < 128;
    }
    
    return false;
  }

  // Apply dark mode using invert filter
  function applyDarkMode() {
    if (isDarkMode()) {
      console.log('Dark mode already detected, skipping...');
      return;
    }

    const style = document.createElement('style');
    style.id = 'simple-dark-mode-invert';
    style.textContent = `
      html {
        filter: invert(1) hue-rotate(180deg);
        background-color: #fff;
      }
      
      /* Invert images and videos back to normal */
      img, video, iframe, canvas, svg,
      [style*="background-image"] {
        filter: invert(1) hue-rotate(180deg);
      }
      
      /* Handle background images */
      *[style*="background-image"] {
        filter: invert(1) hue-rotate(180deg);
      }
    `;

    document.head.appendChild(style);
    console.log('Dark mode (invert) applied!');
  }

  // Wait for page to load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyDarkMode);
  } else {
    applyDarkMode();
  }

  // Re-check after a short delay in case styles load late
  setTimeout(applyDarkMode, 500);

})();
