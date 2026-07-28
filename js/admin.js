// admin.js (Complete – All Functions Defined + Installations Tab)
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

// ============ DOM REFS ============
const accessDenied = document.getElementById('accessDenied');
const loginRequired = document.getElementById('loginRequired');
const adminContent = document.getElementById('adminContent');

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
    bindInstallationsFilters();

    await Promise.all([
        loadStats(),
        loadResourcesTable(),
        loadFeedbackTable(),
        loadUsersTable(),
        loadCommentsTable(),
        loadDownloadsTable(),
        loadSettings(),
        loadDashboardLists(),
        loadInstallations()   // ✅ new
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
    settings: 'Site Settings',
    installations: 'Installations'   // ✅ new
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

// ============ UPLOAD FORM ============
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

async function submitForm(e) {
    e.preventDefault();
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
        showToast('Please provide a file URL', 'warning');
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
            payload.filePath = '';
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
    document.querySelector('.admin-nav-item[data-tab="upload"]')?.click();
}

function resetForm() {
    editingId = null;
    document.getElementById('uploadForm')?.reset();
    document.getElementById('resourceId').value = '';
    document.getElementById('formTitle').innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Upload New Resource';
    document.getElementById('externalFileUrl').value = '';
    document.getElementById('submitResourceBtn').innerHTML = '<i class="fas fa-upload"></i> Upload Resource';
    document.getElementById('uploadProgress')?.classList.add('hidden');
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
        const isAdminRow = u.isAdmin || (u.email || '').toLowerCase() === ownerEmail;
        const initial = (u.displayName || u.email || '?').charAt(0).toUpperCase();
        let roleBadge;
        if (isOwnerRow) roleBadge = '<span class="status-badge status-owner"><i class="fas fa-crown"></i> Owner</span>';
        else if (isAdminRow) roleBadge = '<span class="status-badge status-admin">Admin</span>';
        else roleBadge = '<span class="status-badge">User</span>';
        const statusBadge = u.banned ? '<span class="status-badge status-banned">Banned</span>' : '<span class="status-badge status-active">Active</span>';
        return `
            <tr>
                <td><div style="display:flex;align-items:center;gap:0.6rem;"><div class="feedback-user-avatar" style="width:34px;height:34px;font-size:0.9rem;">${escapeHtml(initial)}</div><strong>${escapeHtml(u.displayName || 'User')}</strong></div></td>
                <td>${escapeHtml(u.email || '—')}</td>
                <td>${roleBadge}</td>
                <td>${statusBadge}</td>
                <td>${formatDate(u.createdAt)}</td>
                <td>
                    ${isOwnerRow ? '<span style="color:var(--text-dim);font-size:0.85rem;">Cannot modify owner</span>' : `
                        <div class="action-btns">
                            <button class="icon-btn" data-user-action="${u.banned ? 'unban' : 'ban'}" data-id="${u.id}"><i class="fas fa-${u.banned ? 'unlock' : 'ban'}"></i></button>
                            <button class="icon-btn danger" data-user-action="delete" data-id="${u.id}"><i class="fas fa-trash"></i></button>
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
        } else if (action === 'delete') {
            if (!confirm('Delete this user record?')) return;
            await deleteUserRecord(id);
            showToast('User record deleted', 'success');
        }
        await loadUsersTable();
        await loadStats();
    } catch (err) {
        showToast(translateFirebaseError(err), 'error');
    }
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
        tbody.innerHTML = errorRow(5, 'Could not load comments.');
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
            <td style="max-width:350px;"><div style="white-space:normal;word-break:break-word;color:var(--text-muted);">${escapeHtml(c.text || '')}</div></td>
            <td><a href="resource-detail.html?id=${encodeURIComponent(c.resourceId)}" style="color:var(--primary);font-size:0.85rem;"><i class="fas fa-external-link-alt"></i> View</a></td>
            <td>${formatDate(c.createdAt)}</td>
            <td><button class="icon-btn danger" data-comment-action="delete" data-rid="${c.resourceId}" data-cid="${c.id}"><i class="fas fa-trash"></i></button></td>
        </tr>
    `).join('');

    tbody.querySelectorAll('button[data-comment-action]').forEach(btn => {
        btn.removeEventListener('click', handleCommentAction);
        btn.addEventListener('click', handleCommentAction);
    });
}

async function handleCommentAction(e) {
    const btn = e.currentTarget;
    if (!confirm('Delete this comment?')) return;
    try {
        await deleteAnyComment(btn.dataset.rid, btn.dataset.cid);
        showToast('Comment deleted', 'success');
        await loadCommentsTable();
    } catch (err) {
        showToast(translateFirebaseError(err), 'error');
    }
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
                    <td>${res ? `<a href="resource-detail.html?id=${encodeURIComponent(d.resourceId)}" style="color:var(--primary);">${escapeHtml(resLabel)}</a>` : escapeHtml(resLabel)}</td>
                    <td>${formatDate(d.downloadedAt)}</td>
                </tr>
            `;
        }).join('');
    } catch (err) {
        console.error(err);
        tbody.innerHTML = errorRow(3, 'Could not load downloads.');
    }
}

