// ==UserScript==
// @name        time-waste-blocker
// @description Block or gate time-wasting sites (YouTube, Facebook, Instagram) based on deny/delay/permit categories
// @version     1.7
// @match       *://*.youtube.com/*
// @match       *://*.facebook.com/*
// @match       *://*.instagram.com/*
// @updateURL   https://raw.githubusercontent.com/dylan-chong/userscripts/main/time-waste-blocker.user.js
// @downloadURL https://raw.githubusercontent.com/dylan-chong/userscripts/main/time-waste-blocker.user.js
// ==/UserScript==

(function () {
  const SUBSCRIPTIONS_URL = 'https://www.youtube.com/feed/subscriptions';
  const MEDITATION_VIDEO_URL = 'https://www.youtube.com/watch?v=MK3lB-uY0gE';

  const YOUTUBE_CRITERIA = [
    { action: 'delay', type: 'channelOrTitle', keywords: ['Naroditsky', 'Loresmith', 'Keyboard'] },
    { action: 'permit', type: 'channelOrTitle', keywords: ['Meditation', 'Singing Bowls', 'ASMR', 'Exercise', 'Breathing', 'Mindfulness', 'Workout', 'Visualisation', 'Visualization', "Mind's Eye"] },
  ];

  // Messenger URLs on facebook.com (message threads, media attachments) are permitted
  // so the delay gate only catches the newsfeed/watch/reels time-wasting surfaces.
  const FACEBOOK_PERMITTED_PATH_PATTERNS = [
    /^\/messages\//,
    /^\/messenger_media$/,
  ];

  // Direct message URLs on instagram.com are permitted for the same reason.
  const INSTAGRAM_PERMITTED_PATH_PATTERNS = [
    /^\/direct\//,
  ];

  const MEDITATION_DURATION_S = 5 * 60;
  const BREATHING_PATTERNS = [
    { name: 'Box Breathing', steps: [['Breathe in', 4], ['Hold', 4], ['Breathe out', 4], ['Hold', 4]] },
    { name: '4-7-8 Breathing', steps: [['Breathe in', 4], ['Hold', 7], ['Breathe out', 8]] },
    { name: 'Simple Breathing', steps: [['Breathe in', 6], ['Breathe out', 6]] },
  ];

  const COOLDOWN_MS = 45 * 60 * 1000;
  const COOLDOWN_STORAGE_KEY = 'yt-time-waste-blocker-last-completed';

  // IndexedDB survives Facebook's random localStorage.clear() calls, unlike localStorage.
  const IDB_NAME = 'time-waste-blocker-db';
  const IDB_STORE = 'kv';
  let dbPromise = null;

  function openDb() {
    if (!dbPromise) {
      dbPromise = new Promise(function (resolve, reject) {
        var req = indexedDB.open(IDB_NAME, 1);
        req.onupgradeneeded = function () {
          req.result.createObjectStore(IDB_STORE);
        };
        req.onsuccess = function () { resolve(req.result); };
        req.onerror = function () { reject(req.error); };
      });
    }
    return dbPromise;
  }

  function readCooldown() {
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(IDB_STORE, 'readonly');
        var req = tx.objectStore(IDB_STORE).get(COOLDOWN_STORAGE_KEY);
        req.onsuccess = function () { resolve(parseInt(req.result) || 0); };
        req.onerror = function () { reject(req.error); };
      });
    }).catch(function () {
      return 0;
    });
  }

  function writeCooldown(value) {
    openDb().then(function (db) {
      var tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(value, COOLDOWN_STORAGE_KEY);
    }).catch(function () {
      // Ignore; nothing else to fall back to.
    });
  }

  let lastCompletedAt = 0;
  let activeOverlay = null;

  function queryFirst(...selectors) {
    for (const s of selectors) {
      const el = document.querySelector(s);
      if (el?.textContent?.trim()) return el;
    }
    return null;
  }

  function getVideoTitle() {
    const titleFromDoc = document.title.replace(/ - YouTube$/, '');
    if (titleFromDoc && titleFromDoc !== document.title) {
      return titleFromDoc;
    }
    const el = queryFirst(
      'h1.ytd-watch-metadata yt-formatted-string',
      'h2.slim-video-information-title .yt-core-attributed-string',
    );
    return el?.textContent?.trim() ?? '';
  }

  function getChannelName() {
    const el = queryFirst(
      'ytd-video-owner-renderer ytd-channel-name yt-formatted-string a',
      'ytm-slim-owner-renderer .slim-owner-icon-and-title .yt-core-attributed-string',
    );
    if (el?.textContent?.trim()) {
      return el.textContent.trim();
    }
    const metaChannel = document.querySelector('span[itemprop="author"] link[itemprop="name"]');
    return metaChannel?.getAttribute('content')?.trim() ?? '';
  }

  function containsKeyword(text, keywords) {
    const lower = text.toLowerCase();
    return keywords.some(function (kw) { return lower.includes(kw.toLowerCase()); });
  }

  function matchesCriterion(channel, title, criterion) {
    switch (criterion.type) {
      case 'channel':
        return containsKeyword(channel, criterion.keywords);
      case 'channelOrTitle':
        return containsKeyword(channel, criterion.keywords) || containsKeyword(title, criterion.keywords);
      default:
        return false;
    }
  }

  function getYoutubeAction(channel, title) {
    for (var i = 0; i < YOUTUBE_CRITERIA.length; i++) {
      if (matchesCriterion(channel, title, YOUTUBE_CRITERIA[i])) return YOUTUBE_CRITERIA[i].action;
    }
    return 'deny';
  }

  function isWatchPage() {
    return window.location.pathname === '/watch';
  }

  function classifyYoutube() {
    if (!isWatchPage()) return 'permit';
    var channel = getChannelName();
    var title = getVideoTitle();
    if (!channel && !title) return null;
    return getYoutubeAction(channel, title);
  }

  function makePermittedPathClassifier(permittedPathPatterns) {
    return function () {
      var path = window.location.pathname;
      var isPermitted = permittedPathPatterns.some(function (re) { return re.test(path); });
      return isPermitted ? 'permit' : 'delay';
    };
  }

  const SITES = [
    { hostSuffix: 'youtube.com', classify: classifyYoutube, denyUrl: SUBSCRIPTIONS_URL },
    { hostSuffix: 'facebook.com', classify: makePermittedPathClassifier(FACEBOOK_PERMITTED_PATH_PATTERNS), denyUrl: null },
    { hostSuffix: 'instagram.com', classify: makePermittedPathClassifier(INSTAGRAM_PERMITTED_PATH_PATTERNS), denyUrl: null },
  ];

  function getSite() {
    var hostname = window.location.hostname;
    return SITES.find(function (site) { return hostname.endsWith(site.hostSuffix); }) || null;
  }

  function pauseVideo() {
    var video = document.querySelector('video');
    if (video) video.pause();
  }

  function playVideo() {
    var video = document.querySelector('video');
    if (video) video.play();
  }

  function createBreathingOverlay() {
    var pattern = BREATHING_PATTERNS[Math.floor(Math.random() * BREATHING_PATTERNS.length)];

    var overlay = document.createElement('div');
    overlay.id = 'breathing-gate-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.95);z-index:999999;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;color:#fff;';

    var title = document.createElement('div');
    title.style.cssText = 'font-size:1.2rem;opacity:0.6;margin-bottom:2rem;';
    title.textContent = pattern.name;
    overlay.appendChild(title);

    var circle = document.createElement('div');
    circle.style.cssText = 'width:120px;height:120px;border-radius:50%;border:3px solid rgba(255,255,255,0.3);transition:transform 1s ease-in-out;margin-bottom:2rem;';
    overlay.appendChild(circle);

    var instruction = document.createElement('div');
    instruction.style.cssText = 'font-size:2rem;margin-bottom:1rem;min-height:3rem;';
    overlay.appendChild(instruction);

    var progress = document.createElement('div');
    progress.style.cssText = 'font-size:1rem;opacity:0.5;margin-bottom:2rem;';
    overlay.appendChild(progress);

    document.body.appendChild(overlay);
    activeOverlay = overlay;

    runBreathingExercise(pattern, circle, instruction, progress, overlay);
  }

  function calculateCycles(pattern) {
    const oneCycleDuration = pattern.steps
      .map(([_name, duration]) => duration)
      .reduce((prev, current) => prev + current, 0);
    const cycles = MEDITATION_DURATION_S / oneCycleDuration;
    return Math.ceil(cycles);
  }

  function runBreathingExercise(pattern, circle, instruction, progress, overlay) {
    var currentCycle = 0;
    var cycles = calculateCycles(pattern);
    var currentStep = 0;
    var secondsLeft = pattern.steps[0][1];
    var paused = false;

    function updateDisplay() {
      var stepName = pattern.steps[currentStep][0];
      var stepDuration = pattern.steps[currentStep][1];
      instruction.textContent = stepName + '...';
      progress.textContent = 'Cycle ' + (currentCycle + 1) + ' of ' + cycles + '  •  ' + secondsLeft + 's';

      var scale = 1;
      var elapsed = stepDuration - secondsLeft;
      var t = elapsed / stepDuration;
      if (stepName === 'Breathe in') {
        scale = 1 + t * 0.5;
      } else if (stepName === 'Breathe out') {
        scale = 1.5 - t * 0.5;
      } else {
        scale = stepName === 'Hold' && currentStep > 0 && pattern.steps[currentStep - 1][0] === 'Breathe in' ? 1.5 : 1;
      }
      circle.style.transform = 'scale(' + scale + ')';
    }

    function tick() {
      if (paused) return;

      secondsLeft--;
      if (secondsLeft <= 0) {
        currentStep++;
        if (currentStep >= pattern.steps.length) {
          currentStep = 0;
          currentCycle++;
          if (currentCycle >= cycles) {
            completeExercise(overlay);
            return;
          }
        }
        secondsLeft = pattern.steps[currentStep][1];
      }
      updateDisplay();
    }

    document.addEventListener('visibilitychange', function handler() {
      if (!document.body.contains(overlay)) {
        document.removeEventListener('visibilitychange', handler);
        return;
      }
      paused = document.hidden;
    });

    updateDisplay();
    var intervalId = setInterval(function () {
      pauseVideo();
      tick();
    }, 1000);
    overlay._breathingIntervalId = intervalId;
  }

  function completeExercise(overlay) {
    if (overlay._breathingIntervalId) clearInterval(overlay._breathingIntervalId);
    while (overlay.firstChild) overlay.removeChild(overlay.firstChild);
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.95);z-index:999999;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;color:#fff;';

    var msg = document.createElement('div');
    msg.style.cssText = 'font-size:1.5rem;margin-bottom:2rem;';
    msg.textContent = 'Consider meditating instead';
    overlay.appendChild(msg);

    var link = document.createElement('a');
    link.href = MEDITATION_VIDEO_URL;
    link.textContent = 'Open singing bowls meditation';
    link.style.cssText = 'color:#7cb3ff;font-size:1.2rem;text-decoration:underline;margin-bottom:2rem;';
    overlay.appendChild(link);

    var countdown = document.createElement('div');
    countdown.style.cssText = 'font-size:1rem;opacity:0.5;';
    overlay.appendChild(countdown);

    var remaining = 15;
    countdown.textContent = 'Video available in ' + remaining + 's';

    var timer = setInterval(function () {
      remaining--;
      if (remaining <= 0) {
        clearInterval(timer);
        lastCompletedAt = Date.now();
        writeCooldown(lastCompletedAt);
        overlay.remove();
        activeOverlay = null;
        playVideo();
      } else {
        countdown.textContent = 'Video available in ' + remaining + 's';
      }
    }, 1000);
  }

  const ACTIVE_CHECK_WINDOW_MS = 30 * 1000;
  const CHECK_INTERVAL_MS = 1000;

  let lastCheckedUrl = '';
  let activeWindowEndsAt = 0;

  function runCheck() {
    var site = getSite();
    if (!site) {
      if (activeOverlay) {
        activeOverlay.remove();
        activeOverlay = null;
      }
      return;
    }

    var action = site.classify();
    if (action == null) return;

    if (action === 'deny') {
      if (site.denyUrl) window.location.replace(site.denyUrl);
      return;
    }

    // Re-read in case another tab/origin completed the meditation and updated storage.
    // Must await this value directly (not a stale cached one) before deciding to gate,
    // otherwise every check briefly sees the previous poll's value and can false-trigger.
    readCooldown().then(function (v) {
      lastCompletedAt = v;

      if (action === 'delay' && (Date.now() - lastCompletedAt > COOLDOWN_MS)) {
        pauseVideo();
        if (!activeOverlay) {
          createBreathingOverlay();
        }
      } else if (activeOverlay) {
        activeOverlay.remove();
        activeOverlay = null;
      }
    });
  }

  // Single 1s poll: detects SPA navigation (no popstate on these sites) and
  // keeps checking for a 30s window afterwards to catch delayed page loads.
  setInterval(function () {
    var urlChanged = window.location.href !== lastCheckedUrl;
    if (urlChanged) {
      lastCheckedUrl = window.location.href;
      activeWindowEndsAt = Date.now() + ACTIVE_CHECK_WINDOW_MS;
    }
    if (urlChanged || Date.now() < activeWindowEndsAt) {
      runCheck();
    }
  }, CHECK_INTERVAL_MS);

  // Initial page load.
  lastCheckedUrl = window.location.href;
  activeWindowEndsAt = Date.now() + ACTIVE_CHECK_WINDOW_MS;
  runCheck();
})();
