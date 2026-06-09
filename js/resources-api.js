// ============================================
// FlickZZ Resources - Firestore Data API
// Owner: Arsh Siddique © 2026
// ============================================

import {
    collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
    query, where, orderBy, limit, serverTimestamp, increment,
    setDoc, deleteField
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
    ref, uploadBytesResumable, getDownloadURL, deleteObject
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";
import { db, storage, firebaseReady } from "./firebase-config.js";

// ============ RESOURCE CATEGORIES ============
export const CATEGORY_META = {
    plugin:  { label: 'Plugin',  icon: 'fa-plug' },
    mod:     { label: 'Mod',     icon: 'fa-puzzle-piece' },
    modpack: { label: 'Modpack', icon: 'fa-layer-group' },
    config:  { label: 'Config',  icon: 'fa-sliders' },
    tool:    { label: 'Tool',    icon: 'fa-toolbox' }
};

// ============ DEMO DATA (fallback when Firebase not configured) ============
const DEMO_RESOURCES = [
    { id: 'demo-1', title: 'EssentialsX', tagline: 'The essential plugin for servers', description: 'The essential plugin for your Minecraft server. Adds hundreds of commands useful on almost every server.', category: 'plugin', version: '2.20', mcVersion: '1.20.x', featured: true, downloads: 2430, ratingSum: 45, ratingCount: 10, createdAt: { seconds: 1710000000 }, thumbnail: '' },
    { id: 'demo-2', title: 'WorldEdit', tagline: 'In-game map editor', description: 'WorldEdit is an easy-to-use in-game Minecraft map editor that lets you distort terrain, replace blocks, generate shapes, and more.', category: 'plugin', version: '7.3', mcVersion: '1.20.x', featured: true, downloads: 1820, ratingSum: 48, ratingCount: 11, createdAt: { seconds: 1709000000 }, thumbnail: '' },
    { id: 'demo-3', title: 'JEI - Just Enough Items', tagline: 'Item and recipe viewer', description: 'JEI is an item and recipe viewing mod for Minecraft, built from the ground up for stability and performance.', category: 'mod', version: '15.2', mcVersion: '1.20.1', featured: true, downloads: 3100, ratingSum: 47, ratingCount: 10, createdAt: { seconds: 1711000000 }, thumbnail: '' },
    { id: 'demo-4', title: 'Create: Above and Beyond', tagline: 'Tech & exploration modpack', description: 'A unique expert-style modpack designed around the Create mod. Build amazing contraptions and automate everything.', category: 'modpack', version: '1.4', mcVersion: '1.18.2', featured: false, downloads: 980, ratingSum: 43, ratingCount: 10, createdAt: { seconds: 1708000000 }, thumbnail: '' },
    { id: 'demo-5', title: 'Survival Server Config', tagline: 'Ready-to-use survival config', description: 'A complete configuration pack for survival servers. Includes balanced economy, claim settings, and PvP rules.', category: 'config', version: '1.0', mcVersion: '1.20.x', featured: false, downloads: 420, ratingSum: 42, ratingCount: 10, createdAt: { seconds: 1707000000 }, thumbnail: '' },
    { id: 'demo-6', title: 'MCServerTool', tagline: 'Server management utility', description: 'A lightweight tool for managing your Minecraft server — backups, restart scheduling, and log analysis.', category: 'tool', version: '2.1', mcVersion: 'All', featured: false, downloads: 650, ratingSum: 44, ratingCount: 10, createdAt: { seconds: 1706000000 }, thumbnail: '' }
];

// ============ RESOURCE CRUD ============

// ✅ FIXED: listResources with client-side filtering & fallback
export async function listResources({ category, sort = 'newest', search = '', max = 100, featuredOnly = false } = {}) {
    if (!firebaseReady || !db) {
        // Demo fallback
        let items = [...DEMO_RESOURCES];
        if (category) items = items.filter(r => r.category === category);
        if (featuredOnly) items = items.filter(r => r.featured);
        if (search) {
            const s = search.toLowerCase();
            items = items.filter(r => r.title.toLowerCase().includes(s) || r.description.toLowerCase().includes(s));
        }
        items = sortItems(items, sort);
        return items.slice(0, max);
    }

    // Strategy: Fetch ALL resources once with just ordering, then filter client-side.
    // Why? Firestore needs a composite index for (where + orderBy) combinations.
    // For a small-to-medium catalog (<500 items) client filtering is fast AND avoids
    // the index-missing failure that returned empty results before.
    try {
        const colRef = collection(db, 'resources');

        // Pick a single orderBy that always works without composite indexes
        let orderField = 'createdAt';
        let orderDir = 'desc';
        if (sort === 'popular') orderField = 'downloads';
        else if (sort === 'name') { orderField = 'title'; orderDir = 'asc'; }

        let snap;
        try {
            // Primary query (with orderBy)
            const q = query(colRef, orderBy(orderField, orderDir), limit(500));
            snap = await getDocs(q);
        } catch (idxErr) {
            // If even the simple orderBy fails (e.g. missing field on legacy docs),
            // fall back to unordered fetch so the user never sees an empty page.
            console.warn('[listResources] ordered query failed, falling back to plain fetch:', idxErr?.message);
            snap = await getDocs(colRef);
        }

        let items = snap.docs.map(d => ({ id: d.id, ...d.data() }));

        // ===== Client-side filtering (case-insensitive, robust) =====
        if (category) {
            const cat = String(category).toLowerCase().trim();
            items = items.filter(r => String(r.category || '').toLowerCase().trim() === cat);
        }
        if (featuredOnly) {
            items = items.filter(r => r.featured === true);
        }
        if (search) {
            const s = search.toLowerCase();
            items = items.filter(r =>
                (r.title || '').toLowerCase().includes(s) ||
                (r.description || '').toLowerCase().includes(s) ||
                (r.tagline || '').toLowerCase().includes(s)
            );
        }

        // ===== Client-side sorting (so we honor the requested sort even after fallback) =====
        items = sortItems(items, sort);

        return items.slice(0, max);
    } catch (err) {
        console.error('listResources error:', err);
        return [];
    }
}

export async function getResource(id) {
    if (!firebaseReady || !db) {
        return DEMO_RESOURCES.find(r => r.id === id) || null;
    }
    try {
        const snap = await getDoc(doc(db, 'resources', id));
        return snap.exists() ? { id: snap.id, ...snap.data() } : null;
    } catch (err) {
        console.error('getResource error:', err);
        return null;
    }
}

export async function createResource(data) {
    if (!firebaseReady || !db) throw new Error('Firebase not configured.');
    const payload = {
        title: data.title || '',
        tagline: data.tagline || '',
        description: data.description || '',
        category: data.category || 'plugin',
        version: data.version || '',
        mcVersion: data.mcVersion || '',
        thumbnail: data.thumbnail || '',
        fileUrl: data.fileUrl || '',
        fileName: data.fileName || '',
        filePath: data.filePath || '',
        fileSize: data.fileSize || 0,
        featured: !!data.featured,
        downloads: 0,
        ratingSum: 0,
        ratingCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    };
    const ref = await addDoc(collection(db, 'resources'), payload);
    return ref.id;
}

export async function updateResource(id, updates) {
    if (!firebaseReady || !db) throw new Error('Firebase not configured.');
    updates.updatedAt = serverTimestamp();
    await updateDoc(doc(db, 'resources', id), updates);
}

export async function deleteResource(id, filePath) {
    if (!firebaseReady || !db) throw new Error('Firebase not configured.');
    // Delete storage file first if present
    if (filePath && storage) {
        try {
            await deleteObject(ref(storage, filePath));
        } catch (e) {
            console.warn('Storage delete failed (continuing):', e);
        }
    }
    await deleteDoc(doc(db, 'resources', id));
}

// ============ FILE UPLOAD (kept for reference, but not used with external URLs) ============
export function uploadResourceFile(file, onProgress) {
    return new Promise((resolve, reject) => {
        if (!firebaseReady || !storage) {
            return reject(new Error('Firebase not configured.'));
        }
        const safeName = file.name.replace(/[^\w.\-]/g, '_');
        const filePath = `resources/${Date.now()}_${safeName}`;
        const storageRef = ref(storage, filePath);
        const task = uploadBytesResumable(storageRef, file);

        task.on('state_changed',
            (snap) => {
                const pct = (snap.bytesTransferred / snap.totalBytes) * 100;
                if (onProgress) onProgress(pct);
            },
            (err) => reject(err),
            async () => {
                const url = await getDownloadURL(task.snapshot.ref);
                resolve({ url, filePath, fileName: file.name, fileSize: file.size });
            }
        );
    });
}

// ============ DOWNLOADS TRACKING ============
export async function recordDownload(resourceId, userId, meta = {}) {
    if (!firebaseReady || !db) return;
    try {
        // Increment counter
        await updateDoc(doc(db, 'resources', resourceId), {
            downloads: increment(1)
        });
        // Track user download
        if (userId) {
            await addDoc(collection(db, 'downloads'), {
                userId,
                userName: meta.userName || '',
                userEmail: meta.userEmail || '',
                resourceId,
                downloadedAt: serverTimestamp()
            });
        }
    } catch (err) {
        console.warn('recordDownload error:', err);
    }
}

export async function getUserDownloads(userId) {
    if (!firebaseReady || !db) return [];
    try {
        const q = query(collection(db, 'downloads'), where('userId', '==', userId), orderBy('downloadedAt', 'desc'), limit(50));
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (err) {
        console.error('getUserDownloads error:', err);
        return [];
    }
}

// ============ RATINGS ============
export async function getUserRating(resourceId, userId) {
    if (!firebaseReady || !db || !userId) return null;
    try {
        const snap = await getDoc(doc(db, 'resources', resourceId, 'ratings', userId));
        return snap.exists() ? snap.data().value : null;
    } catch (err) {
        return null;
    }
}

export async function submitRating(resourceId, userId, value, meta = {}) {
    if (!firebaseReady || !db) throw new Error('Firebase not configured.');
    const ratingRef = doc(db, 'resources', resourceId, 'ratings', userId);
    const prev = await getDoc(ratingRef);
    const prevValue = prev.exists() ? prev.data().value : 0;

    await setDoc(ratingRef, {
        value, userId,
        userName: meta.userName || '',
        userEmail: meta.userEmail || '',
        updatedAt: serverTimestamp()
    });

    // Adjust aggregate counts
    const resourceRef = doc(db, 'resources', resourceId);
    if (prev.exists()) {
        await updateDoc(resourceRef, {
            ratingSum: increment(value - prevValue)
        });
    } else {
        await updateDoc(resourceRef, {
            ratingSum: increment(value),
            ratingCount: increment(1)
        });
    }
}

export async function getUserRatingsCount(userId) {
    if (!firebaseReady || !db || !userId) return 0;
    try {
        const q = query(collection(db, 'userRatings'), where('userId', '==', userId));
        const snap = await getDocs(q);
        return snap.size;
    } catch { return 0; }
}

// ============ COMMENTS ============
export async function getComments(resourceId) {
    if (!firebaseReady || !db) return [];
    try {
        const q = query(
            collection(db, 'resources', resourceId, 'comments'),
            orderBy('createdAt', 'desc'),
            limit(50)
        );
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (err) {
        console.error('getComments error:', err);
        return [];
    }
}

export async function addComment(resourceId, { userId, userName, userEmail = '', text, parentId = null }) {
    if (!firebaseReady || !db) throw new Error('Firebase not configured.');
    await addDoc(collection(db, 'resources', resourceId, 'comments'), {
        userId, userName, userEmail, text,
        parentId: parentId || null,
        createdAt: serverTimestamp()
    });
}

export async function deleteComment(resourceId, commentId) {
    if (!firebaseReady || !db) throw new Error('Firebase not configured.');
    await deleteDoc(doc(db, 'resources', resourceId, 'comments', commentId));
}

export async function getUserCommentsCount(userId) {
    // Simplified: not tracked across collections in minimal setup.
    return 0;
}

// ============ ADMIN STATS ============
export async function getPlatformStats() {
    if (!firebaseReady || !db) {
        return { totalResources: DEMO_RESOURCES.length, totalUsers: 0, totalDownloads: 0, totalComments: 0, totalFeedback: 0 };
    }
    try {
        const [resSnap, usrSnap, dlSnap, fbSnap] = await Promise.all([
            getDocs(collection(db, 'resources')),
            getDocs(collection(db, 'users')),
            getDocs(collection(db, 'downloads')),
            getDocs(collection(db, 'feedback'))
        ]);
        let totalDownloadsFromResources = 0;
        resSnap.docs.forEach(d => { totalDownloadsFromResources += (d.data().downloads || 0); });
        return {
            totalResources: resSnap.size,
            totalUsers: usrSnap.size,
            totalDownloads: totalDownloadsFromResources || dlSnap.size,
            totalComments: 0,
            totalFeedback: fbSnap.size
        };
    } catch (err) {
        console.error('getPlatformStats error:', err);
        return { totalResources: 0, totalUsers: 0, totalDownloads: 0, totalComments: 0, totalFeedback: 0 };
    }
}

// ============ PUBLIC LIVE STATS (Home page) ============
// ✅ FIXED: handles guest read permissions without breaking the page
export async function getLiveStats() {
    if (!firebaseReady || !db) {
        return { resources: 0, downloads: 0, members: 0 };
    }

    const result = { resources: 0, downloads: 0, members: 0 };

    // 1) Resources + downloads (PUBLIC — works for guests)
    try {
        const resSnap = await getDocs(collection(db, 'resources'));
        result.resources = resSnap.size;
        let totalDownloads = 0;
        resSnap.docs.forEach(d => {
            totalDownloads += (d.data().downloads || 0);
        });
        result.downloads = totalDownloads;
    } catch (err) {
        console.warn('[getLiveStats] resources fetch failed:', err?.message);
    }

    // 2) Members count from /users (PRIVATE for guests).
    //    First try direct read — works for signed-in users.
    //    If that fails (guest), fall back to a public /publicStats/members counter
    //    that we maintain on signup. If that also fails, leave 0 — never break the page.
    try {
        const usrSnap = await getDocs(collection(db, 'users'));
        result.members = usrSnap.size;
    } catch {
        try {
            const memDoc = await getDoc(doc(db, 'publicStats', 'members'));
            if (memDoc.exists()) {
                result.members = memDoc.data().count || 0;
            }
        } catch {
            // Stay 0 silently — don't pollute the console for guests.
        }
    }

    return result;
}

// Increment the public members counter (called once on every successful signup).
// Safe to fail silently (it's just a public display number).
export async function bumpPublicMembersCount() {
    if (!firebaseReady || !db) return;
    try {
        await setDoc(
            doc(db, 'publicStats', 'members'),
            { count: increment(1), updatedAt: serverTimestamp() },
            { merge: true }
        );
    } catch (err) {
        console.warn('[bumpPublicMembersCount] failed:', err?.message);
    }
}

// ============ HELPERS ============
export function avgRating(r) {
    const count = r.ratingCount || 0;
    if (!count) return 0;
    return (r.ratingSum || 0) / count;
}

function sortItems(items, sort) {
    if (sort === 'popular') return items.sort((a, b) => (b.downloads || 0) - (a.downloads || 0));
    if (sort === 'name') return items.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    if (sort === 'rating') return items.sort((a, b) => avgRating(b) - avgRating(a));
    return items.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
}

export function formatDate(ts) {
    if (!ts) return '—';
    const d = ts.toDate ? ts.toDate() : (ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts));
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatFileSize(bytes) {
    if (!bytes) return '';
    const units = ['B', 'KB', 'MB', 'GB'];
    let i = 0;
    while (bytes >= 1024 && i < units.length - 1) { bytes /= 1024; i++; }
    return bytes.toFixed(1) + ' ' + units[i];
}

export function formatNumber(n) {
    if (!n) return '0';
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
    return String(n);
}
