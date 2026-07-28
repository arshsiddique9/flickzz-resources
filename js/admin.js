// admin.js (Direct Login – No OTP)
import { authState, onAuthReady, logout } from "./auth.js";
import { isOwner, OWNER_EMAIL } from "./firebase-config.js";
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
import { showToast, translateFirebaseError } from "./main.js";

const accessDenied = document.getElementById('accessDenied');
const loginRequired = document.getElementById('loginRequired');
const adminContent = document.getElementById('adminContent');

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

    unlock();
})();

function hideAll() {
    accessDenied.classList.add('hidden');
    loginRequired.classList.add('hidden');
    adminContent.classList.add('hidden');
}

function unlock() {
    hideAll();
    adminContent.classList.remove('hidden');
    // ✅ Wait for DOM to be fully ready
    setTimeout(() => bootstrap(), 100);
}

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

// ... baaki saare functions (loadStats, loadResourcesTable, bindForm, submitForm, etc.) same rahenge
// Copy from your existing admin.js – only remove OTP/gate related code
