// ==UserScript==
// @name         Smart Universal Dark Mode
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  Apply dark mode only to light-themed websites
// @author       You
// @match        *://*/*
// @grant        GM_addStyle
// @grant        GM.addStyle
// @run-at       document-end
// @noframes
// ==/UserScript==

(function() {
    'use strict';
    
    // List of domains to exclude (sites that already have good dark modes)
    const excludedDomains = [
        'youtube.com',
        'github.com',
        'twitter.com',
        'reddit.com',
        'claude.ai',
        'chatgpt.com',
        'facebook.com'
    ];
    
    // Check if current site should be excluded
    const currentDomain = window.location.hostname;
    if (excludedDomains.some(domain => currentDomain.includes(domain))) {
        return;
    }
    
    // Convert rgba/rgb to brightness value
    function getBrightness(color) {
        if (!color) return null;
        const match = color.match(/\d+/g);
        if (!match || match.length < 3) return null;
        
        const r = parseInt(match[0]);
        const g = parseInt(match[1]);
        const b = parseInt(match[2]);
        const a = match[3] ? parseFloat(match[3]) : 1;
        
        // Skip transparent backgrounds
        if (a < 0.5) return null;
        
        // Calculate relative luminance
        return (0.299 * r + 0.587 * g + 0.114 * b);
    }
    
    function checkBrightness() {
        console.log('[Dark Mode] Sampling elements...');
        
        if (!document.body) {
            console.log('[Dark Mode] Body not ready');
            return null;
        }
        
        // Check body background first - if it's dark, the site is in dark mode
        const bodyStyle = window.getComputedStyle(document.body);
        const bodyBg = bodyStyle.backgroundColor;
        const bodyBrightness = getBrightness(bodyBg);
        
        if (bodyBrightness !== null && bodyBrightness < 150) {
            console.log(`[Dark Mode] Body background is dark (${bodyBrightness}) - dark mode detected!`);
            return false; // Not light theme
        }
        
        console.log(`[Dark Mode] Body background: ${bodyBg} → ${bodyBrightness}`);
        
        // Get ALL elements in the document
        const allElements = document.body.getElementsByTagName('*');
        console.log(`[Dark Mode] Total elements in body: ${allElements.length}`);
        
        if (allElements.length < 10) {
            console.log('[Dark Mode] Too few elements, likely an iframe or loading page');
            return null;
        }
        
        const samples = [];
        let checked = 0;
        let skipped = 0;
        
        // Check every element but sample intelligently
        for (let i = 0; i < allElements.length; i++) {
            const el = allElements[i];
            const style = window.getComputedStyle(el);
            const bg = style.backgroundColor;
            
            // Get element dimensions
            const rect = el.getBoundingClientRect();
            const width = rect.width;
            const height = rect.height;
            
            // Skip elements that are too small (likely not important for theme detection)
            if (width < 50 || height < 50) {
                skipped++;
                continue;
            }
            
            checked++;
            const brightness = getBrightness(bg);
            
            if (brightness !== null) {
                samples.push(brightness);
                
                // Log first few samples for debugging
                if (samples.length <= 5) {
                    console.log(`[Dark Mode] Sample ${samples.length}: ${el.tagName} ${Math.round(width)}x${Math.round(height)}px → ${bg} → ${brightness}`);
                }
            }
            
            // Stop after collecting enough samples
            if (samples.length >= 50) break;
        }
        
        console.log(`[Dark Mode] Checked ${checked} elements (skipped ${skipped} too small)`);
        console.log(`[Dark Mode] Got ${samples.length} valid background samples`);
        
        if (samples.length < 3) {
            console.log('[Dark Mode] Not enough valid samples yet, need to retry');
            return null;
        }
        
        return analyzeSamples(samples);
    }
    
    function analyzeSamples(samples) {
        // Use the median brightness to avoid outliers
        samples.sort((a, b) => a - b);
        const median = samples[Math.floor(samples.length / 2)];
        
        // Count how many samples are dark vs light
        const darkCount = samples.filter(b => b < 150).length;
        const lightCount = samples.filter(b => b >= 150).length;
        
        console.log('[Dark Mode] Sample distribution:', {
            total: samples.length,
            min: samples[0],
            max: samples[samples.length - 1],
            median: median,
            darkCount: darkCount,
            lightCount: lightCount
        });
        
        // If most samples are light, it's a light theme
        const isLight = lightCount > darkCount;
        console.log('[Dark Mode] Is light theme?', isLight);
        
        return isLight;
    }
    
    // Safari-compatible style injection
    function addStyles(css) {
        if (typeof GM_addStyle !== 'undefined') {
            GM_addStyle(css);
        } else if (typeof GM !== 'undefined' && GM.addStyle) {
            GM.addStyle(css);
        } else {
            const style = document.createElement('style');
            style.textContent = css;
            (document.head || document.documentElement).appendChild(style);
        }
    }
    
    // Dark mode CSS
    const darkModeCSS = `
        /* Invert colors for dark mode */
        html {
            background-color: #1a1a1a !important;
            filter: invert(1) hue-rotate(180deg);
        }
        
        /* Invert images and videos back to normal */
        img, picture, video, iframe, canvas,
        [style*="background-image"],
        svg {
            filter: invert(1) hue-rotate(180deg) !important;
        }
        
        /* Handle inline background images */
        *[style*="background-image"] {
            filter: invert(1) hue-rotate(180deg) !important;
        }
        
        /* Smooth transitions */
        * {
            transition: background-color 0.3s ease, color 0.3s ease !important;
        }
    `;
    
    // Apply dark mode if the site is light-themed
    async function applyDarkModeIfNeeded() {
        // Wait for page to fully load
        if (document.readyState !== 'complete') {
            await new Promise(resolve => {
                window.addEventListener('load', resolve);
            });
        }
        
        console.log('[Dark Mode] Page loaded, starting detection...');
        
        // Give the page time to render dynamic content
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Retry detection up to 5 times if we don't get enough samples
        let result = null;
        let attempts = 0;
        const maxAttempts = 3;
        
        while (attempts < maxAttempts) {
            result = checkBrightness();
            
            if (result !== null) {
                break;
            }
            
            attempts++;
            console.log(`[Dark Mode] Retry ${attempts}/${maxAttempts} - waiting for more content...`);
            await new Promise(resolve => setTimeout(resolve, 250));
        }
        
        // If still no valid result after retries, default to applying dark mode
        if (result === null) {
            console.log('[Dark Mode] Could not detect theme after retries, applying dark mode by default');
            result = true;
        }
        
        if (result) {
            console.log('[Dark Mode] ✓ Applying dark mode');
            addStyles(darkModeCSS);
            createToggleButton();
        } else {
            console.log('[Dark Mode] ✗ Skipping - dark theme detected');
        }
    }
    
    // Create toggle button
    function createToggleButton() {
        const button = document.createElement('button');
        button.textContent = '🌙';
        button.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 999999;
            width: 50px;
            height: 50px;
            border-radius: 50%;
            border: 2px solid #666;
            background: #333;
            color: white;
            font-size: 24px;
            cursor: pointer;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            filter: invert(1) hue-rotate(180deg);
        `;
        
        let darkModeEnabled = true;
        
        button.addEventListener('click', () => {
            darkModeEnabled = !darkModeEnabled;
            const html = document.documentElement;
            if (darkModeEnabled) {
                html.style.filter = 'invert(1) hue-rotate(180deg)';
                button.textContent = '🌙';
            } else {
                html.style.filter = 'none';
                button.textContent = '☀️';
            }
        });
        
        // Wait for body to be available
        const addButton = () => {
            if (document.body) {
                document.body.appendChild(button);
            } else {
                setTimeout(addButton, 100);
            }
        };
        addButton();
    }
    
    // Run detection when everything is loaded
    if (document.readyState === 'complete') {
        applyDarkModeIfNeeded();
    } else {
        window.addEventListener('load', applyDarkModeIfNeeded);
    }
})();
