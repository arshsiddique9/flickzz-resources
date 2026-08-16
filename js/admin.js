// admin.js — Complete with Publisher Management + Smart Save Detection
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
    listUsers, setUserBanned, setUserAdmin, setUserPublisher, deleteUserRecord,
    listAllComments, deleteAnyComment, listAllDownloads, getRecentUsers
} from "./users-api.js";
import {
    fetchSettings, saveSettings, DEFAULT_SETTINGS
} from "./settings-api.js";
import { showToast, translateFirebaseError } from "./main.js";

// ============ DOM REFS ============
const accessDenied = document.getElementById('accessDenied');
const loginRequired = document.getElementById('loginRequired');
const adminContent = document.getElementById('adminContent');

// Form change tracking
let formChanged = false;
let originalFormData = {};

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
    setTimeout(() => bootstrap(), 200);
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

    // Track form changes for smart save button
    trackFormChanges();
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
        btn.removeEventListener('click', handleTabClick);
        btn.addEventListener('click', handleTabClick);
    });
}

function handleTabClick(e) {
    const btn = e.currentTarget;
    const tab = btn.dataset.tab;
    document.querySelectorAll('.admin-nav-item').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.remove('active'));
    const target = document.getElementById(`tab-${tab}`);
    if (target) target.classList.add('active');
    const title = document.getElementById('adminTabTitle');
    if (title) title.textContent = TAB_TITLES[tab] || tab;
    const sidebar = document.getElementById('adminSidebar');
    if (sidebar) sidebar.classList.remove('open');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============ MOBILE NAV ============
function bindMobileNav() {
    const sidebar = document.getElementById('adminSidebar');
    const toggle = document.getElementById('adminMenuToggle');
    if (toggle) {
        toggle.removeEventListener('click', toggleSidebar);
        toggle.addEventListener('click', toggleSidebar);
    }
    function toggleSidebar() {
        if (sidebar) sidebar.classList.toggle('open');
    }
    const themeBtn = document.getElementById('adminThemeBtn');
    if (themeBtn) {
        themeBtn.removeEventListener('click', toggleTheme);
        themeBtn.addEventListener('click', toggleTheme);
    }
    function toggleTheme() {
        const cur = document.documentElement.getAttribute('data-theme');
        const next = cur === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('flickzz-theme', next);
    }
}

// ============ LOGOUT ============
function bindLogout() {
    const btn = document.getElementById('adminLogoutBtn');
    if (btn) {
        btn.removeEventListener('click', handleLogout);
        btn.addEventListener('click', handleLogout);
    }
    async function handleLogout() {
        try {
            await logout();
            showToast('Logged out', 'success');
            window.location.href = 'index.html';
        } catch (err) {
            window.location.href = 'index.html';
        }
    }
}

// ============ COPY UID ============
function bindCopyUid() {
    const btn = document.getElementById('copyUidBtn');
    if (btn) {
        btn.removeEventListener('click', copyUid);
        btn.addEventListener('click', copyUid);
    }
    async function copyUid() {
        const uid = document.getElementById('ownerUidDisplay')?.textContent || '';
        try {
            await navigator.clipboard.writeText(uid);
            showToast('UID copied!', 'success');
        } catch {
            showToast('Copy manually', 'warning');
        }
    }
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

// ============ DASHBOARD LISTS ============
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
                : '<p style="color:var(--text-muted);text-align:center;padding:1rem;">No resources yet.</p>';
        }
    } catch (err) {}

    try {
        const users = await getRecentUsers(5);
        const list = document.getElementById('recentUsersList');
        if (list) {
            list.innerHTML = users.length
                ? users.map((u) => `
                    <div class="top-list-item">
                        <div class="top-list-rank">${(u.displayName || u.email || '?').charAt(0).toUpperCase()}</div>
                        <div class="top-list-title">${escapeHtml(u.displayName || u.email || 'User')}</div>
                        <div class="top-list-value">${formatDate(u.createdAt)}</div>
                    </div>
                `).join('')
                : '<p style="color:var(--text-muted);text-align:center;padding:1rem;">No users yet.</p>';
        }
    } catch (err) {}
}

// ============ RESOURCES TABLE ============
let allResources = [];
let searchTerm = '';

async function loadResourcesTable() {
    const tbody = document.getElementById('adminResourcesTable');
    if (!tbody) return;
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
    if (!tbody) return;
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
                        <button class="icon-btn" data-action="toggle-featured" data-id="${r.id}" data-featured="${!!r.featured}"><i class="fas fa-star"></i></button>
                        <button class="icon-btn danger" data-action="delete" data-id="${r.id}" title="Delete"><i class="fas fa-trash"></i></button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    tbody.querySelectorAll('button[data-action]').forEach(btn => {
        btn.removeEventListener('click', handleResourceAction);
        btn.addEventListener('click', handleResourceAction);
    });
}

