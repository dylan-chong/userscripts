// ==UserScript==
// @name         PokerChipForum Viewed Listings Tracker
// @namespace    http://tampermonkey.net/
// @version      2.3
// @description  Grey out viewed listings on PokerChipForum marketplace with image previews
// @author       You
// @match        https://www.pokerchipforum.com/*
// @grant        none
// ==/UserScript==

(function() {
  'use strict';

  // Add CSS for viewed and unviewed listings
  function addStyles() {
    if (document.getElementById('pcf-viewed-styles')) return;

    const style = document.createElement('style');
    style.id = 'pcf-viewed-styles';
    style.textContent = `
      .pcf-viewed {
        opacity: 0.5 !important;
        background-color: #262626 !important;
        max-height: 40px !important;
        overflow: hidden !important;
        position: relative;
        transition: all 0.3s ease;
      }
      
      .pcf-viewed .structItem-cell--main,
      .pcf-viewed .contentRow-main {
        padding: 4px 8px !important;
        display: flex;
        align-items: center;
      }
      
      .pcf-viewed .structItem-title,
      .pcf-viewed h3 {
        font-size: 13px !important;
        margin: 0 !important;
        line-height: 1.3 !important;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      
      .pcf-viewed .structItem-minor,
      .pcf-viewed .structItem-meta,
      .pcf-viewed .contentRow-minor,
      .pcf-viewed .contentRow-snippet,
      .pcf-viewed .structItem-cell:not(.structItem-cell--main),
      .pcf-viewed .contentRow-extra,
      .pcf-viewed .structItem-icon,
      .pcf-viewed .contentRow-figure {
        display: none !important;
      }
      
      .pcf-viewed::after {
        content: "READ";
        position: absolute;
        top: 5px;
        right: 5px;
        background: #999;
        color: white;
        padding: 2px 8px;
        font-size: 10px;
        border-radius: 3px;
        font-weight: bold;
        z-index: 10;
      }
      
      .pcf-preview-container {
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding: 12px 0;
        border-top: 1px solid #e0e0e0;
        margin-top: 8px;
      }
      
      .pcf-image-carousel {
        position: relative;
        width: 100%;
        overflow-x: auto;
        overflow-y: hidden;
        white-space: nowrap;
        scroll-behavior: smooth;
        -webkit-overflow-scrolling: touch;
        scrollbar-width: thin;
        scrollbar-color: #888 #f1f1f1;
      }
      
      .pcf-image-carousel::-webkit-scrollbar {
        height: 8px;
      }
      
      .pcf-image-carousel::-webkit-scrollbar-track {
        background: #f1f1f1;
        border-radius: 4px;
      }
      
      .pcf-image-carousel::-webkit-scrollbar-thumb {
        background: #888;
        border-radius: 4px;
      }
      
      .pcf-image-carousel::-webkit-scrollbar-thumb:hover {
        background: #555;
      }
      
      .pcf-preview-image {
        height: 300px;
        width: auto;
        display: inline-block;
        margin-right: 12px;
        border-radius: 4px;
        border: 1px solid #ddd;
        vertical-align: top;
        object-fit: contain;
      }
      
      .pcf-preview-placeholder {
        width: 100%;
        height: 200px;
        background: #262626;
        border-radius: 4px;
        border: 1px solid #ddd;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #999;
        font-size: 14px;
      }
      
      .pcf-mark-read-btn {
        padding: 6px 12px;
        background: #4CAF50;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        font-weight: bold;
        transition: background 0.2s;
        z-index: 1000;
        position: relative;
      }
      
      .pcf-mark-read-btn:hover {
        background: #45a049;
      }
      
      .pcf-loading {
        color: #999;
        font-size: 11px;
        font-style: italic;
      }
    `;

    document.head.appendChild(style);
  }

  // Get stored viewed listings
  function getViewedListings() {
    try {
      const stored = localStorage.getItem('pcf_viewed_listings');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  }

  // Store viewed listing
  function addViewedListing(threadId) {
    try {
      const viewed = getViewedListings();
      if (!viewed.includes(threadId)) {
        viewed.push(threadId);
        if (viewed.length > 1000) {
          viewed.splice(0, viewed.length - 1000);
        }
        localStorage.setItem('pcf_viewed_listings', JSON.stringify(viewed));
      }
    } catch (e) {
      console.warn('Could not save viewed listing:', e);
    }
  }

  // Extract thread ID from URL
  function getThreadId(url) {
    const match = url.match(/threads\/[^\/]*\.(\d+)\//);
    return match ? match[1] : null;
  }

  // Get full-size image URL from thumbnail
  function getFullSizeUrl(imgSrc, imgElement) {
    // Check if image is wrapped in a link
    const parentLink = imgElement.closest('a[href]');
    if (parentLink) {
      const linkHref = parentLink.getAttribute('href');
      // If link points to an image, use that
      if (linkHref && /\.(jpg|jpeg|png|gif|webp)$/i.test(linkHref)) {
        return linkHref.startsWith('/') ? 'https://www.pokerchipforum.com' + linkHref : linkHref;
      }
    }

    // Common thumbnail patterns in XenForo and forums
    let fullUrl = imgSrc;

    // Remove thumbnail size parameters
    fullUrl = fullUrl.replace(/\/thumbnails\/[^\/]+/, '');
    fullUrl = fullUrl.replace(/\?thumbnail=\d+/, '');
    fullUrl = fullUrl.replace(/&thumbnail=\d+/, '');

    // XenForo attachment format: attachments/xxx.123/ to attachments/xxx.123/full
    if (fullUrl.includes('/attachments/')) {
      fullUrl = fullUrl.replace(/\/attachments\/([^\/]+\.\d+)\/.*$/, '/attachments/$1/');
      // Try adding 'full' parameter if not already there
      if (!fullUrl.includes('?')) {
        fullUrl += '?full=1';
      }
    }

    // Replace common thumbnail suffixes
    fullUrl = fullUrl.replace(/-thumb\.(jpg|jpeg|png|gif|webp)$/i, '.$1');
    fullUrl = fullUrl.replace(/_thumb\.(jpg|jpeg|png|gif|webp)$/i, '.$1');
    fullUrl = fullUrl.replace(/\.thumb\.(jpg|jpeg|png|gif|webp)$/i, '.$1');

    return fullUrl;
  }

  // Check if image should be filtered out based on attributes
  function shouldFilterImage(img, src) {
    const className = img.className || '';
    const width = img.getAttribute('width');
    const height = img.getAttribute('height');

    // Skip avatar/profile pictures and smilies
    if (src.includes('/avatars/') ||
      src.includes('avatar') ||
      className.includes('avatar') ||
      src.includes('/smilies/') ||
      className.includes('smilie') ||
      className.includes('emoji')) {
      return true;
    }

    // Skip images with explicit small dimensions in attributes
    if (width && height) {
      const w = parseInt(width);
      const h = parseInt(height);
      if (!isNaN(w) && !isNaN(h) && (w < 100 || h < 100)) {
        return true;
      }
    }

    // Skip common icon/button patterns
    if (src.includes('/styles/') ||
      src.includes('/icons/') ||
      src.includes('icon.') ||
      src.includes('button.')) {
      return true;
    }

    return false;
  }

  // Fetch all images from thread page (first post only)
  async function fetchPostImages(threadUrl) {
    try {
      const response = await fetch(threadUrl);
      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      // Look for images in the first post only
      const firstPost = doc.querySelector('.message-body, .message-content, article.message');
      if (firstPost) {
        const images = [];
        const imgElements = firstPost.querySelectorAll('img[src]');

        for (const img of imgElements) {
          const src = img.getAttribute('src');

          // Filter out unwanted images
          if (shouldFilterImage(img, src)) {
            continue;
          }

          // Get full-size version
          let imageSrc = getFullSizeUrl(src, img);
          if (imageSrc.startsWith('/')) {
            imageSrc = 'https://www.pokerchipforum.com' + imageSrc;
          }

          // Avoid duplicates
          if (!images.includes(imageSrc)) {
            images.push(imageSrc);
          }
        }

        return images;
      }
      return [];
    } catch (e) {
      console.warn('Could not fetch thread images:', e);
      return [];
    }
  }

  // Add preview and mark-as-read button to unread listings
  async function addPreviewToListing(container, threadUrl, threadId) {
    // Check if preview already exists
    if (container.querySelector('.pcf-preview-container')) return;

    const mainCell = container.querySelector('.structItem-cell--main, .contentRow-main');
    if (!mainCell) return;

    // Create preview container
    const previewContainer = document.createElement('div');
    previewContainer.className = 'pcf-preview-container';

    // Stop all clicks within preview container from bubbling
    previewContainer.addEventListener('click', function(e) {
      e.stopPropagation();
    }, true);

    // Create carousel container
    const carouselDiv = document.createElement('div');
    carouselDiv.className = 'pcf-image-carousel';

    // Create loading placeholder
    const placeholder = document.createElement('div');
    placeholder.className = 'pcf-preview-placeholder';
    placeholder.textContent = 'Loading images...';
    carouselDiv.appendChild(placeholder);

    previewContainer.appendChild(carouselDiv);

    // Create mark as read button
    const markReadBtn = document.createElement('button');
    markReadBtn.className = 'pcf-mark-read-btn';
    markReadBtn.textContent = 'Mark as Read';

    // Use both mousedown and click for better reliability
    const handleMarkRead = function(e) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      console.log('Mark as read clicked for thread:', threadId);

      addViewedListing(threadId);
      container.classList.add('pcf-viewed');
      previewContainer.remove();

      // Clean up the container - hide all extra elements
      const minorElements = container.querySelectorAll('.structItem-minor, .structItem-meta, .contentRow-minor, .contentRow-snippet, .contentRow-extra, .structItem-icon, .contentRow-figure');
      minorElements.forEach(el => el.style.display = 'none');

      const extraCells = container.querySelectorAll('.structItem-cell:not(.structItem-cell--main)');
      extraCells.forEach(el => el.style.display = 'none');

      return false;
    };

    markReadBtn.addEventListener('mousedown', handleMarkRead, true);
    markReadBtn.addEventListener('click', handleMarkRead, true);
    previewContainer.appendChild(markReadBtn);

    mainCell.appendChild(previewContainer);

    // Fetch and display all images
    const imageSrcs = await fetchPostImages(threadUrl);
    if (imageSrcs.length > 0) {
      // Remove placeholder
      placeholder.remove();

      // Add all images to horizontal scroll
      imageSrcs.forEach((imageSrc) => {
        const img = document.createElement('img');
        img.className = 'pcf-preview-image';
        img.src = imageSrc;
        img.onerror = function() {
          img.remove();
        };
        carouselDiv.appendChild(img);
      });
    } else {
      placeholder.textContent = 'No Images';
    }
  }

  // Mark listings as viewed or add previews
  function processListings() {
    const viewedListings = getViewedListings();

    const selectors = [
      '.structItem-cell--main',
      '.contentRow-main',
      '.structItem-title',
      '.searchResult-title'
    ];

    let threadElements = [];

    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        threadElements = Array.from(elements);
        break;
      }
    }

    if (threadElements.length === 0) {
      threadElements = Array.from(document.querySelectorAll('a[href*="/threads/"]'))
        .map(link => link.closest('.structItem, .contentRow, .searchResult') || link.parentElement)
        .filter(el => el);
    }

    threadElements.forEach(element => {
      const linkElement = element.querySelector('a[data-tp-primary="on"], a[href*="/threads/"]');
      if (linkElement) {
        const threadId = getThreadId(linkElement.href);
        if (threadId) {
          const container = element.closest('.structItem, .contentRow, .searchResult') || element;
          if (container) {
            if (viewedListings.includes(threadId)) {
              // Mark as viewed (shrink it)
              container.classList.add('pcf-viewed');
            } else {
              // Add preview for unread
              addPreviewToListing(container, linkElement.href, threadId);
            }
          }
        }
      }
    });
  }

  // Track clicks on listings
  function trackListingClicks() {
    document.addEventListener('click', function(e) {
      const link = e.target.closest('a[data-tp-primary="on"], a[href*="/threads/"]');
      if (link && link.href.includes('/threads/')) {
        const threadId = getThreadId(link.href);
        if (threadId) {
          addViewedListing(threadId);
        }
      }
    });
  }

  // Mark current thread as viewed
  function markCurrentThreadAsViewed() {
    const currentUrl = window.location.href;
    const threadId = getThreadId(currentUrl);
    if (threadId) {
      addViewedListing(threadId);
    }
  }

  // Check if we're on a listing page
  function isListingPage() {
    const currentUrl = window.location.href;
    return currentUrl.includes('/forums/for-sale.25/') ||
      currentUrl.includes('/search-forums/marketplace.175/') ||
      currentUrl.includes('/forums/') ||
      currentUrl.includes('/search');
  }

  // Initialize
  function init() {
    addStyles();

    const currentUrl = window.location.href;

    if (isListingPage()) {
      processListings();
      trackListingClicks();

      const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
          if (mutation.addedNodes.length > 0) {
            setTimeout(processListings, 100);
          }
        });
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });

    } else if (currentUrl.includes('/threads/')) {
      markCurrentThreadAsViewed();
    }
  }

  // Wait for page to load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Handle navigation
  window.addEventListener('pageshow', function(event) {
    setTimeout(init, 100);
  });

  document.addEventListener('visibilitychange', function() {
    if (!document.hidden && isListingPage()) {
      setTimeout(processListings, 100);
    }
  });

  let lastUrl = location.href;
  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      setTimeout(init, 500);
    }
  }).observe(document, { subtree: true, childList: true });

})();
