// ============================================
// FlickZZ Resources - Feedback API
// Logged-in users submit feedback (1-5 star rating + text)
// Admin can approve/hide/delete feedback
// ============================================

import {
    collection, doc, addDoc, getDocs, query, orderBy, limit,
    where, serverTimestamp, deleteDoc, updateDoc, getDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { db, firebaseReady } from "./firebase-config.js";

const FEEDBACK_COL = 'feedback';

// Get list of feedback for public display.
// By default, only "approved" feedback shows on home page (or any if includeHidden=true).
export async function listFeedback({ max = 20, includeHidden = false } = {}) {
    if (!firebaseReady || !db) return [];
    try {
        const constraints = [];
        if (!includeHidden) constraints.push(where('hidden', '==', false));
        constraints.push(orderBy('createdAt', 'desc'));
        constraints.push(limit(max));
        const q = query(collection(db, FEEDBACK_COL), ...constraints);
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (err) {
        console.warn('listFeedback error:', err);
        // Fallback: return all if the `hidden` field doesn't exist yet
        try {
            const q = query(collection(db, FEEDBACK_COL), orderBy('createdAt', 'desc'), limit(max));
            const snap = await getDocs(q);
            return snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(f => includeHidden || !f.hidden);
        } catch {
            return [];
        }
    }
}

export async function submitFeedback({ userId, userName, userEmail, rating, text }) {
    if (!firebaseReady || !db) throw new Error('Firebase not configured.');
    if (!text || !text.trim()) throw new Error('Feedback text is required.');
    if (rating < 1 || rating > 5) throw new Error('Rating must be 1–5.');
    if (text.length > 500) throw new Error('Max 500 characters.');

    return await addDoc(collection(db, FEEDBACK_COL), {
        userId, userName, userEmail,
        rating: Number(rating),
        text: text.trim(),
        hidden: false,
        createdAt: serverTimestamp()
    });
}

export async function deleteFeedback(id) {
    if (!firebaseReady || !db) throw new Error('Firebase not configured.');
    await deleteDoc(doc(db, FEEDBACK_COL, id));
}

export async function toggleFeedbackVisibility(id, hidden) {
    if (!firebaseReady || !db) throw new Error('Firebase not configured.');
    await updateDoc(doc(db, FEEDBACK_COL, id), { hidden: !!hidden });
}

// Get current user's recent feedback (to prevent spam — show 1 per 24h?)
export async function getUserRecentFeedback(userId, limitN = 1) {
    if (!firebaseReady || !db || !userId) return [];
    try {
        const q = query(
            collection(db, FEEDBACK_COL),
            where('userId', '==', userId),
            orderBy('createdAt', 'desc'),
            limit(limitN)
        );
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (err) {
        return [];
    }
}
