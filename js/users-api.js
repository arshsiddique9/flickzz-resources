// ============================================
// FlickZZ Resources - Users API (Admin Only)
// ============================================

import {
    collection, doc, getDocs, getDoc, updateDoc, deleteDoc,
    query, orderBy, limit, where, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { db, firebaseReady } from "./firebase-config.js";

// List users (most recent first)
export async function listUsers({ max = 200 } = {}) {
    if (!firebaseReady || !db) return [];
    try {
        const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(max));
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (err) {
        // Fallback if no createdAt
        try {
            const snap = await getDocs(collection(db, 'users'));
            return snap.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch {
            return [];
        }
    }
}

// Ban / Unban a user (sets a flag — Firestore rules can be extended to enforce)
export async function setUserBanned(uid, banned) {
    if (!firebaseReady || !db) throw new Error('Firebase not configured.');
    await updateDoc(doc(db, 'users', uid), {
        banned: !!banned,
        bannedAt: banned ? serverTimestamp() : null
    });
}

// Promote / demote admin flag (stored only — Firestore admin enforcement
// is still tied to email allowlist in firebase-config.js. This flag is mainly
// for UI display.)
export async function setUserAdmin(uid, isAdmin) {
    if (!firebaseReady || !db) throw new Error('Firebase not configured.');
    await updateDoc(doc(db, 'users', uid), { isAdmin: !!isAdmin });
}

// Delete a user record (does NOT remove the Firebase Auth account —
// that must be done from the Firebase Console under Authentication → Users)
export async function deleteUserRecord(uid) {
    if (!firebaseReady || !db) throw new Error('Firebase not configured.');
    await deleteDoc(doc(db, 'users', uid));
}

// Get recent users (small list for dashboard)
export async function getRecentUsers(n = 5) {
    const all = await listUsers({ max: n });
    return all.slice(0, n);
}

// ============ COMMENTS (all-resource flat list) ============
// We use Firestore's collectionGroup to query across all resource sub-collections
import { collectionGroup } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

export async function listAllComments({ max = 200 } = {}) {
    if (!firebaseReady || !db) return [];
    try {
        const q = query(collectionGroup(db, 'comments'), orderBy('createdAt', 'desc'), limit(max));
        const snap = await getDocs(q);
        return snap.docs.map(d => {
            // The parent path is `resources/{resourceId}/comments/{commentId}`
            const segs = d.ref.path.split('/');
            const resourceId = segs[1];
            return { id: d.id, resourceId, ...d.data() };
        });
    } catch (err) {
        console.warn('listAllComments error:', err);
        return [];
    }
}

export async function deleteAnyComment(resourceId, commentId) {
    if (!firebaseReady || !db) throw new Error('Firebase not configured.');
    await deleteDoc(doc(db, 'resources', resourceId, 'comments', commentId));
}

// ============ DOWNLOADS LIST (admin analytics) ============
export async function listAllDownloads({ max = 100 } = {}) {
    if (!firebaseReady || !db) return [];
    try {
        const q = query(collection(db, 'downloads'), orderBy('downloadedAt', 'desc'), limit(max));
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (err) {
        return [];
    }
}