function handleResourceAction(e) {
    const btn = e.currentTarget;
    const action = btn.dataset.action;
    const id = btn.dataset.id;
    if (action === 'edit') startEdit(id);
    else if (action === 'delete') handleDelete(id);
    else if (action === 'toggle-featured') {
        const wasFeatured = btn.dataset.featured === 'true';
        toggleFeatured(id, !wasFeatured);
    }
}

async function toggleFeatured(id, makeFeatured) {
    try {
        await updateResource(id, { featured: makeFeatured });
        showToast(makeFeatured ? '⭐ Featured' : 'Unfeatured', 'success');
        await loadResourcesTable();
    } catch (err) {
        showToast(translateFirebaseError(err), 'error');
    }
}

function bindAdminSearch() {
    const search = document.getElementById('adminSearch');
    if (search) {
        search.removeEventListener('input', handleSearch);
        search.addEventListener('input', handleSearch);
    }
    function handleSearch(e) {
        searchTerm = e.target.value.trim();
        renderResourcesTable();
    }
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

// ============ UPLOAD FORM WITH SMART SAVE BUTTON ============
let editingId = null;

function bindForm() {
    const form = document.getElementById('uploadForm');
    if (form) {
        form.removeEventListener('submit', submitForm);
        form.addEventListener('submit', submitForm);
    }
    const resetBtn = document.getElementById('cancelEditBtn');
    if (resetBtn) {
        resetBtn.removeEventListener('click', resetForm);
        resetBtn.addEventListener('click', resetForm);
    }
}

// Track changes for smart save button
function trackFormChanges() {
    const form = document.getElementById('uploadForm');
    if (!form) return;
    const inputs = form.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
        input.addEventListener('input', () => checkFormChanged());
        input.addEventListener('change', () => checkFormChanged());
    });
}

function getFormData() {
    return {
        title: document.getElementById('title')?.value || '',
        category: document.getElementById('category')?.value || '',
        tagline: document.getElementById('tagline')?.value || '',
        description: document.getElementById('description')?.value || '',
        version: document.getElementById('version')?.value || '',
        mcVersion: document.getElementById('mcVersion')?.value || '',
        thumbnail: document.getElementById('thumbnail')?.value || '',
        featured: document.getElementById('featured')?.checked || false,
        externalFileUrl: document.getElementById('externalFileUrl')?.value || ''
    };
}

function checkFormChanged() {
    const current = getFormData();
    const changed = JSON.stringify(current) !== JSON.stringify(originalFormData);
    const btn = document.getElementById('submitResourceBtn');
    if (btn) {
        if (changed) {
            btn.classList.add('btn-glow');
            btn.disabled = false;
        } else {
            btn.classList.remove('btn-glow');
            if (!editingId) btn.disabled = false;
        }
    }
}

async function submitForm(e) {
    e.preventDefault();
    const submitBtn = document.getElementById('submitResourceBtn');
    const data = getFormData();

    if (!data.title || !data.category || !data.description) {
        showToast('Please fill all required fields', 'warning');
        return;
    }
    if (!data.externalFileUrl && !editingId) {
        showToast('Please provide a file URL', 'warning');
        return;
    }
    if (data.externalFileUrl && !data.externalFileUrl.startsWith('http')) {
        showToast('Invalid URL. Must start with http:// or https://', 'warning');
        return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span> Processing...';

    try {
        const payload = {
            title: data.title,
            category: data.category,
            tagline: data.tagline,
            description: data.description,
            version: data.version,
            mcVersion: data.mcVersion,
            thumbnail: data.thumbnail,
            featured: data.featured,
            fileUrl: data.externalFileUrl,
            fileName: data.externalFileUrl.split('/').pop() || 'resource',
            filePath: '',
            fileSize: 0
        };

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
    document.querySelector('.admin-nav-item[data-tab="upload"]')?.click();
    // Store original data for comparison
    originalFormData = getFormData();
    document.getElementById('submitResourceBtn')?.classList.remove('btn-glow');
}

function resetForm() {
    editingId = null;
    document.getElementById('uploadForm')?.reset();
    document.getElementById('resourceId').value = '';
    document.getElementById('formTitle').innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Upload New Resource';
    document.getElementById('submitResourceBtn').innerHTML = '<i class="fas fa-upload"></i> Upload Resource';
    document.getElementById('submitResourceBtn')?.classList.remove('btn-glow');
    originalFormData = {};
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
                    <td><strong>${escapeHtml(f.userName || 'User')}</strong><div style="font-size:0.75rem;color:var(--text-dim);">${escapeHtml(f.userEmail || '')}</div></td>
                    <td><span style="color:var(--warning);letter-spacing:1px;">${stars}</span></td>
                    <td style="max-width:350px;"><div style="white-space:normal;word-break:break-word;color:var(--text-muted);">${escapeHtml(f.text || '')}</div></td>
                    <td>${f.hidden ? '<span class="status-badge status-banned">Hidden</span>' : '<span class="status-badge status-active">Visible</span>'}</td>
                    <td>${formatDate(f.createdAt)}</td>
                    <td>
                        <div class="action-btns">
                            <button class="icon-btn" data-fb-action="toggle" data-id="${f.id}" data-hidden="${!!f.hidden}"><i class="fas fa-${f.hidden ? 'eye' : 'eye-slash'}"></i></button>
                            <button class="icon-btn danger" data-fb-action="delete" data-id="${f.id}"><i class="fas fa-trash"></i></button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
        tbody.querySelectorAll('button[data-fb-action]').forEach(btn => {
            btn.removeEventListener('click', handleFeedbackAction);
            btn.addEventListener('click', handleFeedbackAction);
        });
    } catch (err) {
        console.error(err);
        tbody.innerHTML = errorRow(6, 'Could not load feedback.');
    }
}

async function handleFeedbackAction(e) {
    const btn = e.currentTarget;
    const action = btn.dataset.fbAction;
    const id = btn.dataset.id;
    if (action === 'delete') {
        if (!confirm('Delete this feedback?')) return;
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
            showToast(isHidden ? 'Feedback visible' : 'Feedback hidden', 'success');
            loadFeedbackTable();
        } catch (err) { showToast(translateFirebaseError(err), 'error'); }
    }
}

