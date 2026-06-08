// Home page - featured resources + REAL live counters
import { listResources, getLiveStats, CATEGORY_META, avgRating, formatNumber } from "./resources-api.js";

// ============ LIVE STATS COUNTERS ============
// Fetches REAL numbers from Firestore (resources count, total downloads sum, users count)
// then animates from 0 → real value.
async function loadAndAnimateStats() {
    const elements = document.querySelectorAll('.stat-num[data-key]');
    if (!elements.length) return;

    // Initial: show 0
    elements.forEach(el => { el.textContent = '0'; });

    try {
        const stats = await getLiveStats();
        // Trigger animation on intersection
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    elements.forEach(el => {
                        const key = el.dataset.key;
                        const target = stats[key] || 0;
                        animateCount(el, 0, target, 1500);
                    });
                    observer.disconnect();
                }
            });
        }, { threshold: 0.1 });

        // Observe the first one (they animate together)
        observer.observe(elements[0]);

        // Refresh stats every 60 seconds (cheap polling; can be replaced with onSnapshot later)
        setInterval(async () => {
            try {
                const fresh = await getLiveStats();
                elements.forEach(el => {
                    const key = el.dataset.key;
                    const target = fresh[key] || 0;
                    el.textContent = formatNumber(target);
                });
            } catch {}
        }, 60_000);
    } catch (err) {
        console.warn('Stats load error:', err);
    }
}

function animateCount(el, from, to, duration) {
    const start = performance.now();
    function step(now) {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const val = Math.floor(from + (to - from) * eased);
        el.textContent = formatNumber(val);
        if (progress < 1) requestAnimationFrame(step);
        else el.textContent = formatNumber(to);
    }
    requestAnimationFrame(step);
}

// ============ LOAD FEATURED ============
async function loadFeatured() {
    const grid = document.getElementById('featuredGrid');
    if (!grid) return;
    try {
        let items = await listResources({ featuredOnly: true, max: 6 });
        if (!items.length) {
            items = await listResources({ sort: 'popular', max: 6 });
        }
        if (!items.length) {
            grid.innerHTML = '<p style="color:var(--text-muted); grid-column:1/-1; text-align:center;">No resources yet. Check back soon!</p>';
            return;
        }
        grid.innerHTML = items.map(renderCard).join('');
    } catch (err) {
        console.error(err);
        grid.innerHTML = '<p style="color:var(--text-muted); grid-column:1/-1; text-align:center;">Could not load resources.</p>';
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
                ${r.featured ? '<span class="resource-featured"><i class="fas fa-star"></i> Featured</span>' : ''}
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

// Init
document.addEventListener('DOMContentLoaded', () => {
    loadAndAnimateStats();
    loadFeatured();
});
