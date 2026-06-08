// ============================================
// FlickZZ Resources - Basic UI Protection
// Owner: Arsh Siddique © 2026
// Deterrent-level only. Not a security measure.
// ============================================

(function () {
    'use strict';

    // Disable right-click context menu
    document.addEventListener('contextmenu', function (e) {
        // Allow right-click inside form inputs/textareas for usability
        const tag = (e.target.tagName || '').toLowerCase();
        if (tag === 'input' || tag === 'textarea') return;
        e.preventDefault();
        showProtectionWarning('Right-click is disabled on this site.');
    });

    // Block common keyboard shortcuts
    document.addEventListener('keydown', function (e) {
        // F12 (DevTools)
        if (e.key === 'F12') {
            e.preventDefault();
            showProtectionWarning('Developer tools are disabled.');
            return;
        }
        // Ctrl+Shift+I / Ctrl+Shift+J / Ctrl+Shift+C (DevTools)
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && ['I', 'J', 'C'].includes(e.key.toUpperCase())) {
            e.preventDefault();
            showProtectionWarning('Developer tools are disabled.');
            return;
        }
        // Ctrl+U (view source)
        if ((e.ctrlKey || e.metaKey) && e.key.toUpperCase() === 'U') {
            e.preventDefault();
            showProtectionWarning('Viewing source is disabled.');
            return;
        }
        // Ctrl+S (save page)
        if ((e.ctrlKey || e.metaKey) && e.key.toUpperCase() === 'S') {
            e.preventDefault();
            showProtectionWarning('Saving the page is disabled.');
            return;
        }
    });

    // Disable drag on images
    document.addEventListener('dragstart', function (e) {
        if (e.target.tagName === 'IMG') {
            e.preventDefault();
        }
    });

    // Warn when copying large text
    document.addEventListener('copy', function (e) {
        const sel = (window.getSelection() || '').toString();
        // Allow small copies (e.g. emails, version numbers in forms)
        if (sel.length > 200) {
            // Do NOT block (users may legitimately copy descriptions), just warn.
            console.warn('%c⚠️ FlickZZ Resources © 2026 — Arsh Siddique. Do not redistribute copied content.', 'color: orange; font-weight: bold;');
        }
    });

    // Console warning
    try {
        const css1 = 'color:#6366f1;font-size:28px;font-weight:800;text-shadow:2px 2px 0 rgba(0,0,0,0.2);';
        const css2 = 'color:#ef4444;font-size:14px;font-weight:700;';
        const css3 = 'color:#94a3b8;font-size:12px;';
        console.log('%cFlickZZ Resources', css1);
        console.log('%cSTOP! This is a protected platform.', css2);
        console.log('%c© 2026 FlickZZ Resources. All rights reserved. Owned by Arsh Siddique.\nUnauthorized copying, scraping, or redistribution is prohibited.', css3);
    } catch (e) {}

    function showProtectionWarning(msg) {
        if (typeof window.showToast === 'function') {
            window.showToast(msg, 'warning', 2500);
        }
    }
})();
