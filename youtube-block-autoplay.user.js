// ==UserScript==
// @name        youtube-block-autoplay
// @description Block playlist autoplay while allowing manual next
// @version     1.0
// @match       *://*.youtube.com/*
// @updateURL   https://raw.githubusercontent.com/dylan-chong/userscripts/main/youtube-block-autoplay.user.js
// @downloadURL https://raw.githubusercontent.com/dylan-chong/userscripts/main/youtube-block-autoplay.user.js
// ==/UserScript==

(function () {
    const BLOCK_AUTOPLAY_BTN_ID = 'yt-block-playlist-autoplay-btn';
    const STORAGE_KEY = 'yt-block-playlist-autoplay';
    let blockAutoplayEnabled = localStorage.getItem(STORAGE_KEY) !== 'false';
    let userInitiatedSkip = false;

    function isPlaylist() {
        return new URLSearchParams(window.location.search).has('list');
    }

    function markUserSkip() {
        userInitiatedSkip = true;
        setTimeout(() => { userInitiatedSkip = false; }, 3000);
    }

    const SVG_NS = 'http://www.w3.org/2000/svg';

    function buildBlockAutoplaySvg() {
        const svg = document.createElementNS(SVG_NS, 'svg');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('width', '24');
        svg.setAttribute('height', '24');
        svg.style.opacity = 1;

        const path = document.createElementNS(SVG_NS, 'path');
        path.setAttribute('d', 'M8 19l11-7L8 5v14zM19 5v14h3V5h-3z');
        path.setAttribute('fill', 'white');
        svg.appendChild(path);

        if (blockAutoplayEnabled) {
            const line = document.createElementNS(SVG_NS, 'line');
            line.setAttribute('x1', '4');
            line.setAttribute('y1', '20');
            line.setAttribute('x2', '20');
            line.setAttribute('y2', '4');
            line.setAttribute('stroke', '#ff4444');
            line.setAttribute('stroke-width', '3');
            line.setAttribute('stroke-linecap', 'round');
            svg.appendChild(line);
        }

        return svg;
    }

    function updateBlockAutoplayButton() {
        const btn = document.getElementById(BLOCK_AUTOPLAY_BTN_ID);
        if (!btn) return;
        btn.replaceChildren(buildBlockAutoplaySvg());
        btn.title = blockAutoplayEnabled
            ? 'Playlist autoplay blocked (click to allow)'
            : 'Playlist autoplay allowed (click to block)';
    }

    function createBlockAutoplayButton() {
        if (document.getElementById(BLOCK_AUTOPLAY_BTN_ID)) return;
        const loopRenderer = document.querySelector('ytd-playlist-loop-button-renderer');
        if (!loopRenderer) return;

        const btn = document.createElement('button');
        btn.id = BLOCK_AUTOPLAY_BTN_ID;
        btn.style.cssText = 'background:none;border:none;cursor:pointer;width:40px;height:40px;padding:8px;display:inline-flex;align-items:center;justify-content:center;border-radius:50%;vertical-align:middle;';
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            blockAutoplayEnabled = !blockAutoplayEnabled;
            localStorage.setItem(STORAGE_KEY, blockAutoplayEnabled);
            updateBlockAutoplayButton();
        });
        loopRenderer.before(btn);
        updateBlockAutoplayButton();
    }

    function setupVideoBlocking() {
        const video = document.querySelector('video');
        if (!video || video._blockAutoplaySetup) return;
        video._blockAutoplaySetup = true;

        video.addEventListener('timeupdate', () => {
            console.log('[youtube-block-autoplay] timeupdate', {blockAutoplayEnabled, isPlaylist: isPlaylist(), userInitiatedSkip, videoPaused: video.paused});
            if (!blockAutoplayEnabled || !isPlaylist() || userInitiatedSkip || video.paused) {
                console.log('[youtube-block-autoplay] not blocking autoplay', {blockAutoplayEnabled, isPlaylist: isPlaylist(), userInitiatedSkip, videoPaused: video.paused});
                return;
            }
            if (video.duration > 0 && video.duration - video.currentTime < 0.5) {
                console.log('[youtube-block-autoplay] blocking autoplay', {blockAutoplayEnabled, isPlaylist: isPlaylist(), userInitiatedSkip, videoPaused: video.paused});
                video.pause();
            }
        });

        video.addEventListener('ended', (e) => {
            if (!blockAutoplayEnabled || !isPlaylist() || userInitiatedSkip) {
                userInitiatedSkip = false;
                return;
            }
            e.stopImmediatePropagation();
            e.preventDefault();
            video.pause();
        }, true);
    }

    function interceptPlayerNextVideo() {
        const player = document.getElementById('movie_player');
        if (!player?.nextVideo) return;
        if (player.nextVideo._isAutoplayBlockWrapper) return;

        const original = player.nextVideo.bind(player);
        const wrapper = function () {
            if (blockAutoplayEnabled && isPlaylist() && !userInitiatedSkip) {
                const video = document.querySelector('video');
                if (video) video.pause();
                return;
            }
            userInitiatedSkip = false;
            return original();
        };
        wrapper._isAutoplayBlockWrapper = true;
        player.nextVideo = wrapper;
    }

    function setupNextButtonTracking() {
        const btn = document.querySelector('.ytp-next-button');
        if (!btn || btn._blockAutoplayTracked) return;
        btn._blockAutoplayTracked = true;
        btn.addEventListener('click', markUserSkip, true);
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'N' && e.shiftKey) markUserSkip();
    }, true);

    setInterval(() => {
        createBlockAutoplayButton();
        updateBlockAutoplayButton();
        setupVideoBlocking();
        interceptPlayerNextVideo();
        setupNextButtonTracking();
    }, 1000);
})();
