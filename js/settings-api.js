// ============================================
// FlickZZ Resources - Site Settings API
// Lets the owner control site-wide settings live (Discord, YouTube,
// hero text, feature toggles, maintenance mode, etc.)
// Stored in Firestore at: settings/site
// ============================================

import {
    doc, getDoc, setDoc, onSnapshot, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { db, firebaseReady } from "./firebase-config.js";

const SETTINGS_DOC = ['settings', 'site'];

// Default values used when nothing has been saved yet.
export const DEFAULT_SETTINGS = {
    discordUrl: 'https://discord.gg/svsTCuHNNu',
    youtubeUrl: 'https://youtube.com/@yt-flickzz?si=ZuzfWgYYGs4YMnQf',
    announcement: '',
    heroTitle: '',                 // empty = keep hardcoded default
    heroSubtitle: '',
    feedbackEnabled: true,
    registrationOpen: true,
    maintenance: false
};

// In-memory cache so multiple modules can access without refetching
let cachedSettings = null;
const listeners = new Set();

export function onSettings(cb) {
    listeners.add(cb);
    if (cachedSettings) cb(cachedSettings);
    return () => listeners.delete(cb);
}

function emit(settings) {
    cachedSettings = settings;
    listeners.forEach(cb => cb(settings));
    // Also dispatch a window event so non-module scripts can listen
    window.dispatchEvent(new CustomEvent('site-settings', { detail: settings }));
}

// Fetch settings once (used on initial page load)
export async function fetchSettings() {
    if (!firebaseReady || !db) {
        emit({ ...DEFAULT_SETTINGS });
        return cachedSettings;
    }
    try {
        const snap = await getDoc(doc(db, ...SETTINGS_DOC));
        const data = snap.exists() ? { ...DEFAULT_SETTINGS, ...snap.data() } : { ...DEFAULT_SETTINGS };
        emit(data);
        return data;
    } catch (err) {
        console.warn('fetchSettings error:', err);
        emit({ ...DEFAULT_SETTINGS });
        return cachedSettings;
    }
}

// Subscribe to live updates (used by site-config.js so site stays fresh)
export function subscribeSettings() {
    if (!firebaseReady || !db) {
        emit({ ...DEFAULT_SETTINGS });
        return () => {};
    }
    try {
        const unsub = onSnapshot(doc(db, ...SETTINGS_DOC), (snap) => {
            const data = snap.exists() ? { ...DEFAULT_SETTINGS, ...snap.data() } : { ...DEFAULT_SETTINGS };
            emit(data);
        }, (err) => {
            console.warn('settings snapshot error:', err);
            emit({ ...DEFAULT_SETTINGS });
        });
        return unsub;
    } catch (err) {
        emit({ ...DEFAULT_SETTINGS });
        return () => {};
    }
}

// Save settings (admin only)
export async function saveSettings(updates) {
    if (!firebaseReady || !db) throw new Error('Firebase not configured.');
    await setDoc(doc(db, ...SETTINGS_DOC), {
        ...updates,
        updatedAt: serverTimestamp()
    }, { merge: true });
}

export function getCachedSettings() {
    return cachedSettings || { ...DEFAULT_SETTINGS };
}
