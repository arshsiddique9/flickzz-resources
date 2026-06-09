// Resources listing page
import { listResources, CATEGORY_META, avgRating, formatNumber } from "./resources-api.js";

const grid = document.getElementById('resourceGrid');
const empty = document.getElementById('emptyState');
const searchInput = document.getElementById('searchInput');
const categoryFilter = document.getElementById('categoryFilter');
const sortFilter = document.getElementById('sortFilter');

// Preselect category from URL param
const params = new URLSearchParams(window.location.search);
const urlCategory = params.get('category');
if (urlCategory && categoryFilter) {
    categoryFilter.value = urlCategory;
}
const urlSearch = params.get('q');
if (urlSearch && searchInput) searchInput.value = urlSearch;

let debounceTimer;

function debounce(fn, delay = 300) {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(fn, delay);
}

// ✅ FIXED: No more empty boxes glitch
async function refresh() {
    if (!grid) return;

    // Only add loading class – DO NOT clear the grid content yet
    grid.classList.add('loading');

    try {
        const items = await listResources({
            category: categoryFilter.value,
            sort: sortFilter.value,
            search: searchInput.value.trim()
        });

        // Now replace the content after data is ready
        if (!items.length) {
            grid.innerHTML = '';
            empty.classList.remove('hidden');
        } else {
            empty.classList.add('hidden');
            grid.innerHTML = items.map(renderCard).join('');
        }
    } catch (err) {
        console.error(err);
        grid.innerHTML = '<p style="color:var(--text-muted);grid-column:1/-1;text-align:center;">Could not load resources.</p>';
    } finally {
        // Small delay to ensure smooth transition
        setTimeout(() => {
            grid.classList.remove('loading');
        }, 50);
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

searchInput.addEventListener('input', () => debounce(refresh, 300));
categoryFilter.addEventListener('change', refresh);
sortFilter.addEventListener('change', refresh);

// Initial load
refresh();
