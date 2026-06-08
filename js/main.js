// ============================================
// FlickZZ Resources - Main UI Script
// Shared across all pages (theme, nav, toast)
// ============================================

import { logout, onAuthReady } from "./auth.js";

// ============ THEME TOGGLE ============
const THEME_KEY = 'flickzz-theme';

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
    const icon = document.querySelector('#themeToggle i');
    if (icon) {
        icon.className = theme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
    }
}

function initTheme() {
    const saved = localStorage.getItem(THEME_KEY) || 'dark';
    applyTheme(saved);

    const btn = document.getElementById('themeToggle');
    if (btn) {
        btn.addEventListener('click', () => {
            const cur = document.documentElement.getAttribute('data-theme');
            applyTheme(cur === 'dark' ? 'light' : 'dark');
        });
    }
}

// ============ NAVBAR ============
function initNavbar() {
    const navbar = document.getElementById('navbar');
    if (navbar) {
        const handleScroll = () => {
            navbar.classList.toggle('scrolled', window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        handleScroll();
    }

    // Mobile toggle
    const mobileToggle = document.getElementById('mobileToggle');
    const navLinks = document.getElementById('navLinks');
    if (mobileToggle && navLinks) {
        mobileToggle.addEventListener('click', () => {
            navLinks.classList.toggle('open');
        });
    }

    // User dropdown
    const avatar = document.getElementById('userAvatar');
    const dropdown = document.getElementById('userDropdown');
    if (avatar && dropdown) {
        avatar.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('active');
        });
        document.addEventListener('click', (e) => {
            if (!dropdown.contains(e.target) && !avatar.contains(e.target)) {
                dropdown.classList.remove('active');
            }
        });
    }

    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                await logout();
                showToast('Logged out successfully', 'success');
            } catch (err) {
                showToast('Error logging out', 'error');
            }
        });
    }
}

// ============ PASSWORD TOGGLE ============
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

// ============ TOAST ============
export function showToast(message, type = 'info', duration = 3500) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const icons = {
        success: 'fa-circle-check',
        error: 'fa-circle-exclamation',
        warning: 'fa-triangle-exclamation',
        info: 'fa-circle-info'
    };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fas ${icons[type] || icons.info}"></i>
        <div class="toast-msg">${message}</div>
    `;
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('closing');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// Expose globally for non-module scripts
window.showToast = showToast;

// ============ SCROLL REVEAL ============
function initScrollReveal() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

// ============ FIREBASE ERROR TRANSLATOR ============
export function translateFirebaseError(err) {
    const code = err?.code || '';
    const map = {
        'auth/email-already-in-use': 'This email is already registered.',
        'auth/invalid-email': 'Invalid email address.',
        'auth/operation-not-allowed': 'Email/password sign-in is disabled.',
        'auth/weak-password': 'Password must be at least 6 characters.',
        'auth/user-disabled': 'This account has been disabled.',
        'auth/user-not-found': 'No account found with this email.',
        'auth/wrong-password': 'Incorrect password.',
        'auth/invalid-credential': 'Invalid email or password.',
        'auth/too-many-requests': 'Too many attempts. Please try again later.',
        'auth/popup-closed-by-user': 'Sign-in popup was closed.',
        'auth/network-request-failed': 'Network error. Check your connection.',
        'storage/unauthorized': 'Upload permission denied.',
        'storage/canceled': 'Upload canceled.',
        'permission-denied': 'Permission denied.'
    };
    return map[code] || err?.message || 'Something went wrong. Please try again.';
}

// ============ INIT ============
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initNavbar();
    initPasswordToggle();
    initScrollReveal();
});
