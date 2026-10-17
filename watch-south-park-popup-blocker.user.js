// ==UserScript==
// @name         South Park TV Pop-up Blocker
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Prevents new tabs/windows from opening on watchsouthpark.tv
// @author       You
// @match        https://watchsouthpark.tv/*
// @match        https://*.watchsouthpark.tv/*
// @grant        none
// @run-at       document-start
// @updateURL    https://raw.githubusercontent.com/dylan-chong/userscripts/main/watch-south-park-popup-blocker.user.js
// @downloadURL  https://raw.githubusercontent.com/dylan-chong/userscripts/main/watch-south-park-popup-blocker.user.js
// ==/UserScript==

(function() {
  'use strict';

  // Run once per window (e.g. bundle + individual install).
  var loaded = window.__userscriptsLoaded = window.__userscriptsLoaded || {};
  if (loaded['watch-south-park-popup-blocker']) return;
  loaded['watch-south-park-popup-blocker'] = true;

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

  // Observe document, not body/documentElement: at document-start <html> may not exist yet.
  observer.observe(document, {
    childList: true,
    subtree: true
  });

  console.log('South Park TV Pop-up Blocker active');
})();
