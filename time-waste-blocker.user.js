// ==UserScript==
// @name        time-waste-blocker
// @description Block or gate time-wasting sites (YouTube, Facebook, Instagram, Reddit) based on deny/delay/permit categories
// @version     2.2.1
// @match       *://*.youtube.com/*
// @match       *://*.facebook.com/*
// @match       *://*.instagram.com/*
// @match       *://*.reddit.com/*
// @updateURL   https://raw.githubusercontent.com/dylan-chong/userscripts/main/time-waste-blocker.user.js
// @downloadURL https://raw.githubusercontent.com/dylan-chong/userscripts/main/time-waste-blocker.user.js
// ==/UserScript==

(function () {
  // Each site entry is generic: the engine below only calls isCurrentSite() and
  // classify(site) (returning 'deny' | 'delay' | 'permit' | null when not ready yet),
  // then uses denyUrl, cooldownMs and regateWhileOnPage.
  const CONFIG = {
    meditation: {
      durationS: 5 * 60,
      videoUrl: 'https://www.youtube.com/watch?v=MK3lB-uY0gE',
      completionCountdownS: 15,
      breathingPatterns: [
        { name: 'Box Breathing', steps: [['Breathe in', 4], ['Hold', 4], ['Breathe out', 4], ['Hold', 4]] },
        { name: '4-7-8 Breathing', steps: [['Breathe in', 4], ['Hold', 7], ['Breathe out', 8]] },
        { name: 'Simple Breathing', steps: [['Breathe in', 6], ['Breathe out', 6]] },
      ],
    },
    sites: [
      {
        name: 'YouTube',
        isCurrentSite: function () { return hostEndsWith('youtube.com'); },
        classify: classifyYoutube,
        criteria: [
          { action: 'delay', type: 'channelOrTitle', keywords: ['Naroditsky', 'Loresmith', 'Keyboard', 'Balboa'] },
          { action: 'permit', type: 'channelOrTitle', keywords: ['Meditation', 'Singing Bowls', 'ASMR', 'Exercise', 'Breathing', 'Mindfulness', 'Workout', 'Visualisation', 'Visualization', "Mind's Eye"] },
        ],
        denyUrl: 'https://www.youtube.com/feed/subscriptions',
        cooldownMs: 45 * 60 * 1000,
        // Don't interrupt a video that's already playing when the cooldown expires.
        regateWhileOnPage: false,
      },
      {
        name: 'Facebook',
        isCurrentSite: function () { return hostEndsWith('facebook.com'); },
        // Messenger URLs (message threads, media attachments) are permitted so the delay
        // gate only catches the newsfeed/watch/reels time-wasting surfaces.
        classify: delayUnlessMatches({ paths: [/^\/messages\//, /^\/messenger_media/] }),
        denyUrl: null,
        cooldownMs: 30 * 60 * 1000,
        regateWhileOnPage: true,
      },
      {
        name: 'Instagram',
        isCurrentSite: function () { return hostEndsWith('instagram.com'); },
        classify: delayUnlessMatches({ paths: [/^\/direct\//] }),
        denyUrl: null,
        cooldownMs: 20 * 60 * 1000,
        regateWhileOnPage: true,
      },
      {
        name: 'Reddit',
        isCurrentSite: function () { return hostEndsWith('reddit.com'); },
        classify: delayUnlessMatches({ hosts: ['chat.reddit.com'], paths: [/^\/message\//, /^\/chat/] }),
        denyUrl: null,
        cooldownMs: 20 * 60 * 1000,
        regateWhileOnPage: true,
      },
    ],
  };

  function hostEndsWith(suffix) {
    return window.location.hostname.endsWith(suffix);
  }

  function delayUnlessMatches({ hosts = [], paths = [] }) {
    return function () {
      var hostname = window.location.hostname;
      var path = window.location.pathname;
      var isPermitted = hosts.includes(hostname) || paths.some(function (re) { return re.test(path); });
      return isPermitted ? 'permit' : 'delay';
    };
  }

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

  function classifyYoutube(site) {
    if (window.location.pathname !== '/watch') return 'permit';
    var channel = getChannelName();
    var title = getVideoTitle();
    if (!channel && !title) return null;
    for (var i = 0; i < site.criteria.length; i++) {
      if (matchesCriterion(channel, title, site.criteria[i])) return site.criteria[i].action;
    }
    return 'deny';
  }

  const COOLDOWN_STORAGE_KEY = 'yt-time-waste-blocker-last-completed';

  // IndexedDB survives Facebook's random localStorage.clear() calls, unlike localStorage.
  const IDB_NAME = 'time-waste-blocker-db';
  const IDB_STORE = 'kv';
  // iOS Safari's indexedDB.open can hang forever when the storage process is cold, so
  // every access is time-limited and a failed/stuck connection is dropped and reopened.
  const IDB_TIMEOUT_MS = 1500;
  let dbPromise = null;

  function openDb() {
    if (!dbPromise) {
      dbPromise = new Promise(function (resolve, reject) {
        var req = indexedDB.open(IDB_NAME, 1);
        req.onupgradeneeded = function () {
          req.result.createObjectStore(IDB_STORE);
        };
        req.onsuccess = function () {
          var db = req.result;
          db.onclose = db.onversionchange = function () { dbPromise = null; };
          resolve(db);
        };
        req.onerror = function () { reject(req.error); };
      });
    }
    return dbPromise;
  }

  function withTimeout(promise, ms) {
    return Promise.race([
      promise,
      new Promise(function (_resolve, reject) {
        setTimeout(function () { reject(new Error('IndexedDB timed out')); }, ms);
      }),
    ]);
  }

  // Fails closed: any error or timeout reads as "never completed", so the gate shows.
  async function readCooldown() {
    try {
      return await withTimeout(openDb().then(function (db) {
        return new Promise(function (resolve, reject) {
          var tx = db.transaction(IDB_STORE, 'readonly');
          var req = tx.objectStore(IDB_STORE).get(COOLDOWN_STORAGE_KEY);
          req.onsuccess = function () { resolve(parseInt(req.result) || 0); };
          req.onerror = function () { reject(req.error); };
        });
      }), IDB_TIMEOUT_MS);
    } catch (e) {
      dbPromise = null;
      return 0;
    }
  }

  async function writeCooldown(value) {
    try {
      var db = await withTimeout(openDb(), IDB_TIMEOUT_MS);
      db.transaction(IDB_STORE, 'readwrite').objectStore(IDB_STORE).put(value, COOLDOWN_STORAGE_KEY);
    } catch (e) {
      // Nothing else to fall back to; just make the next access reconnect.
      dbPromise = null;
    }
  }

  function getSite() {
    return CONFIG.sites.find(function (site) { return site.isCurrentSite(); }) || null;
  }

  function pauseVideo() {
    var video = document.querySelector('video');
    if (video) video.pause();
  }

  function playVideo() {
    var video = document.querySelector('video');
    if (video) video.play();
  }

  // The overlay host lives directly under <html> (Facebook mobile swaps out <body>
  // children) with !important positioning, and its content sits in a closed shadow root
  // so page stylesheets can't hide or restyle it.
  let activeOverlay = null;

  function createOverlayShell() {
    var host = document.createElement('div');
    host.id = 'breathing-gate-overlay';
    [
      ['all', 'initial'],
      ['position', 'fixed'],
      ['inset', '0'],
      ['z-index', '2147483647'],
      ['display', 'block'],
    ].forEach(function ([prop, value]) { host.style.setProperty(prop, value, 'important'); });

    var content = document.createElement('div');
    content.style.cssText = 'width:100%;height:100%;background:rgba(0,0,0,0.95);display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;color:#fff;';
    host.attachShadow({ mode: 'closed' }).appendChild(content);

    document.documentElement.appendChild(host);
    activeOverlay = host;
    return content;
  }

  function ensureOverlayAttached() {
    if (activeOverlay && !activeOverlay.isConnected) {
      document.documentElement.appendChild(activeOverlay);
    }
  }

  function removeOverlay() {
    if (activeOverlay) {
      activeOverlay.remove();
      activeOverlay = null;
    }
  }

  // Both the breathing exercise and the post-exercise countdown drive their per-second
  // progress off the single main poll interval below, instead of owning their own timers.
  let breathing = null;
  let completion = null;

  function createBreathingOverlay() {
    var patterns = CONFIG.meditation.breathingPatterns;
    var pattern = patterns[Math.floor(Math.random() * patterns.length)];

    var content = createOverlayShell();

    var title = document.createElement('div');
    title.style.cssText = 'font-size:1.2rem;opacity:0.6;margin-bottom:2rem;';
    title.textContent = pattern.name;
    content.appendChild(title);

    var circle = document.createElement('div');
    circle.style.cssText = 'width:120px;height:120px;border-radius:50%;border:3px solid rgba(255,255,255,0.3);transition:transform 1s ease-in-out;margin-bottom:2rem;';
    content.appendChild(circle);

    var instruction = document.createElement('div');
    instruction.style.cssText = 'font-size:2rem;margin-bottom:1rem;min-height:3rem;';
    content.appendChild(instruction);

    var progress = document.createElement('div');
    progress.style.cssText = 'font-size:1rem;opacity:0.5;margin-bottom:2rem;';
    content.appendChild(progress);

    breathing = {
      pattern: pattern,
      cycles: calculateCycles(pattern),
      currentCycle: 0,
      currentStep: 0,
      secondsLeft: pattern.steps[0][1],
      circle: circle,
      instruction: instruction,
      progress: progress,
      content: content,
    };
    updateBreathingDisplay(breathing);
  }

  function calculateCycles(pattern) {
    const oneCycleDuration = pattern.steps
      .map(([_name, duration]) => duration)
      .reduce((prev, current) => prev + current, 0);
    const cycles = CONFIG.meditation.durationS / oneCycleDuration;
    return Math.ceil(cycles);
  }

  function updateBreathingDisplay(b) {
    var stepName = b.pattern.steps[b.currentStep][0];
    var stepDuration = b.pattern.steps[b.currentStep][1];
    b.instruction.textContent = stepName + '...';
    b.progress.textContent = 'Cycle ' + (b.currentCycle + 1) + ' of ' + b.cycles + '  •  ' + b.secondsLeft + 's';

    var scale = 1;
    var elapsed = stepDuration - b.secondsLeft;
    var t = elapsed / stepDuration;
    if (stepName === 'Breathe in') {
      scale = 1 + t * 0.5;
    } else if (stepName === 'Breathe out') {
      scale = 1.5 - t * 0.5;
    } else {
      scale = stepName === 'Hold' && b.currentStep > 0 && b.pattern.steps[b.currentStep - 1][0] === 'Breathe in' ? 1.5 : 1;
    }
    b.circle.style.transform = 'scale(' + scale + ')';
  }

  function tickBreathing() {
    if (document.hidden) return;
    pauseVideo();

    var b = breathing;
    b.secondsLeft--;
    if (b.secondsLeft <= 0) {
      b.currentStep++;
      if (b.currentStep >= b.pattern.steps.length) {
        b.currentStep = 0;
        b.currentCycle++;
        if (b.currentCycle >= b.cycles) {
          completeExercise(b.content);
          return;
        }
      }
      b.secondsLeft = b.pattern.steps[b.currentStep][1];
    }
    updateBreathingDisplay(b);
  }

  function completeExercise(content) {
    breathing = null;
    while (content.firstChild) content.removeChild(content.firstChild);

    var msg = document.createElement('div');
    msg.style.cssText = 'font-size:1.5rem;margin-bottom:2rem;';
    msg.textContent = 'Consider meditating instead';
    content.appendChild(msg);

    var link = document.createElement('a');
    link.href = CONFIG.meditation.videoUrl;
    link.textContent = 'Open singing bowls meditation';
    link.style.cssText = 'color:#7cb3ff;font-size:1.2rem;text-decoration:underline;margin-bottom:2rem;';
    content.appendChild(link);

    var countdown = document.createElement('div');
    countdown.style.cssText = 'font-size:1rem;opacity:0.5;';
    content.appendChild(countdown);

    var remaining = CONFIG.meditation.completionCountdownS;
    countdown.textContent = 'Video available in ' + remaining + 's';

    completion = { remaining: remaining, countdown: countdown };
  }

  function tickCompletion() {
    var c = completion;
    c.remaining--;
    if (c.remaining <= 0) {
      completion = null;
      writeCooldown(Date.now());
      removeOverlay();
      playVideo();
    } else {
      c.countdown.textContent = 'Video available in ' + c.remaining + 's';
    }
  }

  const ACTIVE_CHECK_WINDOW_MS = 30 * 1000;
  const STEADY_CHECK_INTERVAL_MS = 10 * 1000;
  const CHECK_INTERVAL_MS = 1000;

  let lastCheckedUrl = '';
  let activeWindowEndsAt = 0;
  let lastSteadyCheckAt = 0;

  async function runCheck() {
    // At document-start (the bundle's run-at) <html> may not exist yet; the poll retries.
    if (!document.documentElement) return;

    var site = getSite();
    if (!site) {
      removeOverlay();
      return;
    }

    var action = site.classify(site);
    if (action == null) return;

    if (action === 'deny') {
      if (site.denyUrl) window.location.replace(site.denyUrl);
      return;
    }

    // Re-read every time (not a cached variable) in case another tab/origin completed
    // the meditation and updated storage, or a previous poll's value went stale.
    var lastCompletedAt = await readCooldown();

    if (action === 'delay' && (Date.now() - lastCompletedAt > site.cooldownMs)) {
      pauseVideo();
      if (!activeOverlay) {
        createBreathingOverlay();
      }
    } else {
      removeOverlay();
    }
  }

  // Single 1s poll drives everything: SPA navigation detection (no popstate on these
  // sites, with a 30s active window afterwards to catch delayed page loads), a slower
  // steady-state check so an expiring cooldown re-gates on sites that opt in, the
  // breathing exercise countdown, and the post-exercise "video available in Ns" countdown.
  setInterval(function () {
    if (breathing || completion) {
      // Bail out of the exercise/countdown if the user navigated away from a gated
      // site entirely (e.g. via the address bar), instead of leaving them stuck.
      if (!getSite()) {
        breathing = null;
        completion = null;
        removeOverlay();
        return;
      }
      ensureOverlayAttached();
      if (breathing) {
        tickBreathing();
      } else {
        tickCompletion();
      }
      return;
    }

    var now = Date.now();
    var urlChanged = window.location.href !== lastCheckedUrl;
    if (urlChanged) {
      lastCheckedUrl = window.location.href;
      activeWindowEndsAt = now + ACTIVE_CHECK_WINDOW_MS;
    }
    if (urlChanged || now < activeWindowEndsAt) {
      runCheck();
    } else if (getSite()?.regateWhileOnPage && now - lastSteadyCheckAt >= STEADY_CHECK_INTERVAL_MS) {
      lastSteadyCheckAt = now;
      runCheck();
    }
  }, CHECK_INTERVAL_MS);

  // Returning to a backgrounded tab (or a bfcache restore) re-checks immediately on
  // sites that opt in, rather than waiting for the next steady-state poll.
  function recheckOnReturn() {
    if (document.hidden || breathing || completion) return;
    if (!getSite()?.regateWhileOnPage) return;
    activeWindowEndsAt = Date.now() + ACTIVE_CHECK_WINDOW_MS;
    runCheck();
  }
  document.addEventListener('visibilitychange', recheckOnReturn);
  window.addEventListener('pageshow', recheckOnReturn);

  // Initial page load.
  lastCheckedUrl = window.location.href;
  activeWindowEndsAt = Date.now() + ACTIVE_CHECK_WINDOW_MS;
  runCheck();
})();
