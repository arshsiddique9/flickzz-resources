// Leaderboard — Premium design with custom SVG medals, no emojis
import { getTopDownloaders, getTopRaters, getTopLikers, getTopCommenters } from "./leaderboard-api.js";
import { OWNER_EMAIL } from "./firebase-config.js";

const panel = document.getElementById('lbPanel');
const tabs = document.querySelectorAll('.lb-tab-premium');

const LABELS = {
    downloaders: { metric: 'downloads', icon: 'fa-download', title: 'Top Downloaders' },
    raters:      { metric: 'ratings',   icon: 'fa-star',     title: 'Top Raters' },
    likers:      { metric: 'likes',     icon: 'fa-heart',    title: 'Top Likers' },
    commenters:  { metric: 'comments',  icon: 'fa-comments', title: 'Top Commenters' }
};

const cache = {};

async function load(tab) {
    panel.innerHTML = '<div class="skeleton-card" style="height: 400px; border-radius: 20px;"></div>';

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

function getMedalSVG(rank) {
    const colors = {
        1: { bg: 'linear-gradient(135deg, #FFD700, #FFA500)', text: '#000', glow: 'rgba(255,215,0,0.4)' },
        2: { bg: 'linear-gradient(135deg, #C0C0C0, #A0A0A0)', text: '#000', glow: 'rgba(192,192,192,0.4)' },
        3: { bg: 'linear-gradient(135deg, #CD7F32, #8B4513)', text: '#fff', glow: 'rgba(205,127,50,0.4)' }
    };
    const c = colors[rank] || { bg: 'var(--bg-card)', text: 'var(--text-muted)', glow: 'transparent' };
    
    return `
        <div class="lb-medal" style="background: ${c.bg}; color: ${c.text}; box-shadow: 0 4px 20px ${c.glow};">
            <span class="lb-medal-num">${rank}</span>
        </div>
    `;
}

function render(tab, data) {
    const meta = LABELS[tab];
    if (!data.length) {
        panel.innerHTML = `
            <div class="lb-empty">
                <div class="lb-empty-icon"><i class="fas ${meta.icon}"></i></div>
                <h3>No data yet</h3>
                <p>Once members start interacting, the leaderboard will populate here.</p>
            </div>
        `;
        return;
    }

    const rows = data.map((entry, i) => {
        const rank = i + 1;
        const isOwnerRow = entry.userEmail && OWNER_EMAIL &&
            entry.userEmail.toLowerCase().trim() === OWNER_EMAIL.toLowerCase().trim();
        const ownerBadge = isOwnerRow
            ? '<span class="lb-owner-badge"><i class="fas fa-crown"></i> Owner</span>'
            : '';
        
        return `
            <div class="lb-row-premium ${rank <= 3 ? 'lb-top-premium' : ''}">
                <div class="lb-rank-premium">${getMedalSVG(rank)}</div>
                <div class="lb-user-premium">
                    <div class="lb-avatar">
                        <i class="fas fa-user"></i>
                    </div>
                    <div class="lb-user-info">
                        <span class="lb-username">${escapeHtml(entry.userName || 'User')}</span>
                        ${ownerBadge}
                    </div>
                </div>
                <div class="lb-count-premium">
                    <span class="lb-count-num">${entry.count}</span>
                    <span class="lb-count-label">${meta.metric}</span>
                </div>
            </div>
        `;
    }).join('');

    panel.innerHTML = `
        <div class="lb-header-premium">
            <div class="lb-header-left">
                <i class="fas ${meta.icon}"></i>
                <h3>${meta.title}</h3>
            </div>
            <span class="lb-count-badge">Top ${data.length}</span>
        </div>
        <div class="lb-list-premium">${rows}</div>
    `;
}

tabs.forEach(t => {
    t.addEventListener('click', () => {
        tabs.forEach(x => x.classList.remove('active'));
        t.classList.add('active');
        load(t.dataset.tab);
    });
});

load('downloaders');

function escapeHtml(s) {
    if (!s) return '';
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
