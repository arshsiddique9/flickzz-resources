// ============================================
// FlickZZ Resources - Main UI Script
// ============================================

import { logout, onAuthReady } from "./auth.js";

const THEME_KEY = 'flickzz-theme';

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
    const icon = document.querySelector('#themeToggle i');
    if (icon) icon.className = theme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
}

function initTheme() {
    const saved = localStorage.getItem(THEME_KEY) || 'dark';
    applyTheme(saved);
    const btn = document.getElementById('themeToggle');
    if (btn) btn.addEventListener('click', () => {
        applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
    });
}

function initNavbar() {
    const navbar = document.getElementById('navbar');
    if (navbar) {
        window.addEventListener('scroll', () => navbar.classList.toggle('scrolled', window.scrollY > 20));
    }
    const mobileToggle = document.getElementById('mobileToggle');
    const navLinks = document.getElementById('navLinks');
    if (mobileToggle && navLinks) mobileToggle.addEventListener('click', () => navLinks.classList.toggle('open'));
    const avatar = document.getElementById('userAvatar');
    const dropdown = document.getElementById('userDropdown');
    if (avatar && dropdown) {
        avatar.addEventListener('click', (e) => { e.stopPropagation(); dropdown.classList.toggle('active'); });
        document.addEventListener('click', (e) => { if (!dropdown.contains(e.target) && !avatar.contains(e.target)) dropdown.classList.remove('active'); });
    }
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        try { await logout(); showToast('Logged out successfully', 'success'); } catch (err) { showToast('Error logging out', 'error'); }
    });
}

function initPasswordToggle() {
    document.querySelectorAll('.toggle-pass').forEach(btn => {
        btn.addEventListener('click', () => {
            const target = document.getElementById(btn.dataset.target);
            if (!target) return;
            const isPass = target.type === 'password';
            target.type = isPass ? 'text' : 'password';
            btn.querySelector('i').className = isPass ? 'fas fa-eye-slash' : 'fas fa-eye';
        });
    });
}

// ============ TOAST WITH CUSTOM SVG ICONS ============
export function showToast(message, type = 'info', duration = 3500) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const icons = {
        success: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M8 12l2.5 2.5L16 9"/></svg>`,
        error: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>`,
        warning: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 3L2 20h20L12 3z"/><path d="M12 9v5M12 17.5v.5"/></svg>`,
        info: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 8v.5M12 11v5"/></svg>`
    };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div class="toast-icon">${icons[type] || icons.info}</div>
        <div class="toast-msg">${message}</div>
    `;
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('closing');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}
window.showToast = showToast;

function initScrollReveal() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); } });
    }, { threshold: 0.1 });
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

export function translateFirebaseError(err) {
    const code = err?.code || '';
    const map = {
        'auth/email-already-in-use': 'This email is already registered.',
        'auth/invalid-email': 'Invalid email address.',
        'auth/weak-password': 'Password must be at least 6 characters.',
        'auth/user-not-found': 'No account found with this email.',
        'auth/wrong-password': 'Incorrect password.',
        'auth/too-many-requests': 'Too many attempts. Please try again later.',
        'auth/popup-closed-by-user': 'Sign-in popup was closed.',
        'auth/network-request-failed': 'Network error. Check your connection.',
        'permission-denied': 'Permission denied.'
    };
    return map[code] || err?.message || 'Something went wrong. Please try again.';
}

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initNavbar();
    initPasswordToggle();
    initScrollReveal();
});
