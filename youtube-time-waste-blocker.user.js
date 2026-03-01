// ==UserScript==
// @name        youtube-time-waste-blocker
// @description Block YouTube videos that don't match whitelisted criteria
// @version     1.1
// @match       *://*.youtube.com/*
// @updateURL   https://raw.githubusercontent.com/dylan-chong/userscripts/main/youtube-time-waste-blocker.user.js
// @downloadURL https://raw.githubusercontent.com/dylan-chong/userscripts/main/youtube-time-waste-blocker.user.js
// ==/UserScript==

(function () {
    const REDIRECT_BLOCKED_VIDEOS = true;
    const REMOVE_SUGGESTED_VIDEOS = true;
    const SUBSCRIPTIONS_URL = 'https://www.youtube.com/feed/subscriptions';

    const CRITERIA = [
        { whitelist: true, type: 'channelOrTitle', keywords: ['Naroditsky', 'ASMR', 'Meditation', 'Singing Bowls', 'Exercise', 'Breathing', 'Mindfulness'] },
    ];

    function queryFirst(...selectors) {
        for (const s of selectors) {
            const el = document.querySelector(s);
            if (el?.textContent?.trim()) return el;
        }
        return null;
    }

    function getVideoTitle() {
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
        return el?.textContent?.trim() ?? '';
    }

    function containsKeyword(text, keywords) {
        const lower = text.toLowerCase();
        return keywords.some((kw) => lower.includes(kw.toLowerCase()));
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

    function isAllowed(channel, title) {
        const whitelisted = CRITERIA.filter((c) => c.whitelist).some((c) => matchesCriterion(channel, title, c));
        const blacklisted = CRITERIA.filter((c) => !c.whitelist).some((c) => matchesCriterion(channel, title, c));
        return whitelisted && !blacklisted;
    }

    function isWatchPage() {
        return window.location.pathname === '/watch';
    }

    function filterSuggestedVideos() {
        document.querySelectorAll('ytd-compact-video-renderer').forEach((item) => {
            const title = item.querySelector('#video-title')?.textContent?.trim() ?? '';
            const channel = item.querySelector('ytd-channel-name yt-formatted-string')?.textContent?.trim() ?? '';
            if (!title && !channel) return;
            item.style.display = isAllowed(channel, title) ? '' : 'none';
        });

        document.querySelectorAll('yt-lockup-view-model').forEach((item) => {
            const title = item.querySelector('.yt-lockup-metadata-view-model__title span')?.textContent?.trim() ?? '';
            const channel = item.querySelector('.yt-content-metadata-view-model__metadata-row span')?.textContent?.trim() ?? '';
            if (!title && !channel) return;
            item.style.display = isAllowed(channel, title) ? '' : 'none';
        });
    }

    let lastCheckedUrl = '';

    setInterval(() => {
        if (!isWatchPage()) return;

        if (REMOVE_SUGGESTED_VIDEOS) {
            filterSuggestedVideos();
        }

        if (REDIRECT_BLOCKED_VIDEOS && window.location.href !== lastCheckedUrl) {
            const channel = getChannelName();
            const title = getVideoTitle();
            if (!channel && !title) return;

            lastCheckedUrl = window.location.href;

            if (!isAllowed(channel, title)) {
                window.location.replace(SUBSCRIPTIONS_URL);
            }
        }
    }, 500);
})();