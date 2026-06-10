// ============================================
// FlickZZ Resources - Firebase Configuration
// Owner: Arsh Siddique © 2026
// ============================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

// All values come from Vercel Environment Variables (no hardcoding)
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

export const OWNER_EMAIL = process.env.NEXT_PUBLIC_OWNER_EMAIL;
export const OWNER_UID = ""; // Optional, keep as is or set later
export const ADMIN_ACCESS_CODE = process.env.NEXT_PUBLIC_ADMIN_ACCESS_CODE;
export const ADMIN_EMAILS = [];

// ... rest of your file (initialize Firebase, isAdminEmail, isOwner etc.)

// ============================================
// Initialize Firebase (Fixed)
// ============================================
let app, auth, db, storage;
let firebaseReady = false;

try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    firebaseReady = true;   // ✅ Force true because real config is used
    console.log("✅ Firebase initialized successfully");
} catch (err) {
    console.error("Firebase initialization error:", err);
    firebaseReady = false;
}

export { app, auth, db, storage, firebaseReady };

// Admin verification helpers
export function isAdminEmail(email) {
    if (!email) return false;
    const e = email.toLowerCase().trim();
    if (e === OWNER_EMAIL.toLowerCase().trim()) return true;
    return ADMIN_EMAILS.some(a => a.toLowerCase().trim() === e);
}

export function isOwner(user) {
    if (!user || !user.email) return false;
    const emailMatch = user.email.toLowerCase().trim() === OWNER_EMAIL.toLowerCase().trim();
    if (!emailMatch) return false;
    if (OWNER_UID && OWNER_UID.trim() !== "") {
        return user.uid === OWNER_UID.trim();
    }
    return true;
}
