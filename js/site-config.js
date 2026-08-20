// ============================================
// FlickZZ Resources - Site-wide Config
// Owner: Arsh Siddique © 2026
// ============================================
//
// Loads LIVE settings from Firestore (managed by admin in Site Settings tab).
// Falls back to defaults when offline / not configured.
// Social URLs are never embedded in HTML — only injected at runtime when icons are clicked.

import { subscribeSettings, DEFAULT_SETTINGS } from "./settings-api.js";

// ============ 🔥 GOOGLE ANALYTICS MEASUREMENT ID ============
// ⚠️ REPLACE 'G-XXXXXXXX' WITH YOUR REAL MEASUREMENT ID FROM GA4
export const GA_MEASUREMENT_ID = 'G-DFK74HEJ2C';

export const SITE = {
    name: 'FlickZZ Resources',
    owner: 'Arsh Siddique',
    year: 2026,
    socials: { ...DEFAULT_SETTINGS },
    settings: { ...DEFAULT_SETTINGS }
};

// ============ GOOGLE ANALYTICS INITIALIZATION ============
function initGoogleAnalytics(measurementId) {
    if (!measurementId || measurementId === 'G-XXXXXXXX') return;
    
    // Load gtag.js script
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    document.head.appendChild(script);
    
    // Initialize dataLayer and gtag
    window.dataLayer = window.dataLayer || [];
    function gtag(){ window.dataLayer.push(arguments); }
    gtag('js', new Date());
    gtag('config', measurementId);
    
    console.log('✅ Google Analytics initialized with ID:', measurementId);
}

// ============ APPLY SETTINGS TO PAGE ============
function applySettings(settings) {
    SITE.settings = settings;
    SITE.socials = {
        discord: settings.discordUrl,
        youtube: settings.youtubeUrl
    };

    // Hero text override
    const heroTitleEl = document.querySelector('.hero-title');
    if (heroTitleEl && settings.heroTitle) {
        heroTitleEl.innerHTML = escapeHtml(settings.heroTitle);
    }
    const heroSubEl = document.querySelector('.hero-subtitle');
    if (heroSubEl && settings.heroSubtitle) {
        heroSubEl.textContent = settings.heroSubtitle;
    }

    // Announcement banner
    renderAnnouncement(settings.announcement);

    // Feedback section visibility on home
    const feedbackSection = document.getElementById('feedback-section');
    if (feedbackSection) {
        feedbackSection.style.display = settings.feedbackEnabled === false ? 'none' : '';
    }

    // Maintenance mode (block everyone except owner)
    if (settings.maintenance) {
        applyMaintenanceMode();
    }

    // Rebind social links with the latest URLs
    bindSocialLinks();
}

function renderAnnouncement(msg) {
    let banner = document.getElementById('siteAnnouncementBar');
    if (!msg) {
        if (banner) banner.remove();
        document.documentElement.style.removeProperty('--ann-offset');
        return;
    }
    if (!banner) {
        banner = document.createElement('div');
        banner.id = 'siteAnnouncementBar';
        banner.className = 'site-announcement';
        document.body.prepend(banner);
        document.documentElement.style.setProperty('--ann-offset', '40px');
    }
    banner.innerHTML = `
        <i class="fas fa-bullhorn"></i>
        <span>${escapeHtml(msg)}</span>
        <button class="ann-close" aria-label="Dismiss"><i class="fas fa-times"></i></button>
    `;
    banner.querySelector('.ann-close').addEventListener('click', () => {
        banner.remove();
        document.documentElement.style.removeProperty('--ann-offset');
    });
}

function applyMaintenanceMode() {
    const path = window.location.pathname.toLowerCase();
    if (path.includes('flickzz-control-panel')) return;

    import('./auth.js').then(({ authState, onAuthReady }) => {
        onAuthReady(() => {
            if (authState.isOwner) return;
            document.body.innerHTML = `
                <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;text-align:center;padding:2rem;background:var(--bg);color:var(--text);">
                    <div>
                        <i class="fas fa-screwdriver-wrench" style="font-size:4rem;color:var(--warning);margin-bottom:1.5rem;"></i>
                        <h1 style="font-size:2rem;font-weight:800;margin-bottom:0.5rem;">We'll be right back!</h1>
                        <p style="color:var(--text-muted);max-width:480px;margin:0 auto 1.5rem;">FlickZZ Resources is undergoing maintenance. Please check back in a few minutes.</p>
                        <a href="javascript:location.reload()" class="btn btn-primary"><i class="fas fa-rotate-right"></i> Refresh</a>
                    </div>
                </div>
            `;
        });
    });
}

// ============ SOCIAL LINK BINDING ============
export function bindSocialLinks() {
    document.querySelectorAll('[data-social]').forEach(el => {
        const key = el.getAttribute('data-social');
        const url = SITE.socials[key];
        if (el.dataset.socialBound === '1' && el._socialUrl === url) return;

        if (!url) {
            el.style.display = 'none';
            return;
        }
        el.style.display = '';
        el.removeAttribute('href');
        el.style.cursor = 'pointer';
        el.setAttribute('role', 'link');
        el.setAttribute('tabindex', '0');

        if (el._socialClick) el.removeEventListener('click', el._socialClick);
        if (el._socialKey) el.removeEventListener('keydown', el._socialKey);

        el._socialUrl = url;
        el._socialClick = (e) => {
            e.preventDefault();
            window.open(url, '_blank', 'noopener,noreferrer');
        };
        el._socialKey = (e) => {
            if (e.key === 'Enter' || e.key === ' ') el._socialClick(e);
        };
        el.addEventListener('click', el._socialClick);
        el.addEventListener('keydown', el._socialKey);
        el.dataset.socialBound = '1';
    });
}

function escapeHtml(s) {
    if (!s) return '';
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ============ BOOT ============
function boot() {
    bindSocialLinks();

    // 🔥 Initialize Google Analytics
    if (GA_MEASUREMENT_ID && GA_MEASUREMENT_ID !== 'G-XXXXXXXX') {
        initGoogleAnalytics(GA_MEASUREMENT_ID);
    }

    // Subscribe to live settings — admin saves apply across the site within ~1 second
    subscribeSettings();
    // Listen for emitted settings
    window.addEventListener('site-settings', (e) => {
        applySettings(e.detail);
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
} else {
    boot();
}
