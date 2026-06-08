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
import { isOwner, isAdminEmail, OWNER_EMAIL, ADMIN_ACCESS_CODE } from "./firebase-config.js";
import { showToast, translateFirebaseError } from "./main.js";

// ============ DOM REFS ============
const accessGate = document.getElementById('accessGate');
const accessDenied = document.getElementById('accessDenied');
const loginRequired = document.getElementById('loginRequired');
const adminContent = document.getElementById('adminContent');

// ============ ACCESS CONTROL ============
const SESSION_KEY = 'flickzz_admin_unlocked';
const ATTEMPTS_KEY = 'flickzz_admin_attempts';
const LOCKOUT_KEY = 'flickzz_admin_lockout_until';

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
    const lockoutUntil = parseInt(sessionStorage.getItem(LOCKOUT_KEY) || '0', 10);
    if (lockoutUntil && Date.now() < lockoutUntil) {
        showLockout(lockoutUntil);
        return;
    }
    if (sessionStorage.getItem(SESSION_KEY) === '1') {
        unlock();
        return;
    }
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
    const input = document.getElementById('accessCodeInput');
    const submit = document.getElementById('accessCodeSubmit');
    setTimeout(() => input.focus(), 100);

    const tryUnlock = () => {
        const code = input.value;
        if (!code) {
            showToast('Please enter the access code', 'warning');
            return;
        }
        if (code === ADMIN_ACCESS_CODE) {
            sessionStorage.setItem(SESSION_KEY, '1');
            sessionStorage.removeItem(ATTEMPTS_KEY);
            showToast('Access granted. Welcome back, Owner. 👑', 'success');
            unlock();
        } else {
            const attempts = parseInt(sessionStorage.getItem(ATTEMPTS_KEY) || '0', 10) + 1;
            sessionStorage.setItem(ATTEMPTS_KEY, String(attempts));
            const remaining = 5 - attempts;
            const attemptsEl = document.getElementById('accessAttempts');
            attemptsEl.classList.remove('hidden');
            attemptsEl.innerHTML = `<i class="fas fa-triangle-exclamation"></i> Wrong code. ${remaining > 0 ? remaining + ' attempt' + (remaining === 1 ? '' : 's') + ' remaining.' : 'You have been locked out for 5 minutes.'}`;
            input.value = '';
            input.style.borderColor = 'var(--danger)';
            setTimeout(() => { input.style.borderColor = ''; }, 1200);
            if (attempts >= 5) {
                const until = Date.now() + 5 * 60 * 1000;
                sessionStorage.setItem(LOCKOUT_KEY, String(until));
                sessionStorage.removeItem(ATTEMPTS_KEY);
                showLockout(until);
            }
        }
    };

    submit.onclick = tryUnlock;
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') tryUnlock();
    });
}

function showLockout(until) {
    hideAll();
    accessGate.classList.remove('hidden');
    const card = accessGate.querySelector('.access-gate-card');
    const mins = Math.ceil((until - Date.now()) / 60000);
    card.innerHTML = `
        <div class="access-gate-icon" style="background: linear-gradient(135deg, var(--danger), #b91c1c);"><i class="fas fa-lock"></i></div>
        <h1>Locked Out</h1>
        <p>Too many failed attempts. Try again in <strong>${mins} minute${mins === 1 ? '' : 's'}</strong>.</p>
        <div class="access-gate-info">
            <p><a href="index.html"><i class="fas fa-arrow-left"></i> Back to home</a></p>
        </div>
    `;
}

