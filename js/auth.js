// ============================================
// FlickZZ Resources - Authentication Module
// ============================================

import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    signOut,
    onAuthStateChanged,
    updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
    doc, setDoc, getDoc, serverTimestamp, collection, query, where, getDocs
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { auth, db, firebaseReady, isAdminEmail, isOwner } from "./firebase-config.js";

// Global auth state
export const authState = {
    user: null,
    isAdmin: false,
    isOwner: false,
    ready: false,
    listeners: []
};

export function onAuthReady(callback) {
    if (authState.ready) {
        callback(authState);
    } else {
        authState.listeners.push(callback);
    }
}

// Initialize auth listener
if (firebaseReady && auth) {
    onAuthStateChanged(auth, async (user) => {
        authState.user = user;
        authState.isAdmin = user ? isAdminEmail(user.email) : false;
        authState.isOwner = user ? isOwner(user) : false;
        authState.ready = true;

        if (user) {
            // Ensure user doc exists
            await ensureUserDoc(user);
        }

        // Update UI visibility
        updateAuthUI();

        // Call any pending listeners
        authState.listeners.forEach(cb => cb(authState));
        authState.listeners = [];

        // Dispatch custom event
        window.dispatchEvent(new CustomEvent('authchange', { detail: authState }));
    });
} else {
    // Firebase not ready → finish init anyway so UI shows
    authState.ready = true;
    setTimeout(() => {
        updateAuthUI();
        authState.listeners.forEach(cb => cb(authState));
        authState.listeners = [];
    }, 100);
}

// Ensure a user record exists in Firestore
async function ensureUserDoc(user) {
    if (!db) return;
    try {
        const userRef = doc(db, "users", user.uid);
        const snap = await getDoc(userRef);
        if (!snap.exists()) {
            await setDoc(userRef, {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName || user.email.split('@')[0],
                photoURL: user.photoURL || null,
                isAdmin: isAdminEmail(user.email),
                createdAt: serverTimestamp()
            });
        }
    } catch (err) {
        console.error("ensureUserDoc error:", err);
    }
}

// ============ Auth Actions ============

export async function signUpEmail({ email, password, displayName }) {
    if (!firebaseReady) throw new Error("Firebase not configured. Check js/firebase-config.js");
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName) {
        await updateProfile(cred.user, { displayName });
    }
    await ensureUserDoc(cred.user);
    return cred.user;
}

export async function signInEmail({ email, password }) {
    if (!firebaseReady) throw new Error("Firebase not configured. Check js/firebase-config.js");
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return cred.user;
}

export async function signInGoogle() {
    if (!firebaseReady) throw new Error("Firebase not configured. Check js/firebase-config.js");
    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(auth, provider);
    await ensureUserDoc(cred.user);
    return cred.user;
}

export async function logout() {
    if (!auth) return;
    await signOut(auth);
    window.location.href = "index.html";
}

// Update UI elements that depend on auth state
export function updateAuthUI() {
    const isAuth = !!authState.user;
    const isAdm = authState.isAdmin;

    document.querySelectorAll('.auth-only').forEach(el => {
        el.classList.toggle('hidden', !isAuth);
    });
    document.querySelectorAll('.guest-only').forEach(el => {
        el.classList.toggle('hidden', isAuth);
    });
    document.querySelectorAll('.admin-only').forEach(el => {
        el.classList.toggle('hidden', !isAdm);
    });

    if (isAuth) {
        const nameEl = document.getElementById('userName');
        const emailEl = document.getElementById('userEmail');
        const dashName = document.getElementById('dashUserName');
        const u = authState.user;
        const nm = u.displayName || u.email.split('@')[0];
        if (nameEl) nameEl.textContent = nm;
        if (emailEl) emailEl.textContent = u.email;
        if (dashName) dashName.textContent = nm;
    }
}

// Require auth (redirects if not logged in)
export function requireAuth(redirectTo = "login.html") {
    return new Promise((resolve) => {
        onAuthReady((state) => {
            if (!state.user) {
                sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
                window.location.href = redirectTo;
                return;
            }
            resolve(state);
        });
    });
}

// Require admin
export function requireAdmin() {
    return new Promise((resolve) => {
        onAuthReady((state) => {
            resolve(state);
        });
    });
}
