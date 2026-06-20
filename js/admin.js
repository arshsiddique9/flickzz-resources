// ============================================
// FlickZZ Resources - Admin Panel (Owner-Only Control Center)
// Owner: Arsh Siddique © 2026
// ============================================

import { requireAuth, authState, onAuthReady, logout } from "./auth.js";
import {
    listResources, createResource, updateResource, deleteResource,
    getPlatformStats, getResource,
    CATEGORY_META, formatDate, formatNumber, formatFileSize
} from "./resources-api.js";
import {
    listFeedback, deleteFeedback, toggleFeedbackVisibility
} from "./feedback-api.js";
import {
    listUsers, setUserBanned, setUserAdmin, deleteUserRecord,
    listAllComments, deleteAnyComment, listAllDownloads, getRecentUsers
} from "./users-api.js";
import {
    fetchSettings, saveSettings, DEFAULT_SETTINGS
} from "./settings-api.js";
import { isOwner, isAdminEmail, OWNER_EMAIL } from "./firebase-config.js";
import { showToast, translateFirebaseError } from "./main.js";

// ============ DOM REFS ============
const accessGate = document.getElementById('accessGate');
const accessDenied = document.getElementById('accessDenied');
const loginRequired = document.getElementById('loginRequired');
const adminContent = document.getElementById('adminContent');

// ============ SESSION KEY (used after OTP verification) ============
const SESSION_KEY = 'flickzz_admin_unlocked';

// ============ ACCESS CONTROL ============
(async function init() {
    hideAll();

    await new Promise(resolve => onAuthReady(resolve));

    if (!authState.user) {
        loginRequired.classList.remove('hidden');
        sessionStorage.setItem('redirectAfterLogin', '/flickzz-control-panel-x7k.html');
        return;
    }

    if (!authState.isOwner && !authState.isAdmin) {
        accessDenied.classList.remove('hidden');
        console.warn(`[Security] Unauthorized admin access attempt by ${authState.user.email}`);
        return;
    }

    // Check if already unlocked this session (after OTP)
    if (sessionStorage.getItem(SESSION_KEY) === '1') {
        unlock();
        return;
    }

    // Show OTP gate (instead of secret code)
    showGate();
})();

function hideAll() {
    accessGate.classList.add('hidden');
    accessDenied.classList.add('hidden');
    loginRequired.classList.add('hidden');
    adminContent.classList.add('hidden');
}

function showGate() {
    hideAll();
    accessGate.classList.remove('hidden');
    // The OTP UI is already in the HTML
    // The user will enter email -> get OTP -> verify
    // Admin content is hidden until OTP verified
}

function unlock() {
    hideAll();
    adminContent.classList.remove('hidden');
    bootstrap();
}

// ============ BOOTSTRAP ============
async function bootstrap() {
    const u = authState.user;
    const name = u.displayName || u.email.split('@')[0];
    document.getElementById('adminUserName').textContent = name;
    document.getElementById('adminUserEmail').textContent = u.email;
    document.getElementById('dashGreetName').textContent = name;
    document.getElementById('ownerEmailDisplay').textContent = u.email;
    document.getElementById('ownerUidDisplay').textContent = u.uid;

    bindSidebar();
    bindMobileNav();
    bindForm();
    bindAdminSearch();
    bindLogout();
    bindCopyUid();
    bindSettingsForm();

    await Promise.all([
        loadStats(),
        loadResourcesTable(),
        loadFeedbackTable(),
        loadUsersTable(),
        loadCommentsTable(),
        loadDownloadsTable(),
        loadSettings(),
        loadDashboardLists()
    ]);
}

// ... (baaki saara code same rahega – bindSidebar, bindForm, loadStats, etc.)

// ============ SIDEBAR NAV ============
const TAB_TITLES = {
    dashboard: 'Dashboard',
    upload: 'Upload Resource',
    manage: 'Manage Resources',
    users: 'Users',
    comments: 'Comments',
    feedback: 'Feedback',
    downloads: 'Downloads',
    settings: 'Site Settings'
};

function bindSidebar() {
    document.querySelectorAll('.admin-nav-item[data-tab]').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            document.querySelectorAll('.admin-nav-item').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.remove('active'));
            const target = document.getElementById(`tab-${tab}`);
            if (target) target.classList.add('active');
            document.getElementById('adminTabTitle').textContent = TAB_TITLES[tab] || tab;
            document.getElementById('adminSidebar').classList.remove('open');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });
}

function bindMobileNav() {
    const sidebar = document.getElementById('adminSidebar');
    document.getElementById('adminMenuToggle')?.addEventListener('click', () => {
        sidebar.classList.toggle('open');
    });
    document.getElementById('adminThemeBtn')?.addEventListener('click', () => {
        const cur = document.documentElement.getAttribute('data-theme');
        const next = cur === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('flickzz-theme', next);
    });
}

function bindLogout() {
    document.getElementById('adminLogoutBtn')?.addEventListener('click', async () => {
        sessionStorage.removeItem(SESSION_KEY);
        try {
            await logout();
            showToast('Logged out', 'success');
        } catch (err) {
            window.location.href = 'index.html';
        }
    });
}

function bindCopyUid() {
    document.getElementById('copyUidBtn')?.addEventListener('click', async () => {
        const uid = document.getElementById('ownerUidDisplay').textContent;
        try {
            await navigator.clipboard.writeText(uid);
            showToast('UID copied to clipboard!', 'success');
        } catch (err) {
            showToast('Could not copy. Select manually.', 'warning');
        }
    });
}

// ... (baaki saare functions – loadStats, loadDashboardLists, loadResourcesTable, 
//      renderResourcesTable, bindAdminSearch, handleDelete, bindForm, submitForm,
//      startEdit, resetForm, loadFeedbackTable, loadUsersTable, renderUsersTable,
//      loadCommentsTable, renderCommentsTable, loadDownloadsTable, loadSettings,
//      bindSettingsForm, loadingRow, errorRow, escapeHtml – same rahenge)

// ⚠️ NOTE: remove showGate(), showLockout(), and all secret-code related functions.
// The OTP flow is handled by the HTML + APIs.