function unlock() {
    hideAll();
    adminContent.classList.remove('hidden');
    bootstrap();
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

// ============ STATS ============
async function loadStats() {
    try {
        const stats = await getPlatformStats();
        document.getElementById('totalResources').textContent = formatNumber(stats.totalResources);
        document.getElementById('totalUsers').textContent = formatNumber(stats.totalUsers);
        document.getElementById('totalDownloads').textContent = formatNumber(stats.totalDownloads);
        document.getElementById('totalFeedback').textContent = formatNumber(stats.totalFeedback || 0);
    } catch (err) {
        console.error(err);
    }
}

// ============ DASHBOARD: Top Lists ============
async function loadDashboardLists() {
    try {
        const items = await listResources({ sort: 'popular', max: 5 });
        const list = document.getElementById('topResourcesList');
        if (list) {
            list.innerHTML = items.length
                ? items.map((r, i) => `
                    <a href="resource-detail.html?id=${encodeURIComponent(r.id)}" class="top-list-item">
                        <div class="top-list-rank">${i + 1}</div>
                        <div class="top-list-title">${escapeHtml(r.title)}</div>
                        <div class="top-list-value"><i class="fas fa-download"></i> ${formatNumber(r.downloads || 0)}</div>
                    </a>
                `).join('')
                : '<p style="color:var(--text-muted);font-size:0.9rem;text-align:center;padding:1rem;">No resources yet.</p>';
        }
    } catch (err) {}

    try {
        const users = await getRecentUsers(5);
        const list = document.getElementById('recentUsersList');
        if (list) {
            list.innerHTML = users.length
                ? users.map((u, i) => `
                    <div class="top-list-item">
                        <div class="top-list-rank">${(u.displayName || u.email || '?').charAt(0).toUpperCase()}</div>
                        <div class="top-list-title">${escapeHtml(u.displayName || u.email || 'User')}</div>
                        <div class="top-list-value">${formatDate(u.createdAt)}</div>
                    </div>
                `).join('')
                : '<p style="color:var(--text-muted);font-size:0.9rem;text-align:center;padding:1rem;">No users yet.</p>';
        }
    } catch (err) {}
}

// ============ RESOURCES TABLE ============
let allResources = [];
let searchTerm = '';

async function loadResourcesTable() {
    const tbody = document.getElementById('adminResourcesTable');
    tbody.innerHTML = loadingRow(6);
    try {
        allResources = await listResources({ max: 500 });
        renderResourcesTable();
    } catch (err) {
        console.error(err);
        tbody.innerHTML = errorRow(6, 'Could not load resources.');
    }
}

function renderResourcesTable() {
    const tbody = document.getElementById('adminResourcesTable');
    const filtered = searchTerm
        ? allResources.filter(r => (r.title || '').toLowerCase().includes(searchTerm.toLowerCase()))
        : allResources;

    if (!filtered.length) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--text-muted);">No resources found.</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(r => {
        const cat = CATEGORY_META[r.category] || { label: r.category };
        return `
            <tr>
                <td><strong>${escapeHtml(r.title)}</strong></td>
                <td><span class="table-badge">${escapeHtml(cat.label)}</span></td>
                <td>${formatNumber(r.downloads || 0)}</td>
                <td>${r.featured ? '<i class="fas fa-star" style="color:var(--warning);"></i>' : '—'}</td>
                <td>${formatDate(r.createdAt)}</td>
                <td>
                    <div class="action-btns">
                        <button class="icon-btn" data-action="edit" data-id="${r.id}" title="Edit"><i class="fas fa-pen"></i></button>
                        <a class="icon-btn" href="resource-detail.html?id=${encodeURIComponent(r.id)}" title="View"><i class="fas fa-eye"></i></a>
                        <button class="icon-btn" data-action="toggle-featured" data-id="${r.id}" data-featured="${!!r.featured}" title="${r.featured ? 'Unfeature' : 'Feature'}">
                            <i class="fas fa-star"></i>
                        </button>
                        <button class="icon-btn danger" data-action="delete" data-id="${r.id}" title="Delete"><i class="fas fa-trash"></i></button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    tbody.querySelectorAll('button[data-action]').forEach(btn => {
        btn.addEventListener('click', () => {
            const action = btn.dataset.action;
            const id = btn.dataset.id;
            if (action === 'edit') startEdit(id);
            if (action === 'delete') handleDelete(id);
            if (action === 'toggle-featured') {
                const wasFeatured = btn.dataset.featured === 'true';
                toggleFeatured(id, !wasFeatured);
            }
        });
    });
}

async function toggleFeatured(id, makeFeatured) {
    try {
        await updateResource(id, { featured: makeFeatured });
        showToast(makeFeatured ? 'Marked as featured ⭐' : 'Removed from featured', 'success');
        await loadResourcesTable();
    } catch (err) {
        showToast(translateFirebaseError(err), 'error');
    }
}

function bindAdminSearch() {
    document.getElementById('adminSearch')?.addEventListener('input', (e) => {
        searchTerm = e.target.value.trim();
        renderResourcesTable();
    });
    document.getElementById('usersSearch')?.addEventListener('input', (e) => {
        usersSearchTerm = e.target.value.trim();
        renderUsersTable();
    });
    document.getElementById('commentsSearch')?.addEventListener('input', (e) => {
        commentsSearchTerm = e.target.value.trim();
        renderCommentsTable();
    });
}

async function handleDelete(id) {
    const r = allResources.find(x => x.id === id);
    if (!r) return;
    if (!confirm(`Delete "${r.title}"? This cannot be undone.`)) return;
    try {
        await deleteResource(id, r.filePath);
        showToast('Resource deleted', 'success');
        await loadStats();
        await loadResourcesTable();
        await loadDashboardLists();
    } catch (err) {
        showToast(translateFirebaseError(err) || 'Could not delete', 'error');
    }
}

// ============ UPLOAD / EDIT FORM (EXTERNAL URL ONLY) ============
let editingId = null;

function bindForm() {
    const form = document.getElementById('uploadForm');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await submitForm();
    });
    document.getElementById('cancelEditBtn').addEventListener('click', (e) => {
        e.preventDefault();
        resetForm();
    });
}

async function submitForm() {
    const submitBtn = document.getElementById('submitResourceBtn');
    const title = document.getElementById('title').value.trim();
    const category = document.getElementById('category').value;
    const tagline = document.getElementById('tagline').value.trim();
    const description = document.getElementById('description').value.trim();
    const version = document.getElementById('version').value.trim();
    const mcVersion = document.getElementById('mcVersion').value.trim();
    const thumbnail = document.getElementById('thumbnail').value.trim();
    const featured = document.getElementById('featured').checked;
    const externalUrl = document.getElementById('externalFileUrl').value.trim();

    if (!title || !category || !description) {
        showToast('Please fill all required fields', 'warning');
        return;
    }
    if (!externalUrl && !editingId) {
        showToast('Please provide an external file URL (MediaFire, Google Drive, etc.)', 'warning');
        return;
    }
    if (externalUrl && !externalUrl.startsWith('http')) {
        showToast('Invalid URL. Must start with http:// or https://', 'warning');
        return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span> Processing...';

    try {
        const payload = { title, category, tagline, description, version, mcVersion, thumbnail, featured };
        if (externalUrl) {
            payload.fileUrl = externalUrl;
            payload.fileName = externalUrl.split('/').pop() || 'resource';
            payload.filePath = ''; // no storage path
            payload.fileSize = 0;
        }

        if (editingId) {
            await updateResource(editingId, payload);
            showToast('Resource updated successfully', 'success');
        } else {
            await createResource(payload);
            showToast('Resource uploaded successfully 🎉', 'success');
        }
        resetForm();
        await loadStats();
        await loadResourcesTable();
        await loadDashboardLists();
    } catch (err) {
        console.error(err);
        showToast(err.message || translateFirebaseError(err), 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = editingId ? '<i class="fas fa-save"></i> Save Changes' : '<i class="fas fa-upload"></i> Upload Resource';
    }
}

async function startEdit(id) {
    const r = await getResource(id);
    if (!r) return showToast('Resource not found', 'error');
    editingId = id;
    document.getElementById('resourceId').value = id;
    document.getElementById('title').value = r.title || '';
    document.getElementById('category').value = r.category || '';
    document.getElementById('tagline').value = r.tagline || '';
    document.getElementById('description').value = r.description || '';
    document.getElementById('version').value = r.version || '';
    document.getElementById('mcVersion').value = r.mcVersion || '';
    document.getElementById('thumbnail').value = r.thumbnail || '';
    document.getElementById('featured').checked = !!r.featured;
    document.getElementById('externalFileUrl').value = r.fileUrl || '';
    document.getElementById('formTitle').innerHTML = '<i class="fas fa-pen"></i> Edit Resource';
    document.getElementById('submitResourceBtn').innerHTML = '<i class="fas fa-save"></i> Save Changes';
    document.querySelector('.admin-nav-item[data-tab="upload"]').click();
}

function resetForm() {
    editingId = null;
    document.getElementById('uploadForm').reset();
    document.getElementById('resourceId').value = '';
    document.getElementById('formTitle').innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Upload New Resource';
    document.getElementById('externalFileUrl').value = '';
    document.getElementById('submitResourceBtn').innerHTML = '<i class="fas fa-upload"></i> Upload Resource';
    document.getElementById('uploadProgress').classList.add('hidden');
}

// ============ FEEDBACK TABLE ============
async function loadFeedbackTable() {
    const tbody = document.getElementById('adminFeedbackTable');
    if (!tbody) return;
    tbody.innerHTML = loadingRow(6);
    try {
        const items = await listFeedback({ max: 200, includeHidden: true });
        if (!items.length) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--text-muted);">No feedback yet.</td></tr>`;
            return;
        }
        tbody.innerHTML = items.map(f => {
            const stars = '★'.repeat(f.rating || 0) + '☆'.repeat(5 - (f.rating || 0));
            return `
                <tr>
                    <td>
                        <strong>${escapeHtml(f.userName || 'User')}</strong>
                        <div style="font-size:0.75rem;color:var(--text-dim);">${escapeHtml(f.userEmail || '')}</div>
                    </td>
                    <td><span style="color:var(--warning);letter-spacing:1px;">${stars}</span></td>
                    <td style="max-width:350px;">
                        <div style="white-space:normal;word-break:break-word;color:var(--text-muted);">${escapeHtml(f.text || '')}</div>
                    </td>
                    <td>
                        ${f.hidden ? '<span class="status-badge status-banned">Hidden</span>' : '<span class="status-badge status-active">Visible</span>'}
                    </td>
                    <td>${formatDate(f.createdAt)}</td>
                    <td>
                        <div class="action-btns">
                            <button class="icon-btn" data-fb-action="toggle" data-id="${f.id}" data-hidden="${!!f.hidden}" title="${f.hidden ? 'Show' : 'Hide'}">
                                <i class="fas fa-${f.hidden ? 'eye' : 'eye-slash'}"></i>
                            </button>
                            <button class="icon-btn danger" data-fb-action="delete" data-id="${f.id}" title="Delete">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
        tbody.querySelectorAll('button[data-fb-action]').forEach(btn => {
            btn.addEventListener('click', async () => {
                const action = btn.dataset.fbAction;
                const id = btn.dataset.id;
                if (action === 'delete') {
                    if (!confirm('Delete this feedback permanently?')) return;
                    try {
                        await deleteFeedback(id);
                        showToast('Feedback deleted', 'success');
                        loadFeedbackTable();
                        loadStats();
                    } catch (err) { showToast(translateFirebaseError(err), 'error'); }
                } else if (action === 'toggle') {
                    const isHidden = btn.dataset.hidden === 'true';
                    try {
                        await toggleFeedbackVisibility(id, !isHidden);
                        showToast(isHidden ? 'Feedback now visible' : 'Feedback hidden', 'success');
                        loadFeedbackTable();
                    } catch (err) { showToast(translateFirebaseError(err), 'error'); }
                }
            });
        });
    } catch (err) {
        console.error(err);
        tbody.innerHTML = errorRow(6, 'Could not load feedback.');
    }
}

// ============ USERS TABLE ============
let allUsers = [];
let usersSearchTerm = '';

async function loadUsersTable() {
    const tbody = document.getElementById('usersTable');
    if (!tbody) return;
    tbody.innerHTML = loadingRow(6);
    try {
        allUsers = await listUsers({ max: 500 });
        renderUsersTable();
    } catch (err) {
        console.error(err);
        tbody.innerHTML = errorRow(6, 'Could not load users.');
    }
}

function renderUsersTable() {
    const tbody = document.getElementById('usersTable');
    if (!tbody) return;
    const filtered = usersSearchTerm
        ? allUsers.filter(u =>
            (u.email || '').toLowerCase().includes(usersSearchTerm.toLowerCase()) ||
            (u.displayName || '').toLowerCase().includes(usersSearchTerm.toLowerCase())
        )
        : allUsers;

    if (!filtered.length) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--text-muted);">No users found.</td></tr>`;
        return;
    }

    const ownerEmail = (OWNER_EMAIL || '').toLowerCase();
    tbody.innerHTML = filtered.map(u => {
        const isOwnerRow = (u.email || '').toLowerCase() === ownerEmail;
        const isAdminRow = u.isAdmin || isAdminEmail(u.email || '');
        const initial = (u.displayName || u.email || '?').charAt(0).toUpperCase();
        let roleBadge;
        if (isOwnerRow) roleBadge = '<span class="status-badge status-owner"><i class="fas fa-crown"></i> Owner</span>';
        else if (isAdminRow) roleBadge = '<span class="status-badge status-admin">Admin</span>';
        else roleBadge = '<span class="status-badge">User</span>';
        const statusBadge = u.banned ? '<span class="status-badge status-banned">Banned</span>' : '<span class="status-badge status-active">Active</span>';
        return `
            <tr>
                <td>
                    <div style="display:flex;align-items:center;gap:0.6rem;">
                        <div class="feedback-user-avatar" style="width:34px;height:34px;font-size:0.9rem;">${escapeHtml(initial)}</div>
                        <strong>${escapeHtml(u.displayName || 'User')}</strong>
                    </div>
                </td>
                <td>${escapeHtml(u.email || '—')}</td>
                <td>${roleBadge}</td>
                <td>${statusBadge}</td>
                <td>${formatDate(u.createdAt)}</td>
                <td>
                    ${isOwnerRow ? '<span style="color:var(--text-dim);font-size:0.85rem;">Cannot modify owner</span>' : `
                        <div class="action-btns">
                            <button class="icon-btn" data-user-action="${u.banned ? 'unban' : 'ban'}" data-id="${u.id}" title="${u.banned ? 'Unban' : 'Ban'}">
                                <i class="fas fa-${u.banned ? 'unlock' : 'ban'}"></i>
                            </button>
                            <button class="icon-btn danger" data-user-action="delete" data-id="${u.id}" title="Delete user record">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    `}
                </td>
            </tr>
        `;
    }).join('');

    tbody.querySelectorAll('button[data-user-action]').forEach(btn => {
        btn.addEventListener('click', async () => {
            const action = btn.dataset.userAction;
            const id = btn.dataset.id;
            try {
                if (action === 'ban') {
                    if (!confirm('Ban this user? They will be marked as banned.')) return;
                    await setUserBanned(id, true);
                    showToast('User banned', 'success');
                } else if (action === 'unban') {
                    await setUserBanned(id, false);
                    showToast('User unbanned', 'success');
                } else if (action === 'delete') {
                    if (!confirm('Delete this user record? Their Firebase Auth account still exists — remove that from the Firebase Console.')) return;
                    await deleteUserRecord(id);
                    showToast('User record deleted', 'success');
                }
                await loadUsersTable();
                await loadStats();
            } catch (err) {
                showToast(translateFirebaseError(err), 'error');
            }
        });
    });
}

