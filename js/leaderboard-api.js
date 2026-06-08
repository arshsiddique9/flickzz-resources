// ============================================
// FlickZZ Resources - Leaderboard API
// Owner: Arsh Siddique © 2026
// ============================================
// Aggregates top downloaders, raters, and likers across all resources.

import { db } from './firebase-config.js';
import {
    collection, collectionGroup, getDocs, query, orderBy, limit
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Helper: aggregate counts by user from a collection-group snapshot
function aggregateByUser(docs, getKey, getName) {
    const map = new Map();
    docs.forEach(d => {
        const data = d.data();
        const key = getKey(data, d);
        if (!key) return;
        const existing = map.get(key) || {
            userId: key,
            userName: getName(data) || 'User',
            count: 0
        };
        existing.count += 1;
        // Prefer most recent userName seen
        const nm = getName(data);
        if (nm) existing.userName = nm;
        map.set(key, existing);
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
}

// Top downloaders — counts from /downloads collection
export async function getTopDownloaders(limitN = 20) {
    try {
        const snap = await getDocs(collection(db, 'downloads'));
        const list = aggregateByUser(
            snap.docs,
            (d) => d.userId,
            (d) => d.userName || d.userEmail || null
        );
        return list.slice(0, limitN);
    } catch (err) {
        console.warn("[Leaderboard] downloaders failed:", err.message);
        return [];
    }
}

// Top raters — counts from collectionGroup('ratings')
export async function getTopRaters(limitN = 20) {
    try {
        const q = collectionGroup(db, 'ratings');
        const snap = await getDocs(q);
        const list = aggregateByUser(
            snap.docs,
            (d, docRef) => docRef.id, // ratings doc id == userId
            (d) => d.userName || d.userEmail || null
        );
        return list.slice(0, limitN);
    } catch (err) {
        console.warn("[Leaderboard] raters failed (likely missing index):", err.message);
        return [];
    }
}

// Top likers — counts from collectionGroup('likes')
export async function getTopLikers(limitN = 20) {
    try {
        const q = collectionGroup(db, 'likes');
        const snap = await getDocs(q);
        const list = aggregateByUser(
            snap.docs,
            (d, docRef) => docRef.id, // likes doc id == userId
            (d) => d.userName || d.userEmail || null
        );
        return list.slice(0, limitN);
    } catch (err) {
        console.warn("[Leaderboard] likers failed:", err.message);
        return [];
    }
}

// Top commenters — counts from collectionGroup('comments')
export async function getTopCommenters(limitN = 20) {
    try {
        const q = collectionGroup(db, 'comments');
        const snap = await getDocs(q);
        const list = aggregateByUser(
            snap.docs,
            (d) => d.userId,
            (d) => d.userName || null
        );
        return list.slice(0, limitN);
    } catch (err) {
        console.warn("[Leaderboard] commenters failed:", err.message);
        return [];
    }
}
