// ============================================
// FlickZZ Resources - Users API
// ============================================

import { collection, doc, getDoc, getDocs, updateDoc, deleteDoc, query, orderBy, limit, where } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { db, firebaseReady } from "./firebase-config.js";

export async function listUsers({ max = 500 } = {}) {
    if (!firebaseReady || !db) return [];
    try {
        const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(max));
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (err) { console.error('listUsers error:', err); return []; }
}

export async function getRecentUsers(count = 5) {
    return listUsers({ max: count });
}

export async function setUserBanned(userId, banned) {
    if (!firebaseReady || !db) throw new Error('Firebase not configured');
    await updateDoc(doc(db, 'users', userId), { banned });
}

export async function setUserAdmin(userId, isAdmin) {
    if (!firebaseReady || !db) throw new Error('Firebase not configured');
    await updateDoc(doc(db, 'users', userId), { isAdmin });
}

// ✅ NEW: Publisher role
export async function setUserPublisher(userId, isPublisher) {
    if (!firebaseReady || !db) throw new Error('Firebase not configured');
    await updateDoc(doc(db, 'users', userId), { isPublisher });
}

export async function deleteUserRecord(userId) {
    if (!firebaseReady || !db) throw new Error('Firebase not configured');
    await deleteDoc(doc(db, 'users', userId));
}

export async function listAllComments() {
    if (!firebaseReady || !db) return [];
    try {
        const snap = await getDocs(collection(db, 'resources'));
        let comments = [];
        for (const resourceDoc of snap.docs) {
            const commentsSnap = await getDocs(collection(db, 'resources', resourceDoc.id, 'comments'));
            commentsSnap.docs.forEach(c => comments.push({ id: c.id, resourceId: resourceDoc.id, resourceTitle: resourceDoc.data().title, ...c.data() }));
        }
        return comments.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    } catch (err) { console.error(err); return []; }
}

export async function deleteAnyComment(resourceId, commentId) {
    if (!firebaseReady || !db) throw new Error('Firebase not configured');
    await deleteDoc(doc(db, 'resources', resourceId, 'comments', commentId));
}

export async function listAllDownloads() {
    if (!firebaseReady || !db) return [];
    try {
        const q = query(collection(db, 'downloads'), orderBy('downloadedAt', 'desc'), limit(100));
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (err) { console.error(err); return []; }
}

// Check if current user is publisher
export async function isUserPublisher(userId) {
    if (!firebaseReady || !db || !userId) return false;
    try {
        const snap = await getDoc(doc(db, 'users', userId));
        return snap.exists() ? !!snap.data().isPublisher : false;
    } catch { return false; }
}