// ============ COMMENTS TABLE ============
let allComments = [];
let commentsSearchTerm = '';

async function loadCommentsTable() {
    const tbody = document.getElementById('commentsTable');
    if (!tbody) return;
    tbody.innerHTML = loadingRow(5);
    try {
        allComments = await listAllComments({ max: 300 });
        renderCommentsTable();
    } catch (err) {
        console.error(err);
        tbody.innerHTML = errorRow(5, 'Could not load comments. (You may need a Firestore index for collectionGroup queries.)');
    }
}

function renderCommentsTable() {
    const tbody = document.getElementById('commentsTable');
    if (!tbody) return;
    const filtered = commentsSearchTerm
        ? allComments.filter(c =>
            (c.text || '').toLowerCase().includes(commentsSearchTerm.toLowerCase()) ||
            (c.userName || '').toLowerCase().includes(commentsSearchTerm.toLowerCase())
        )
        : allComments;

    if (!filtered.length) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:2rem;color:var(--text-muted);">No comments yet.</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(c => `
        <tr>
            <td><strong>${escapeHtml(c.userName || 'User')}</strong></td>
            <td style="max-width:350px;">
                <div style="white-space:normal;word-break:break-word;color:var(--text-muted);">${escapeHtml(c.text || '')}</div>
            </td>
            <td>
                <a href="resource-detail.html?id=${encodeURIComponent(c.resourceId)}" style="color:var(--primary);font-size:0.85rem;">
                    <i class="fas fa-external-link-alt"></i> View
                </a>
            </td>
            <td>${formatDate(c.createdAt)}</td>
            <td>
                <button class="icon-btn danger" data-comment-action="delete" data-rid="${c.resourceId}" data-cid="${c.id}" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');

    tbody.querySelectorAll('button[data-comment-action]').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (!confirm('Delete this comment?')) return;
            try {
                await deleteAnyComment(btn.dataset.rid, btn.dataset.cid);
                showToast('Comment deleted', 'success');
                await loadCommentsTable();
            } catch (err) {
                showToast(translateFirebaseError(err), 'error');
            }
        });
    });
}

