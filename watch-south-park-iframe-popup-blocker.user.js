// ==UserScript==
// @name         MyVidPlay Pop-up Blocker
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Aggressive pop-up blocking for myvidplay.com video player
// @author       You
// @match        https://myvidplay.com/*
// @match        https://*.myvidplay.com/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

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