// ============ SETTINGS ============
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
                discordUrl: document.getElementById('setDiscord').value.trim(),
                youtubeUrl: document.getElementById('setYoutube').value.trim(),
                announcement: document.getElementById('setAnnouncement').value.trim(),
                heroTitle: document.getElementById('setHeroTitle').value.trim(),
                heroSubtitle: document.getElementById('setHeroSubtitle').value.trim(),
                feedbackEnabled: document.getElementById('setFeedbackEnabled').checked,
                registrationOpen: document.getElementById('setRegistrationOpen').checked,
                maintenance: document.getElementById('setMaintenance').checked
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

// ============ INSTALLATIONS TRACKING ============
let installPage = 0;
let installTotal = 0;
const INSTALL_LIMIT = 20;

async function loadInstallations() {
    const tbody = document.getElementById('installationsTable');
    const countEl = document.getElementById('installCount');
    const pageInfo = document.getElementById('installPageInfo');
    if (!tbody) return;

    tbody.innerHTML = loadingRow(9);

    try {
        const plugin = document.getElementById('installPluginFilter')?.value || '';
        const status = document.getElementById('installStatusFilter')?.value || '';
        const search = document.getElementById('installSearch')?.value.trim() || '';

        let url = `/api/installations?limit=${INSTALL_LIMIT}&offset=${installPage * INSTALL_LIMIT}`;
        if (plugin) url += `&plugin=${encodeURIComponent(plugin)}`;
        if (status) url += `&status=${encodeURIComponent(status)}`;
        if (search) url += `&installationId=${encodeURIComponent(search)}`;

        const res = await fetch(url, {
            headers: { 'Authorization': `Bearer ${authState.user?.uid}` }
        });
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || 'Failed to load installations');

        installTotal = data.total || data.data.length || 0;

        if (!data.data || !data.data.length) {
            tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:2rem;color:var(--text-muted);">No installations found.</td></tr>`;
            countEl.textContent = '0 installations';
            pageInfo.textContent = 'Page 1';
            return;
        }

        tbody.innerHTML = data.data.map(install => {
            const statusBadge = install.status === 'ONLINE'
                ? '<span class="status-badge status-active">Online</span>'
                : '<span class="status-badge status-banned">Offline</span>';
            return `
                <tr>
                    <td><strong>${escapeHtml(install.plugin)}</strong></td>
                    <td><code>${escapeHtml(install.licenseId)}</code></td>
                    <td><code style="font-size:0.75rem;">${escapeHtml(install.installationId)}</code></td>
                    <td>${escapeHtml(install.pluginVersion)}</td>
                    <td>${escapeHtml(install.mcVersion)}</td>
                    <td>${formatDate(install.firstSeen)}</td>
                    <td>${formatDate(install.lastSeen)}</td>
                    <td>${statusBadge}</td>
                    <td>${install.verificationCount || 0}</td>
                </tr>
            `;
        }).join('');

        countEl.textContent = `${installTotal} installations`;
        const totalPages = Math.ceil(installTotal / INSTALL_LIMIT) || 1;
        pageInfo.textContent = `Page ${installPage + 1} of ${totalPages}`;

    } catch (err) {
        console.error(err);
        tbody.innerHTML = errorRow(9, err.message || 'Error loading installations');
    }
}

function bindInstallationsFilters() {
    const pluginFilter = document.getElementById('installPluginFilter');
    const statusFilter = document.getElementById('installStatusFilter');
    const searchInput = document.getElementById('installSearch');
    const refreshBtn = document.getElementById('refreshInstallations');
    const prevBtn = document.getElementById('prevInstallPage');
    const nextBtn = document.getElementById('nextInstallPage');

    if (pluginFilter) pluginFilter.addEventListener('change', () => { installPage = 0; loadInstallations(); });
    if (statusFilter) statusFilter.addEventListener('change', () => { installPage = 0; loadInstallations(); });
    if (searchInput) searchInput.addEventListener('input', debounce(() => { installPage = 0; loadInstallations(); }, 300));
    if (refreshBtn) refreshBtn.addEventListener('click', () => { installPage = 0; loadInstallations(); });
    if (prevBtn) prevBtn.addEventListener('click', () => {
        if (installPage > 0) { installPage--; loadInstallations(); }
    });
    if (nextBtn) nextBtn.addEventListener('click', () => {
        const totalPages = Math.ceil(installTotal / INSTALL_LIMIT);
        if (installPage < totalPages - 1) { installPage++; loadInstallations(); }
    });
}

function debounce(fn, delay) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
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
