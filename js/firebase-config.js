// ============================================
// FlickZZ Resources - Firebase Configuration
// Owner: Arsh Siddique © 2026
// ============================================
//
// ⚠️ IMPORTANT: Replace the placeholders below with your own Firebase project credentials.
// Get them from: https://console.firebase.google.com/ → Project Settings → General → Your apps → Web app
//
// After creating your Firebase project:
// 1. Enable Authentication (Email/Password + Google provider)
// 2. Create a Firestore database (apply rules from firestore.rules)
// 3. Enable Storage (apply rules from storage.rules)
// 4. Set the OWNER_EMAIL below to YOUR primary admin email
// 5. (Optional but recommended) Set OWNER_UID after first login

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

// 🔧 Your Firebase config object (REPLACE THESE VALUES)
const firebaseConfig = {
    apiKey: "AIzaSyCMpZtzf3CSrVztGihysYL3M4gC6ZgUzG0",
    authDomain: "flickzz-resources.firebaseapp.com",
    projectId: "flickzz-resources",
    storageBucket: "flickzz-resources.firebasestorage.app",
    messagingSenderId: "554417592538",
    appId: "1:554417592538:web:be87ac778712df5c032de3"
};

// ============================================
// 👑 OWNER & ADMIN CONFIGURATION (CRITICAL)
// ============================================
//
// FlickZZ uses a 3-LAYER admin lock to ensure ONLY YOU can access the panel.
//
// LAYER 1: Email allowlist (set OWNER_EMAIL below)
// LAYER 2: UID lock (after first login, paste your UID in OWNER_UID below to lock it down)
// LAYER 3: Secret access code (set ADMIN_ACCESS_CODE — must be entered every time)
// LAYER 4: Server-side Firestore rules (enforced even if client is hacked)

// 👑 Primary OWNER email — ONLY this email can become admin.
// 💡 Use the SAME email everywhere: here, in firestore.rules, and in storage.rules.
export const OWNER_EMAIL = "toxictruthx1@gmail.com"; // ← REPLACE with YOUR Gmail

// 🔒 OWNER UID lock (recommended for max security)
// HOW TO USE:
//   1. Leave this empty initially (signup with your email first)
//   2. Go to Firebase Console → Authentication → Users tab
//   3. Find YOUR user, copy the "User UID" column value
//   4. Paste it below as a string
//   5. After this, even if someone steals your email/password, they need YOUR exact UID
//      (Firebase UIDs are unique per account and can't be spoofed)
export const OWNER_UID = ""; // ← Optional but RECOMMENDED. e.g. "AbCdEf123XyZ..."

// 🔐 Secret admin access code — required EVERY time you open the admin panel.
// This is a SECOND PASSWORD on top of your Firebase login.
// Make it long & random (16+ characters). DO NOT share with anyone.
// 💡 You can change this anytime by editing this file & pushing to GitHub.
export const ADMIN_ACCESS_CODE = "FlickZZ@Arsh2026#Secure"; // ← REPLACE

// 📜 Secondary admin emails (optional). Leave empty if you're the ONLY admin.
// Format: lowercase emails.
// ⚠️ Anyone added here gets full admin power. Add ONLY trusted people.
export const ADMIN_EMAILS = [
    // "trusted-coadmin@gmail.com"
];

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
    firebaseReady = firebaseConfig.apiKey !== "YOUR_API_KEY";

    if (!firebaseReady) {
        console.warn(
            "%c⚠️ FlickZZ Resources — Firebase not configured!",
            "color: orange; font-weight: bold; font-size: 14px;"
        );
        console.warn("Please update js/firebase-config.js with your Firebase credentials.");
        console.warn("See SETUP-HINGLISH.md or README.md for setup instructions.");
    }
} catch (err) {
    console.error("Firebase initialization error:", err);
}

export { app, auth, db, storage, firebaseReady };

// ============================================
// Admin verification helpers
// ============================================

// Check if a user's email is in the admin allowlist (Layer 1)
export function isAdminEmail(email) {
    if (!email) return false;
    const e = email.toLowerCase().trim();
    if (e === OWNER_EMAIL.toLowerCase().trim()) return true;
    return ADMIN_EMAILS.some(a => a.toLowerCase().trim() === e);
}

// Check if a user is the verified OWNER (full power — Layer 1 + Layer 2)
export function isOwner(user) {
    if (!user || !user.email) return false;
    const emailMatch = user.email.toLowerCase().trim() === OWNER_EMAIL.toLowerCase().trim();
    if (!emailMatch) return false;
    // If OWNER_UID is set, enforce UID match too (Layer 2)
    if (OWNER_UID && OWNER_UID.trim() !== "") {
        return user.uid === OWNER_UID.trim();
    }
    return true;
}