// ============ USERS TABLE WITH PUBLISHER ROLE ============
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
        const isAdminRow = u.isAdmin || isOwnerRow;
        const isPublisherRow = u.isPublisher;
        const initial = (u.displayName || u.email || '?').charAt(0).toUpperCase();
        let roleBadge;
        if (isOwnerRow) roleBadge = '<span class="status-badge status-owner"><i class="fas fa-crown"></i> Owner</span>';
        else if (isAdminRow) roleBadge = '<span class="status-badge status-admin">Admin</span>';
        else if (isPublisherRow) roleBadge = '<span class="status-badge status-publisher"><i class="fas fa-upload"></i> Publisher</span>';
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
                    ${isOwnerRow ? '<span style="color:var(--text-dim);font-size:0.85rem;">Cannot modify</span>' : `
                        <div class="action-btns">
                            <button class="icon-btn" data-user-action="${u.banned ? 'unban' : 'ban'}" data-id="${u.id}" title="${u.banned ? 'Unban' : 'Ban'}"><i class="fas fa-${u.banned ? 'unlock' : 'ban'}"></i></button>
                            <button class="icon-btn ${isPublisherRow ? 'success' : ''}" data-user-action="toggle-publisher" data-id="${u.id}" data-publisher="${!!isPublisherRow}" title="${isPublisherRow ? 'Remove Publisher' : 'Make Publisher'}"><i class="fas fa-upload"></i></button>
                            <button class="icon-btn danger" data-user-action="delete" data-id="${u.id}" title="Delete"><i class="fas fa-trash"></i></button>
                        </div>
                    `}
                </td>
            </tr>
        `;
    }).join('');

    tbody.querySelectorAll('button[data-user-action]').forEach(btn => {
        btn.removeEventListener('click', handleUserAction);
        btn.addEventListener('click', handleUserAction);
    });
}

async function handleUserAction(e) {
    const btn = e.currentTarget;
    const action = btn.dataset.userAction;
    const id = btn.dataset.id;
    try {
        if (action === 'ban') {
            if (!confirm('Ban this user?')) return;
            await setUserBanned(id, true);
            showToast('User banned', 'success');
        } else if (action === 'unban') {
            await setUserBanned(id, false);
            showToast('User unbanned', 'success');
        } else if (action === 'toggle-publisher') {
            const makePublisher = btn.dataset.publisher !== 'true';
            await setUserPublisher(id, makePublisher);
            showToast(makePublisher ? 'User is now a Publisher' : 'Publisher access removed', 'success');
        } else if (action === 'delete') {
            if (!confirm('Delete this user? This cannot be undone.')) return;
            await deleteUserRecord(id);
            showToast('User deleted', 'success');
        }
        await loadUsersTable();
        await loadStats();
    } catch (err) {
        showToast(translateFirebaseError(err), 'error');
    }
}

// ============ COMMENTS TABLE ============
async function loadCommentsTable() {
    const tbody = document.getElementById('commentsTable');
    if (!tbody) return;
    tbody.innerHTML = loadingRow(5);
    try {
        const comments = await listAllComments({ max: 300 });
        if (!comments.length) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:2rem;color:var(--text-muted);">No comments yet.</td></tr>`;
            return;
        }
        tbody.innerHTML = comments.map(c => `
            <tr>
                <td><strong>${escapeHtml(c.userName || 'User')}</strong></td>
                <td style="max-width:300px;">${escapeHtml(c.text || '')}</td>
                <td>${escapeHtml(c.resourceTitle || c.resourceId || '—')}</td>
                <td>${formatDate(c.createdAt)}</td>
                <td>
                    <button class="icon-btn danger" data-comment-action="delete" data-resource="${c.resourceId}" data-id="${c.id}"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `).join('');
        tbody.querySelectorAll('button[data-comment-action]').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (!confirm('Delete this comment?')) return;
                try {
                    await deleteAnyComment(btn.dataset.resource, btn.dataset.id);
                    showToast('Comment deleted', 'success');
                    await loadCommentsTable();
                } catch (err) {
                    showToast(translateFirebaseError(err), 'error');
                }
            });
        });
    } catch (err) {
        console.error(err);
        tbody.innerHTML = errorRow(5, 'Could not load comments.');
    }
}

