// ==UserScript==
// @name        youtube-time-waste-blocker
// @description Block or gate YouTube videos based on deny/delay/permit categories
// @version     2.1
// @match       *://*.youtube.com/*
// @updateURL   https://raw.githubusercontent.com/dylan-chong/userscripts/main/youtube-time-waste-blocker.user.js
// @downloadURL https://raw.githubusercontent.com/dylan-chong/userscripts/main/youtube-time-waste-blocker.user.js
// ==/UserScript==

(function () {
    const SUBSCRIPTIONS_URL = 'https://www.youtube.com/feed/subscriptions';
    const MEDITATION_VIDEO_URL = 'https://www.youtube.com/watch?v=MK3lB-uY0gE';

    const CRITERIA = [
        { action: 'delay', type: 'channelOrTitle', keywords: ['Naroditsky', 'Mini Motorways'] },
        { action: 'permit', type: 'channelOrTitle', keywords: ['Meditation', 'Singing Bowls', 'ASMR', 'Exercise', 'Breathing', 'Mindfulness', 'Workout'] },
    ];

    const BREATHING_PATTERNS = [
        { name: 'Box Breathing', steps: [['Breathe in', 4], ['Hold', 4], ['Breathe out', 4], ['Hold', 4]], cycles: 4 },
        { name: '4-7-8 Breathing', steps: [['Breathe in', 4], ['Hold', 7], ['Breathe out', 8]], cycles: 3 },
        { name: 'Simple Breathing', steps: [['Breathe in', 4], ['Breathe out', 4]], cycles: 8 },
    ];

    const completedUrls = new Set();
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

    function getAction(channel, title) {
        for (var i = 0; i < CRITERIA.length; i++) {
            if (matchesCriterion(channel, title, CRITERIA[i])) return CRITERIA[i].action;
        }
        return 'deny';
    }

    function isWatchPage() {
        return window.location.pathname === '/watch';
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

        var meditationLink = document.createElement('a');
        meditationLink.href = MEDITATION_VIDEO_URL;
        meditationLink.textContent = 'Or meditate with singing bowls instead';
        meditationLink.style.cssText = 'color:rgba(255,255,255,0.5);font-size:0.9rem;text-decoration:underline;cursor:pointer;';
        overlay.appendChild(meditationLink);

        document.body.appendChild(overlay);
        activeOverlay = overlay;

        runBreathingExercise(pattern, circle, instruction, progress, overlay);
    }

    function runBreathingExercise(pattern, circle, instruction, progress, overlay) {
        var currentCycle = 0;
        var currentStep = 0;
        var secondsLeft = pattern.steps[0][1];
        var paused = false;

        function updateDisplay() {
            var stepName = pattern.steps[currentStep][0];
            var stepDuration = pattern.steps[currentStep][1];
            instruction.textContent = stepName + '...';
            progress.textContent = 'Cycle ' + (currentCycle + 1) + ' of ' + pattern.cycles + '  •  ' + secondsLeft + 's';

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
                    if (currentCycle >= pattern.cycles) {
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
        setInterval(tick, 1000);
    }

    function completeExercise(overlay) {
        overlay.innerHTML = '';
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
                completedUrls.add(window.location.href);
                overlay.remove();
                activeOverlay = null;
                playVideo();
            } else {
                countdown.textContent = 'Video available in ' + remaining + 's';
            }
        }, 1000);
    }

    let lastCheckedUrl = '';

    setInterval(function () {
        if (!isWatchPage()) {
            if (activeOverlay) {
                activeOverlay.remove();
                activeOverlay = null;
            }
            return;
        }

        if (window.location.href === lastCheckedUrl) return;

        var channel = getChannelName();
        var title = getVideoTitle();
        if (!channel && !title) return;

        lastCheckedUrl = window.location.href;
        var action = getAction(channel, title);

        if (action === 'deny') {
            window.location.replace(SUBSCRIPTIONS_URL);
        } else if (action === 'delay' && !completedUrls.has(window.location.href)) {
            pauseVideo();
            if (!activeOverlay) {
                createBreathingOverlay();
            }
        }
    }, 500);
})();
