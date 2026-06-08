// Resource detail page: info, download, likes, rating, threaded comments
import {
    getResource, recordDownload, submitRating, getUserRating,
    getComments, addComment, deleteComment, avgRating,
    formatNumber, formatFileSize, formatDate, CATEGORY_META
} from "./resources-api.js";
import { toggleLike, hasLiked, getLikeCount } from "./likes-api.js";
import { authState, onAuthReady } from "./auth.js";
import { isOwner, OWNER_EMAIL } from "./firebase-config.js";
import { showToast } from "./main.js";

const params = new URLSearchParams(window.location.search);
const resourceId = params.get('id');
const detailEl = document.getElementById('resourceDetail');
const likesCard = document.getElementById('likesCard');
const ratingCard = document.getElementById('ratingCard');
const commentsCard = document.getElementById('commentsCard');

let currentResource = null;
let userLiked = false;

if (!resourceId) {
    detailEl.innerHTML = '<div class="empty-state"><i class="fas fa-question-circle"></i><h3>Resource not found</h3><a href="resources.html" class="btn btn-primary">Back to Resources</a></div>';
} else {
    loadDetail();
}

async function loadDetail() {
    try {
        const r = await getResource(resourceId);
        if (!r) {
            detailEl.innerHTML = '<div class="empty-state"><i class="fas fa-question-circle"></i><h3>Resource not found</h3><a href="resources.html" class="btn btn-primary">Back to Resources</a></div>';
            return;
        }
        currentResource = r;
        renderDetail(r);
        likesCard.classList.remove('hidden');
        ratingCard.classList.remove('hidden');
        commentsCard.classList.remove('hidden');
        initLikes(r);
        initRating(r);
        loadComments();
        document.title = `${r.title} — FlickZZ Resources`;
    } catch (err) {
        console.error(err);
        detailEl.innerHTML = '<p style="color:var(--text-muted);text-align:center;">Could not load resource.</p>';
    }
}

function renderDetail(r) {
    const cat = CATEGORY_META[r.category] || { label: r.category, icon: 'fa-box' };
    const rating = avgRating(r).toFixed(1);
    const thumb = r.thumbnail
        ? `<img src="${escapeHtml(r.thumbnail)}" alt="${escapeHtml(r.title)}">`
        : `<i class="fas ${cat.icon}"></i>`;

    detailEl.innerHTML = `
        <div class="detail-header">
            <div class="detail-thumb">${thumb}</div>
            <div class="detail-info">
                <div style="display:flex; gap:0.5rem; flex-wrap:wrap; margin-bottom:0.75rem;">
                    <span class="table-badge">${escapeHtml(cat.label)}</span>
                    ${r.featured ? '<span class="table-badge" style="background:rgba(245,158,11,0.15);color:var(--warning);"><i class="fas fa-star"></i> Featured</span>' : ''}
                </div>
                <h1>${escapeHtml(r.title)}</h1>
                ${r.tagline ? `<p class="detail-tagline">${escapeHtml(r.tagline)}</p>` : ''}
                <div class="detail-meta">
                    <span class="detail-meta-item"><i class="fas fa-download"></i> ${formatNumber(r.downloads || 0)} downloads</span>
                    <span class="detail-meta-item resource-rating"><i class="fas fa-star"></i> ${rating} (${r.ratingCount || 0})</span>
                    ${r.version ? `<span class="detail-meta-item"><i class="fas fa-tag"></i> v${escapeHtml(r.version)}</span>` : ''}
                    ${r.mcVersion ? `<span class="detail-meta-item"><i class="fas fa-cube"></i> MC ${escapeHtml(r.mcVersion)}</span>` : ''}
                    ${r.fileSize ? `<span class="detail-meta-item"><i class="fas fa-file"></i> ${formatFileSize(r.fileSize)}</span>` : ''}
                </div>
                <div class="detail-actions">
                    <button class="btn btn-primary btn-lg" id="downloadBtn">
                        <i class="fas fa-download"></i> Download
                    </button>
                </div>
                <p style="margin-top:0.75rem; color:var(--text-dim); font-size:0.85rem;">
                    <i class="fas fa-info-circle"></i> You must be logged in to download.
                </p>
            </div>
        </div>
        <div class="detail-description">${escapeHtml(r.description || '').replace(/\n/g, '<br>')}</div>
    `;

    document.getElementById('downloadBtn').addEventListener('click', handleDownload);
}

