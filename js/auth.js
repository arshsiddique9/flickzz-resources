// ============================================
// FlickZZ Resources - Authentication Module
// ============================================

import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { doc, setDoc, getDoc, serverTimestamp, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { auth, db, firebaseReady, isAdminEmail, isOwner } from "./firebase-config.js";

export const authState = { user: null, isAdmin: false, isOwner: false, isPublisher: false, ready: false, listeners: [] };

export function onAuthReady(callback) {
    if (authState.ready) callback(authState);
    else authState.listeners.push(callback);
}

if (firebaseReady && auth) {
    onAuthStateChanged(auth, async (user) => {
        authState.user = user;
        authState.isAdmin = user ? isAdminEmail(user.email) : false;
        authState.isOwner = user ? isOwner(user) : false;

        // Check publisher status from Firestore
        if (user) {
            try {
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                authState.isPublisher = userDoc.exists() ? !!userDoc.data().isPublisher : false;
            } catch { authState.isPublisher = false; }
        } else { authState.isPublisher = false; }

        authState.ready = true;

        if (user) {
            await ensureUserDoc(user);

            // 🔒 CRITICAL FIX: Force email verification for non-admin users
            // Prevents unverified users from accessing dashboard/admin bypass
            if (!user.emailVerified && !authState.isAdmin) {
                const currentPath = window.location.pathname;
                const allowedPaths = ['/verify-email.html', '/login.html', '/signup.html', '/'];
                const isAllowed = allowedPaths.some(p => currentPath === p || currentPath.startsWith('/verify-email.html'));
                
                if (!isAllowed) {
                    const email = encodeURIComponent(user.email || '');
                    const uid = user.uid;
                    // Redirect unverified users to verify page
                    window.location.href = `/verify-email.html?uid=${uid}&email=${email}`;
                    return; // Stop further execution
                }
            }
        }

        updateAuthUI();
        authState.listeners.forEach(cb => cb(authState));
        authState.listeners = [];
        window.dispatchEvent(new CustomEvent('authchange', { detail: authState }));
    });
} else {
    authState.ready = true;
    setTimeout(() => { updateAuthUI(); authState.listeners.forEach(cb => cb(authState)); authState.listeners = []; }, 100);
}

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
                isPublisher: false,
                createdAt: serverTimestamp()
            });
            try {
                const { bumpPublicMembersCount } = await import('./resources-api.js');
                await bumpPublicMembersCount();
            } catch (e) {
                console.warn('[ensureUserDoc] publicStats bump skipped:', e?.message);
            }
        }
    } catch (err) {
        console.error("ensureUserDoc error:", err);
    }
}

export async function signUpEmail({ email, password, displayName }) {
    if (!firebaseReady) throw new Error("Firebase not configured.");
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName) await updateProfile(cred.user, { displayName });
    await ensureUserDoc(cred.user);
    return cred.user;
}

export async function signInEmail({ email, password }) {
    if (!firebaseReady) throw new Error("Firebase not configured.");
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return cred.user;
}

export async function signInGoogle() {
    if (!firebaseReady) throw new Error("Firebase not configured.");
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

export function updateAuthUI() {
    const isAuth = !!authState.user;
    const isAdm = authState.isAdmin;
    const isPub = authState.isPublisher || isAdm;

    document.querySelectorAll('.auth-only').forEach(el => el.classList.toggle('hidden', !isAuth));
    document.querySelectorAll('.guest-only').forEach(el => el.classList.toggle('hidden', isAuth));
    document.querySelectorAll('.admin-only').forEach(el => el.classList.toggle('hidden', !isAdm));
    document.querySelectorAll('.publisher-only').forEach(el => el.classList.toggle('hidden', !isPub));

    if (isAuth) {
        const nameEl = document.getElementById('userName');
        const emailEl = document.getElementById('userEmail');
        const u = authState.user;
        const nm = u.displayName || u.email.split('@')[0];
        if (nameEl) nameEl.textContent = nm;
        if (emailEl) emailEl.textContent = u.email;
    }
}

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

export function requireAdmin() {
    return new Promise((resolve) => {
        onAuthReady((state) => resolve(state));
    });
}

export function requirePublisher() {
    return new Promise((resolve) => {
        onAuthReady((state) => {
            if (!state.user) {
                sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
                window.location.href = 'login.html';
                return;
            }
            if (!state.isPublisher && !state.isAdmin) {
                window.location.href = 'index.html';
                return;
            }
            resolve(state);
        });
    });
}
