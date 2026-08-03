// ============================================
// FlickZZ Resources - Firebase Configuration
// Owner: Arsh Siddique © 2026
// ============================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

// Firebase config (public-safe)
const firebaseConfig = {
    apiKey: "AIzaSyCMpZtzf3CSrVztGihysYL3M4gC6ZgUzG0",
    authDomain: "flickzz-resources.firebaseapp.com",
    projectId: "flickzz-resources",
    storageBucket: "flickzz-resources.firebasestorage.app",
    messagingSenderId: "554417592538",
    appId: "1:554417592538:web:be87ac778712df5c032de3"
};

// 👑 OWNER CONFIG
export const OWNER_EMAIL = "officialflickzzyt@gmail.com";
export const OWNER_UID = ""; // leave empty — matched by email only
export const ADMIN_EMAILS = ["officialflickzzyt@gmail.com"];

// ============================================
let app, auth, db, storage;
let firebaseReady = false;

try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    firebaseReady = true;
    console.log("✅ Firebase initialized");
} catch (err) {
    console.error("Firebase init error:", err);
    firebaseReady = false;
}

export { app, auth, db, storage, firebaseReady };

// ============================================
// Admin helpers
// ============================================
export function isAdminEmail(email) {
    if (!email) return false;
    const e = email.toLowerCase().trim();
    if (e === OWNER_EMAIL.toLowerCase().trim()) return true;
    return ADMIN_EMAILS.some(a => a.toLowerCase().trim() === e);
}

export function isOwner(user) {
    if (!user || !user.email) return false;
    return user.email.toLowerCase().trim() === OWNER_EMAIL.toLowerCase().trim();
}