// ============ DOWNLOADS TABLE ============
async function loadDownloadsTable() {
    const tbody = document.getElementById('downloadsTable');
    if (!tbody) return;
    tbody.innerHTML = loadingRow(3);
    try {
        const downloads = await listAllDownloads({ max: 100 });
        if (!downloads.length) {
            tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;padding:2rem;color:var(--text-muted);">No downloads yet.</td></tr>`;
            return;
        }
        tbody.innerHTML = downloads.map(d => `
            <tr>
                <td>${escapeHtml(d.userName || d.userEmail || 'User')}</td>
                <td>${escapeHtml(d.resourceId || '—')}</td>
                <td>${formatDate(d.downloadedAt)}</td>
            </tr>
        `).join('');
    } catch (err) {
        console.error(err);
        tbody.innerHTML = errorRow(3, 'Could not load downloads.');
    }
}

// ============ SETTINGS (FIXED IDs) ============
async function loadSettings() {
    try {
        const settings = await fetchSettings();
        // ✅ FIX: Use correct IDs matching HTML (setDiscord, setYoutube, etc.)
        const discordEl = document.getElementById('setDiscord');
        const youtubeEl = document.getElementById('setYoutube');
        const announcementEl = document.getElementById('setAnnouncement');
        const heroTitleEl = document.getElementById('setHeroTitle');
        const heroSubtitleEl = document.getElementById('setHeroSubtitle');
        const feedbackEl = document.getElementById('setFeedbackEnabled');
        const registrationEl = document.getElementById('setRegistrationOpen');
        const maintenanceEl = document.getElementById('setMaintenance');

        if (discordEl) discordEl.value = settings.discordUrl || '';
        if (youtubeEl) youtubeEl.value = settings.youtubeUrl || '';
        if (announcementEl) announcementEl.value = settings.announcement || '';
        if (heroTitleEl) heroTitleEl.value = settings.heroTitle || '';
        if (heroSubtitleEl) heroSubtitleEl.value = settings.heroSubtitle || '';
        if (feedbackEl) feedbackEl.checked = settings.feedbackEnabled !== false;
        if (registrationEl) registrationEl.checked = settings.registrationOpen !== false;
        if (maintenanceEl) maintenanceEl.checked = !!settings.maintenance;
    } catch (err) {
        console.warn('loadSettings error:', err);
    }
}

function bindSettingsForm() {
    const form = document.getElementById('settingsForm');
    if (!form) return;
    form.removeEventListener('submit', saveSettingsHandler);
    form.addEventListener('submit', saveSettingsHandler);
    
    async function saveSettingsHandler(e) {
        e.preventDefault();
        const submitBtn = form.querySelector('button[type=submit]');
        submitBtn.disabled = true;
        const orig = submitBtn.innerHTML;
        submitBtn.innerHTML = '<span class="spinner"></span> Saving...';
        try {
            await saveSettings({
                discordUrl: document.getElementById('setDiscord')?.value?.trim() || '',
                youtubeUrl: document.getElementById('setYoutube')?.value?.trim() || '',
                announcement: document.getElementById('setAnnouncement')?.value?.trim() || '',
                heroTitle: document.getElementById('setHeroTitle')?.value?.trim() || '',
                heroSubtitle: document.getElementById('setHeroSubtitle')?.value?.trim() || '',
                feedbackEnabled: document.getElementById('setFeedbackEnabled')?.checked || false,
                registrationOpen: document.getElementById('setRegistrationOpen')?.checked || false,
                maintenance: document.getElementById('setMaintenance')?.checked || false
            });
            showToast('Settings saved! ⚡', 'success');
        } catch (err) {
            showToast(translateFirebaseError(err), 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = orig;
        }
    }
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