// ============ DOWNLOADS TABLE ============
async function loadDownloadsTable() {
    const tbody = document.getElementById('downloadsTable');
    if (!tbody) return;
    tbody.innerHTML = loadingRow(3);
    try {
        const items = await listAllDownloads({ max: 100 });
        if (!items.length) {
            tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;padding:2rem;color:var(--text-muted);">No downloads yet.</td></tr>`;
            return;
        }
        const userMap = {};
        allUsers.forEach(u => { userMap[u.uid || u.id] = u; });
        tbody.innerHTML = items.map(d => {
            const user = userMap[d.userId];
            const userLabel = user ? (user.displayName || user.email) : d.userId.slice(0, 8) + '...';
            const res = allResources.find(r => r.id === d.resourceId);
            const resLabel = res ? res.title : d.resourceId.slice(0, 8) + '...';
            return `
                <tr>
                    <td>${escapeHtml(userLabel)}</td>
                    <td>
                        ${res ? `<a href="resource-detail.html?id=${encodeURIComponent(d.resourceId)}" style="color:var(--primary);">${escapeHtml(resLabel)}</a>` : escapeHtml(resLabel)}
                    </td>
                    <td>${formatDate(d.downloadedAt)}</td>
                </tr>
            `;
        }).join('');
    } catch (err) {
        console.error(err);
        tbody.innerHTML = errorRow(3, 'Could not load downloads.');
    }
}

