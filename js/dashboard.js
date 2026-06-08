// Dashboard - user overview and recent downloads
import { requireAuth, authState } from "./auth.js";
import { getUserDownloads, getResource, CATEGORY_META, avgRating, formatNumber } from "./resources-api.js";

(async function init() {
    await requireAuth();
    const nameEl = document.getElementById('dashUserName');
    if (nameEl && authState.user) {
        nameEl.textContent = authState.user.displayName || authState.user.email.split('@')[0];
    }
    loadDownloads();
})();

async function loadDownloads() {
    const grid = document.getElementById('myDownloadsGrid');
    const empty = document.getElementById('emptyDownloads');
    const countEl = document.getElementById('userDownloadsCount');

    try {
        const downloads = await getUserDownloads(authState.user.uid);
        if (countEl) countEl.textContent = formatNumber(downloads.length);

        // Get unique resource IDs (most recent first)
        const uniqueIds = [...new Set(downloads.map(d => d.resourceId))].slice(0, 12);

        if (!uniqueIds.length) {
            grid.innerHTML = '';
            empty.classList.remove('hidden');
            return;
        }

        const resources = (await Promise.all(uniqueIds.map(id => getResource(id)))).filter(Boolean);

        if (!resources.length) {
            grid.innerHTML = '';
            empty.classList.remove('hidden');
            return;
        }

        grid.innerHTML = resources.map(renderCard).join('');
    } catch (err) {
        console.error(err);
        grid.innerHTML = '<p style="color:var(--text-muted);grid-column:1/-1;text-align:center;">Could not load your downloads.</p>';
    }
}

function renderCard(r) {
    const cat = CATEGORY_META[r.category] || { label: r.category, icon: 'fa-box' };
    const rating = avgRating(r).toFixed(1);
    const thumb = r.thumbnail
        ? `<img src="${escapeHtml(r.thumbnail)}" alt="${escapeHtml(r.title)}" loading="lazy">`
        : `<i class="fas ${cat.icon}"></i>`;
    return `
        <a href="resource-detail.html?id=${encodeURIComponent(r.id)}" class="resource-card">
            <div class="resource-thumb">
                ${thumb}
                <span class="resource-badge">${escapeHtml(cat.label)}</span>
            </div>
            <div class="resource-body">
                <h3 class="resource-title">${escapeHtml(r.title)}</h3>
                <p class="resource-desc">${escapeHtml(r.tagline || r.description || '')}</p>
                <div class="resource-meta">
                    <span class="resource-meta-item"><i class="fas fa-download"></i> ${formatNumber(r.downloads || 0)}</span>
                    <span class="resource-meta-item resource-rating"><i class="fas fa-star"></i> ${rating}</span>
                </div>
            </div>
        </a>
    `;
}

function escapeHtml(s) {
    if (!s) return '';
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
