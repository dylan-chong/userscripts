// ==UserScript==
// @name         Simple Dark Mode
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Apply dark mode to websites that don't have it
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

  // Apply dark mode styles
  function applyDarkMode() {
    if (isDarkMode()) {
      console.log('Dark mode already detected, skipping...');
      return;
    }

    const style = document.createElement('style');
    style.id = 'simple-dark-mode';
    style.textContent = `
      html {
        background-color: #1a1a1a !important;
      }
      
      body {
        background-color: #1a1a1a !important;
        color: #e0e0e0 !important;
      }
      
      * {
        background-color: inherit !important;
        color: inherit !important;
        border-color: #444 !important;
      }
      
      a {
        color: #6db3f2 !important;
      }
      
      a:visited {
        color: #a78bd6 !important;
      }
      
      input, textarea, select, button {
        background-color: #2a2a2a !important;
        color: #e0e0e0 !important;
        border: 1px solid #444 !important;
      }
      
      img, video, iframe {
        opacity: 0.9;
        filter: brightness(0.9);
      }
      
      code, pre {
        background-color: #2a2a2a !important;
        color: #f0f0f0 !important;
      }
      
      ::placeholder {
        color: #888 !important;
      }
      
      ::-webkit-scrollbar {
        background-color: #2a2a2a !important;
      }
      
      ::-webkit-scrollbar-thumb {
        background-color: #555 !important;
      }
    `;

    document.head.appendChild(style);
    console.log('Dark mode applied!');
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
