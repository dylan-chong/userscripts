// ==UserScript==
// @name         PokerChipForum Viewed Listings Tracker
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Grey out viewed listings on PokerChipForum marketplace
// @author       You
// @match        https://www.NOOpokerchipforum.com/*
// @grant        none
// ==/UserScript==

(function() {
  'use strict';

  // Add CSS for greyed out listings using standard DOM methods
  function addStyles() {
    if (document.getElementById('pcf-viewed-styles')) return;

    const style = document.createElement('style');
    style.id = 'pcf-viewed-styles';
    style.textContent = `
            .pcf-viewed {
                opacity: 0.4 !important;
                background-color: #000000 !important;
                position: relative;
            }
            
            .pcf-viewed::after {
                content: "VIEWED";
                position: absolute;
                top: 5px;
                right: 5px;
                background: #666;
                color: white;
                padding: 2px 6px;
                font-size: 10px;
                border-radius: 3px;
                font-weight: bold;
                z-index: 10;
            }
            
            .pcf-viewed a {
                color: #999 !important;
            }
        `;

    document.head.appendChild(style);
  }

  // Get stored viewed listings using localStorage
  function getViewedListings() {
    try {
      const stored = localStorage.getItem('pcf_viewed_listings');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  }

  // Store viewed listing using localStorage
  function addViewedListing(threadId) {
    try {
      const viewed = getViewedListings();
      if (!viewed.includes(threadId)) {
        viewed.push(threadId);
        // Keep only last 1000 viewed items to prevent storage bloat
        if (viewed.length > 1000) {
          viewed.splice(0, viewed.length - 1000);
        }
        localStorage.setItem('pcf_viewed_listings', JSON.stringify(viewed));
      }
    } catch (e) {
      console.warn('Could not save viewed listing:', e);
    }
  }

  // Extract thread ID from URL or element
  function getThreadId(url) {
    const match = url.match(/threads\/[^\/]*\.(\d+)\//);
    return match ? match[1] : null;
  }

  // Mark listings as viewed - works for both forum and search pages
  function markViewedListings() {
    const viewedListings = getViewedListings();

    // Try multiple selectors to handle different page structures
    const selectors = [
      '.structItem-cell--main',  // Main forum listing
      '.contentRow-main',        // Search results
      '.structItem-title',       // Alternative structure
      '.searchResult-title'      // Another search result structure
    ];

    let threadElements = [];
    
    // Find elements using any of the selectors
    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        threadElements = Array.from(elements);
        break;
      }
    }

    // If no specific elements found, try finding links directly
    if (threadElements.length === 0) {
      threadElements = Array.from(document.querySelectorAll('a[href*="/threads/"]'))
        .map(link => link.closest('.structItem, .contentRow, .searchResult') || link.parentElement)
        .filter(el => el);
    }

    threadElements.forEach(element => {
      // Find thread link within the element
      const linkElement = element.querySelector('a[data-tp-primary="on"], a[href*="/threads/"]');
      if (linkElement) {
        const threadId = getThreadId(linkElement.href);
        if (threadId && viewedListings.includes(threadId)) {
          // Find the appropriate container to mark
          const container = element.closest('.structItem, .contentRow, .searchResult') || element;
          if (container) {
            container.classList.add('pcf-viewed');
          }
        }
      }
    });
  }

  // Track when user clicks on a listing
  function trackListingClicks() {
    document.addEventListener('click', function(e) {
      // Handle both primary links and any thread links
      const link = e.target.closest('a[data-tp-primary="on"], a[href*="/threads/"]');
      if (link && link.href.includes('/threads/')) {
        const threadId = getThreadId(link.href);
        if (threadId) {
          addViewedListing(threadId);
        }
      }
    });
  }

  // Mark current thread as viewed if we're on a thread page
  function markCurrentThreadAsViewed() {
    const currentUrl = window.location.href;
    const threadId = getThreadId(currentUrl);
    if (threadId) {
      addViewedListing(threadId);
    }
  }

  // Check if we're on a page that should show listings
  function isListingPage() {
    const currentUrl = window.location.href;
    return currentUrl.includes('/forums/for-sale.25/') || 
           currentUrl.includes('/search-forums/marketplace.175/') ||
           currentUrl.includes('/forums/') ||
           currentUrl.includes('/search');
  }

  // Initialize based on current page
  function init() {
    // Add styles first
    addStyles();

    const currentUrl = window.location.href;

    if (isListingPage()) {
      // We're on a page with listings
      markViewedListings();
      trackListingClicks();

      // Re-check when new content loads (for pagination, AJAX, etc.)
      const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
          if (mutation.addedNodes.length > 0) {
            setTimeout(markViewedListings, 100);
          }
        });
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });

    } else if (currentUrl.includes('/threads/')) {
      // We're viewing a specific thread
      markCurrentThreadAsViewed();
    }
  }

  // Wait for page to load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Handle back/forward button navigation (pageshow event fires on back button)
  window.addEventListener('pageshow', function(event) {
    // Re-run init when page is shown from cache
    setTimeout(init, 100);
  });

  // Handle visibility change (when tab becomes visible again)
  document.addEventListener('visibilitychange', function() {
    if (!document.hidden && isListingPage()) {
      setTimeout(markViewedListings, 100);
    }
  });

  // Handle navigation changes (for single-page app behavior)
  let lastUrl = location.href;
  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      setTimeout(init, 500); // Small delay to let content load
    }
  }).observe(document, { subtree: true, childList: true });

})();
