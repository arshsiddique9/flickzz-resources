// ============================================
// FlickZZ Resources - Likes API
// Owner: Arsh Siddique © 2026
// ============================================
// Like/unlike a resource. One doc per user under resources/{rid}/likes/{userId}.

import { db } from './firebase-config.js';
import {
    doc, setDoc, deleteDoc, getDoc, collection, getDocs, query, where, getCountFromServer
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Toggle like — returns new liked state
export async function toggleLike(resourceId, user) {
    if (!user) throw new Error("Login required to like");
    const ref = doc(db, 'resources', resourceId, 'likes', user.uid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
        await deleteDoc(ref);
        return false;
    } else {
        await setDoc(ref, {
            userId: user.uid,
            userName: user.displayName || (user.email ? user.email.split('@')[0] : 'User'),
            userEmail: user.email || '',
            createdAt: Date.now()
        });
        return true;
    }
}

// Has the given user liked this resource?
export async function hasLiked(resourceId, userId) {
    if (!userId) return false;
    const ref = doc(db, 'resources', resourceId, 'likes', userId);
    const snap = await getDoc(ref);
    return snap.exists();
}

// Total likes count for a resource
export async function getLikeCount(resourceId) {
    try {
        const colRef = collection(db, 'resources', resourceId, 'likes');
        const snap = await getCountFromServer(colRef);
        return snap.data().count || 0;
    } catch (err) {
        // Fallback for older SDKs
        const colRef = collection(db, 'resources', resourceId, 'likes');
        const snap = await getDocs(colRef);
        return snap.size;
    }
}

// List likers (for leaderboard aggregation)
export async function listLikesForResource(resourceId) {
    const colRef = collection(db, 'resources', resourceId, 'likes');
    const snap = await getDocs(colRef);
    return snap.docs.map(d => d.data());
}