async function handleDownload() {
    await new Promise(resolve => onAuthReady(resolve));
    if (!authState.user) {
        showToast('Please log in to download', 'warning');
        sessionStorage.setItem('redirectAfterLogin', window.location.pathname + window.location.search);
        setTimeout(() => { window.location.href = 'login.html'; }, 800);
        return;
    }
    if (!currentResource.fileUrl) {
        showToast('Download link not available yet.', 'warning');
        return;
    }
    try {
        await recordDownload(currentResource.id, authState.user.uid, {
            userName: authState.user.displayName || (authState.user.email ? authState.user.email.split('@')[0] : 'User'),
            userEmail: authState.user.email || ''
        });
        showToast('Download starting...', 'success');
        const a = document.createElement('a');
        a.href = currentResource.fileUrl;
        a.download = currentResource.fileName || currentResource.title;
        a.target = '_blank';
        a.rel = 'noopener';
        document.body.appendChild(a);
        a.click();
        a.remove();
    } catch (err) {
        console.error(err);
        showToast('Could not start download', 'error');
    }
}

// ============ LIKES ============
async function initLikes(r) {
    const likeBtn = document.getElementById('likeBtn');
    const likeIcon = document.getElementById('likeIcon');
    const likeLabel = document.getElementById('likeLabel');
    const likeCountEl = document.getElementById('likeCount');

    async function refreshCount() {
        try {
            const c = await getLikeCount(r.id);
            likeCountEl.textContent = c;
        } catch {}
    }

    await refreshCount();

    onAuthReady(async (state) => {
        if (state.user) {
            userLiked = await hasLiked(r.id, state.user.uid);
            paintLike();
        } else {
            userLiked = false;
            paintLike();
        }
    });

    function paintLike() {
        if (userLiked) {
            likeIcon.className = 'fas fa-heart';
            likeBtn.classList.add('liked');
            likeLabel.textContent = 'Liked';
        } else {
            likeIcon.className = 'far fa-heart';
            likeBtn.classList.remove('liked');
            likeLabel.textContent = 'Like';
        }
    }

    likeBtn.addEventListener('click', async () => {
        if (!authState.user) {
            showToast('Please log in to like', 'warning');
            return;
        }
        try {
            userLiked = await toggleLike(r.id, authState.user);
            paintLike();
            await refreshCount();
            showToast(userLiked ? 'Liked ❤️' : 'Unliked', 'success');
        } catch (err) {
            console.error(err);
            showToast('Could not update like', 'error');
        }
    });
}

// ============ RATING ============
function initRating(r) {
    document.getElementById('avgRating').textContent = avgRating(r).toFixed(1);
    document.getElementById('ratingCount').textContent = r.ratingCount || 0;

    const stars = document.querySelectorAll('#ratingInput i');
    let userRating = 0;

    onAuthReady(async (state) => {
        if (state.user) {
            userRating = await getUserRating(r.id, state.user.uid) || 0;
            paintStars(userRating);
        }
    });

    stars.forEach(star => {
        star.addEventListener('mouseenter', () => paintStars(+star.dataset.value));
        star.addEventListener('mouseleave', () => paintStars(userRating));
        star.addEventListener('click', async () => {
            if (!authState.user) {
                showToast('Please log in to rate', 'warning');
                return;
            }
            const value = +star.dataset.value;
            try {
                await submitRating(r.id, authState.user.uid, value, {
                    userName: authState.user.displayName || authState.user.email.split('@')[0],
                    userEmail: authState.user.email || ''
                });
                userRating = value;
                paintStars(value);
                showToast('Thanks for rating! ⭐', 'success');
                const updated = await getResource(r.id);
                if (updated) {
                    currentResource = updated;
                    document.getElementById('avgRating').textContent = avgRating(updated).toFixed(1);
                    document.getElementById('ratingCount').textContent = updated.ratingCount || 0;
                }
            } catch (err) {
                console.error(err);
                showToast('Could not submit rating', 'error');
            }
        });
    });

    function paintStars(value) {
        stars.forEach(s => {
            s.classList.toggle('active', +s.dataset.value <= value);
        });
    }
}

// ============ COMMENTS (THREADED) ============
function isOwnerComment(c) {
    if (!c) return false;
    if (c.isOwner === true) return true;
    if (c.userEmail && OWNER_EMAIL && c.userEmail.toLowerCase().trim() === OWNER_EMAIL.toLowerCase().trim()) return true;
    return false;
}

function commentTemplate(c, depth = 0) {
    const canDelete = authState.user && (authState.user.uid === c.userId || authState.isAdmin);
    const ownerBadge = isOwnerComment(c)
        ? '<span class="owner-badge" title="Verified Owner"><i class="fas fa-crown"></i> Owner</span>'
        : '';
    const itemClass = `comment-item${isOwnerComment(c) ? ' owner-comment' : ''}${depth > 0 ? ' comment-reply' : ''}`;
    const canReply = !!authState.user;
    return `
        <div class="${itemClass}" data-id="${c.id}">
            <div class="comment-head">
                <span class="comment-author"><i class="fas fa-user-circle"></i> ${escapeHtml(c.userName || 'User')} ${ownerBadge}</span>
                <span>
                    <span class="comment-date">${formatDate(c.createdAt)}</span>
                    ${canDelete ? `<button class="comment-delete" data-id="${c.id}" title="Delete"><i class="fas fa-trash"></i></button>` : ''}
                </span>
            </div>
            <div class="comment-body">${escapeHtml(c.text || '').replace(/\n/g, '<br>')}</div>
            <div class="comment-actions">
                ${canReply ? `<button class="comment-reply-btn" data-id="${c.id}"><i class="fas fa-reply"></i> Reply</button>` : ''}
            </div>
            <div class="reply-form-slot" data-parent="${c.id}"></div>
            <div class="reply-children" data-children="${c.id}"></div>
        </div>
    `;
}

