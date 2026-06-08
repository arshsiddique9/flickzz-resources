// Home page feedback module
import { listFeedback, submitFeedback } from "./feedback-api.js";
import { authState, onAuthReady } from "./auth.js";
import { showToast, translateFirebaseError } from "./main.js";

const listEl = document.getElementById('feedbackList');
const starsEl = document.getElementById('feedbackStars');
const textEl = document.getElementById('feedbackText');
const submitBtn = document.getElementById('submitFeedbackBtn');
const charCount = document.getElementById('feedbackCharCount');

let selectedRating = 0;

// ============ RATING STARS ============
if (starsEl) {
    const stars = starsEl.querySelectorAll('i');
    stars.forEach(star => {
        star.addEventListener('mouseenter', () => paintStars(+star.dataset.value));
        star.addEventListener('mouseleave', () => paintStars(selectedRating));
        star.addEventListener('click', () => {
            selectedRating = +star.dataset.value;
            paintStars(selectedRating);
        });
    });
    function paintStars(value) {
        stars.forEach(s => s.classList.toggle('active', +s.dataset.value <= value));
    }
}

// ============ CHAR COUNTER ============
if (textEl && charCount) {
    textEl.addEventListener('input', () => {
        charCount.textContent = textEl.value.length;
    });
}

// ============ SUBMIT ============
if (submitBtn) {
    submitBtn.addEventListener('click', async () => {
        if (!authState.user) {
            showToast('Please log in first', 'warning');
            return;
        }
        const text = textEl.value.trim();
        if (!text) return showToast('Please write your feedback first', 'warning');
        if (!selectedRating) return showToast('Please select a star rating', 'warning');

        submitBtn.disabled = true;
        const originalHtml = submitBtn.innerHTML;
        submitBtn.innerHTML = '<span class="spinner"></span> Submitting...';

        try {
            await submitFeedback({
                userId: authState.user.uid,
                userName: authState.user.displayName || authState.user.email.split('@')[0],
                userEmail: authState.user.email,
                rating: selectedRating,
                text
            });
            showToast('Thanks for your feedback! 🎉', 'success');
            textEl.value = '';
            charCount.textContent = '0';
            selectedRating = 0;
            starsEl.querySelectorAll('i').forEach(s => s.classList.remove('active'));
            await loadFeedback();
        } catch (err) {
            console.error(err);
            showToast(err.message || translateFirebaseError(err), 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalHtml;
        }
    });
}

// ============ LOAD LIST ============
async function loadFeedback() {
    if (!listEl) return;
    try {
        const items = await listFeedback({ max: 12 });
        if (!items.length) {
            listEl.innerHTML = `
                <div class="feedback-empty">
                    <i class="fas fa-comment-dots"></i>
                    <p>No feedback yet. Be the first to share your thoughts!</p>
                </div>
            `;
            return;
        }
        listEl.innerHTML = items.map(renderFeedback).join('');
    } catch (err) {
        console.error(err);
        listEl.innerHTML = `<p style="color:var(--text-muted);text-align:center;padding:1rem;">Could not load feedback.</p>`;
    }
}

function renderFeedback(f) {
    const initial = (f.userName || 'U').charAt(0).toUpperCase();
    const stars = '★'.repeat(f.rating || 0) + '☆'.repeat(5 - (f.rating || 0));
    const date = f.createdAt && f.createdAt.toDate
        ? f.createdAt.toDate().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
        : '';
    return `
        <div class="feedback-item">
            <div class="feedback-head">
                <div class="feedback-user">
                    <div class="feedback-user-avatar">${escapeHtml(initial)}</div>
                    <span>${escapeHtml(f.userName || 'User')}</span>
                </div>
                <div class="feedback-rating-stars" title="${f.rating || 0}/5">${stars}</div>
            </div>
            <div class="feedback-body">${escapeHtml(f.text || '').replace(/\n/g, '<br>')}</div>
            ${date ? `<div class="feedback-meta"><span><i class="far fa-clock"></i> ${date}</span></div>` : ''}
        </div>
    `;
}

function escapeHtml(s) {
    if (!s) return '';
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Init
document.addEventListener('DOMContentLoaded', () => {
    if (listEl) loadFeedback();
});