// ============ SITE SETTINGS ============
async function loadSettings() {
    try {
        const s = await fetchSettings();
        document.getElementById('setDiscord').value = s.discordUrl || '';
        document.getElementById('setYoutube').value = s.youtubeUrl || '';
        document.getElementById('setAnnouncement').value = s.announcement || '';
        document.getElementById('setHeroTitle').value = s.heroTitle || '';
        document.getElementById('setHeroSubtitle').value = s.heroSubtitle || '';
        document.getElementById('setFeedbackEnabled').checked = s.feedbackEnabled !== false;
        document.getElementById('setRegistrationOpen').checked = s.registrationOpen !== false;
        document.getElementById('setMaintenance').checked = !!s.maintenance;
    } catch (err) {
        console.warn('loadSettings error', err);
    }
}

function bindSettingsForm() {
    const form = document.getElementById('settingsForm');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = form.querySelector('button[type=submit]');
        submitBtn.disabled = true;
        const orig = submitBtn.innerHTML;
        submitBtn.innerHTML = '<span class="spinner"></span> Saving...';
        try {
            await saveSettings({
                discordUrl: document.getElementById('setDiscord').value.trim(),
                youtubeUrl: document.getElementById('setYoutube').value.trim(),
                announcement: document.getElementById('setAnnouncement').value.trim(),
                heroTitle: document.getElementById('setHeroTitle').value.trim(),
                heroSubtitle: document.getElementById('setHeroSubtitle').value.trim(),
                feedbackEnabled: document.getElementById('setFeedbackEnabled').checked,
                registrationOpen: document.getElementById('setRegistrationOpen').checked,
                maintenance: document.getElementById('setMaintenance').checked
            });
            showToast('Settings saved! Changes are live across the site. ⚡', 'success');
        } catch (err) {
            showToast(translateFirebaseError(err), 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = orig;
        }
    });
}

// ============ HELPERS ============
function loadingRow(cols) {
    return `<tr><td colspan="${cols}" style="text-align:center;padding:2rem;color:var(--text-muted);"><span class="spinner"></span> Loading...</td></tr>`;
}
function errorRow(cols, msg) {
    return `<tr><td colspan="${cols}" style="text-align:center;padding:2rem;color:var(--danger);">${msg}</td></tr>`;
}
function escapeHtml(s) {
    if (!s) return '';
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}