async function loadComments() {
    const list = document.getElementById('commentsList');
    try {
        const comments = await getComments(resourceId);
        if (!comments.length) {
            list.innerHTML = '<p style="color:var(--text-muted); text-align:center; padding:1rem 0;">No comments yet. Be the first!</p>';
            return;
        }

        // Build tree: top-level (no parentId) + replies grouped by parentId
        const topLevel = comments.filter(c => !c.parentId);
        const repliesByParent = {};
        comments.filter(c => c.parentId).forEach(c => {
            if (!repliesByParent[c.parentId]) repliesByParent[c.parentId] = [];
            repliesByParent[c.parentId].push(c);
        });
        // Replies should be ascending (oldest first under each thread)
        Object.values(repliesByParent).forEach(arr => arr.sort((a, b) => {
            const at = a.createdAt?.seconds || 0;
            const bt = b.createdAt?.seconds || 0;
            return at - bt;
        }));

        list.innerHTML = topLevel.map(c => commentTemplate(c, 0)).join('');

        // Inject replies
        topLevel.forEach(c => {
            const slot = list.querySelector(`[data-children="${c.id}"]`);
            const reps = repliesByParent[c.id] || [];
            if (slot && reps.length) {
                slot.innerHTML = reps.map(r => commentTemplate(r, 1)).join('');
            }
        });

        // Bind delete
        list.querySelectorAll('.comment-delete').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                if (!confirm('Delete this comment?')) return;
                try {
                    await deleteComment(resourceId, btn.dataset.id);
                    showToast('Comment deleted', 'success');
                    loadComments();
                } catch (err) {
                    showToast('Could not delete comment', 'error');
                }
            });
        });

        // Bind reply
        list.querySelectorAll('.comment-reply-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const parentId = btn.dataset.id;
                openReplyForm(parentId);
            });
        });
    } catch (err) {
        console.error(err);
        list.innerHTML = '<p style="color:var(--text-muted);">Could not load comments.</p>';
    }
}

function openReplyForm(parentId) {
    const slot = document.querySelector(`.reply-form-slot[data-parent="${parentId}"]`);
    if (!slot) return;
    if (slot.querySelector('textarea')) {
        slot.innerHTML = ''; // toggle off
        return;
    }
    slot.innerHTML = `
        <div class="reply-form">
            <textarea rows="2" placeholder="Write a reply..."></textarea>
            <div style="display:flex; gap:0.5rem; margin-top:0.5rem;">
                <button class="btn btn-primary btn-sm reply-submit"><i class="fas fa-paper-plane"></i> Post Reply</button>
                <button class="btn btn-ghost btn-sm reply-cancel">Cancel</button>
            </div>
        </div>
    `;
    const ta = slot.querySelector('textarea');
    ta.focus();
    slot.querySelector('.reply-cancel').addEventListener('click', () => { slot.innerHTML = ''; });
    slot.querySelector('.reply-submit').addEventListener('click', async () => {
        const text = ta.value.trim();
        if (!text) { showToast('Write something first', 'warning'); return; }
        if (!authState.user) { showToast('Please log in', 'warning'); return; }
        try {
            await addComment(resourceId, {
                userId: authState.user.uid,
                userName: authState.user.displayName || authState.user.email.split('@')[0],
                userEmail: authState.user.email || '',
                text,
                parentId
            });
            slot.innerHTML = '';
            showToast('Reply posted!', 'success');
            loadComments();
        } catch (err) {
            console.error(err);
            showToast('Could not post reply', 'error');
        }
    });
}

const postBtn = document.getElementById('postCommentBtn');
if (postBtn) {
    postBtn.addEventListener('click', async () => {
        const input = document.getElementById('commentInput');
        const text = input.value.trim();
        if (!text) { showToast('Please write something first', 'warning'); return; }
        if (!authState.user) { showToast('Please log in first', 'warning'); return; }
        try {
            await addComment(resourceId, {
                userId: authState.user.uid,
                userName: authState.user.displayName || authState.user.email.split('@')[0],
                userEmail: authState.user.email || '',
                text,
                parentId: null
            });
            input.value = '';
            showToast('Comment posted!', 'success');
            loadComments();
        } catch (err) {
            console.error(err);
            showToast('Could not post comment', 'error');
        }
    });
}

function escapeHtml(s) {
    if (!s) return '';
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
