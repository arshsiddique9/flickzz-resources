// Leaderboard page logic — top downloaders, raters, likers, commenters
import { getTopDownloaders, getTopRaters, getTopLikers, getTopCommenters } from "./leaderboard-api.js";
import { OWNER_EMAIL } from "./firebase-config.js";

const panel = document.getElementById('lbPanel');
const tabs = document.querySelectorAll('.lb-tab');

const LABELS = {
    downloaders: { metric: 'downloads', icon: 'fa-download', title: 'Top Downloaders' },
    raters:      { metric: 'ratings',   icon: 'fa-star',     title: 'Top Raters' },
    likers:      { metric: 'likes',     icon: 'fa-heart',    title: 'Top Likers' },
    commenters:  { metric: 'comments',  icon: 'fa-comments', title: 'Top Commenters' }
};

// Cache so switching tabs is instant after first load
const cache = {};

async function load(tab) {
    panel.innerHTML = '<div class="skeleton-card" style="height: 300px;"></div>';

    let data = cache[tab];
    if (!data) {
        try {
            if (tab === 'downloaders') data = await getTopDownloaders(20);
            else if (tab === 'raters') data = await getTopRaters(20);
            else if (tab === 'likers') data = await getTopLikers(20);
            else if (tab === 'commenters') data = await getTopCommenters(20);
            cache[tab] = data;
        } catch (err) {
            console.error(err);
            data = [];
        }
    }

    render(tab, data || []);
}

function render(tab, data) {
    const meta = LABELS[tab];
    if (!data.length) {
        panel.innerHTML = `
            <div class="empty-state">
                <i class="fas ${meta.icon}"></i>
                <h3>No data yet</h3>
                <p>Once members start interacting, the leaderboard will populate here.</p>
            </div>
        `;
        return;
    }

    const rows = data.map((entry, i) => {
        const rank = i + 1;
        const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;
        const isOwnerRow = entry.userEmail && OWNER_EMAIL &&
            entry.userEmail.toLowerCase().trim() === OWNER_EMAIL.toLowerCase().trim();
        const ownerBadge = isOwnerRow
            ? '<span class="owner-badge"><i class="fas fa-crown"></i> Owner</span>'
            : '';
        return `
            <div class="lb-row ${rank <= 3 ? 'lb-top' : ''} ${isOwnerRow ? 'lb-owner' : ''}">
                <div class="lb-rank">${medal}</div>
                <div class="lb-user">
                    <i class="fas fa-user-circle"></i>
                    <span>${escapeHtml(entry.userName || 'User')}</span>
                    ${ownerBadge}
                </div>
                <div class="lb-count">
                    <strong>${entry.count}</strong>
                    <span>${meta.metric}</span>
                </div>
            </div>
        `;
    }).join('');

    panel.innerHTML = `
        <div class="lb-header">
            <h3><i class="fas ${meta.icon}"></i> ${meta.title}</h3>
            <span class="lb-subtitle">Top ${data.length} members</span>
        </div>
        <div class="lb-list">${rows}</div>
    `;
}

tabs.forEach(t => {
    t.addEventListener('click', () => {
        tabs.forEach(x => x.classList.remove('active'));
        t.classList.add('active');
        load(t.dataset.tab);
    });
});

// Initial load
load('downloaders');

function escapeHtml(s) {
    if (!s) return '';
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
