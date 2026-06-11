// ============================================
// FlickZZ Resources - Firebase Configuration
// Owner: Arsh Siddique © 2026
// ============================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

// 🔧 Your real Firebase config (safe to be public)
const firebaseConfig = {
    apiKey: "AIzaSyCMpZtzf3CSrVztGihysYL3M4gC6ZgUzG0",
    authDomain: "flickzz-resources.firebaseapp.com",
    projectId: "flickzz-resources",
    storageBucket: "flickzz-resources.firebasestorage.app",
    messagingSenderId: "554417592538",
    appId: "1:554417592538:web:be87ac778712df5c032de3"
};

export const OWNER_EMAIL = "officialflickzzyt@gmail.com";
export const OWNER_UID = ""; // optional, baad mein daal diyo

// 🔐 Admin access code – direct yahan rakh (ya baad mein env var mein daal sakta hai)
export const ADMIN_ACCESS_CODE = "flickzzmalikkoaccessdo2026";
export const ADMIN_EMAILS = [];

// ============================================
// Initialize Firebase
// ============================================
let app, auth, db, storage;
let firebaseReady = false;

try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    firebaseReady = true;
    console.log("✅ Firebase initialized successfully");
} catch (err) {
    console.error("Firebase initialization error:", err);
    firebaseReady = false;
}

export { app, auth, db, storage, firebaseReady };

// ============================================
// Admin verification helpers
// ============================================
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
