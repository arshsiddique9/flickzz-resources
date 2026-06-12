// ============================================
// FlickZZ Resources - Signup Script (FIXED)
// Owner: Arsh Siddique © 2026
// ============================================
// 6-digit email verification via Brevo + Turnstile

import { signUpEmail, signInGoogle } from "./auth.js";
import { showToast, translateFirebaseError } from "./main.js";
import { auth, db } from "./firebase-config.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// 🔑 FIX: signup-in-progress flag — onAuthStateChanged fires immediately after
// createUserWithEmailAndPassword(), and we DON'T want it to redirect to dashboard
// while we're still sending the verification email.
let signupInProgress = false;

// 🔑 FIX: Only redirect to dashboard if user is ALREADY signed in AND emailVerified
// AND we are NOT in the middle of a fresh signup.
onAuthStateChanged(auth, (user) => {
    if (signupInProgress) return;        // do nothing during signup
    if (user && user.emailVerified) {
        window.location.href = 'dashboard.html';
    }
    // If user is signed in but NOT verified, do NOTHING here.
    // We'll handle the redirect to verify-email.html ourselves in the form handler.
});

const form = document.getElementById('signupForm');
const submitBtn = document.getElementById('signupSubmit');

async function sendVerificationCode(email, code) {
    const response = await fetch('/api/send-verification-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.error || 'Failed to send verification email');
    }
    return data;
}

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // ===== Turnstile CAPTCHA check =====
    const token = document.getElementById('cfToken').value;
    if (!token) {
        showToast('Please complete the security check', 'warning');
        return;
    }

    const displayName = document.getElementById('displayName').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const terms = document.getElementById('termsCheck').checked;

    if (!terms) {
        showToast('You must accept the Terms and Privacy Policy', 'warning');
        return;
    }
    if (password.length < 6) {
        showToast('Password must be at least 6 characters', 'warning');
        return;
    }

    setLoading(submitBtn, true, 'Verifying security...');

    // Verify Turnstile token server-side
    try {
        const res = await fetch('/api/turnstile-verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Security check failed');
    } catch (err) {
        showToast(err.message || 'Security check failed', 'error');
        setLoading(submitBtn, false, 'Create Account');
        if (window.turnstile) turnstile.reset();
        document.getElementById('cfToken').value = '';
        return;
    }

    setLoading(submitBtn, true, 'Creating account...');
    signupInProgress = true;  // 🔑 prevent the auth listener from redirecting

    let createdUser = null;
    try {
        // 1) Create the Firebase Auth user
        createdUser = await signUpEmail({ email, password, displayName });
        if (!createdUser || !createdUser.uid) {
            throw new Error('User creation failed: No UID returned');
        }

        // 2) Generate a 6-digit code & store it (expires in 1 hour)
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        await setDoc(doc(db, 'emailVerifications', createdUser.uid), {
            code: verificationCode,
            email: email,
            createdAt: serverTimestamp(),
            expiresAt: new Date(Date.now() + 60 * 60 * 1000)
        });

        // 3) Send the code via Brevo
        try {
            await sendVerificationCode(email, verificationCode);
        } catch (emailErr) {
            // Don't fail the whole flow — user can resend from verify-email.html
            console.error('Brevo send failed:', emailErr);
            showToast('Account created, but email sending failed. Use Resend on the next page.', 'warning');
        }

        showToast('Account created! Check your email for the 6-digit code.', 'success');

        // 4) 🔑 CRITICAL FIX: sign the user OUT so the auth listener can't pull
        //    them into the dashboard before they verify.
        const uidForRedirect = createdUser.uid;
        try {
            await signOut(auth);
        } catch (_) { /* ignore */ }

        // 5) 🔑 CRITICAL FIX: redirect to verify-email.html with the UID
        setTimeout(() => {
            window.location.href = `verify-email.html?uid=${uidForRedirect}&email=${encodeURIComponent(email)}`;
        }, 1200);

    } catch (err) {
        console.error('Signup error:', err);
        signupInProgress = false;

        let errorMsg = '';
        const code = err.code || '';
        const msg = err.message || '';
        if (code === 'auth/email-already-in-use' || msg.includes('email-already')) {
            errorMsg = 'Email already registered. Please login instead.';
        } else if (code === 'auth/weak-password' || msg.includes('weak-password')) {
            errorMsg = 'Password is too weak. Use at least 6 characters.';
        } else if (code === 'auth/invalid-email') {
            errorMsg = 'Invalid email address.';
        } else {
            errorMsg = translateFirebaseError(err) || msg || 'Signup failed. Please try again.';
        }

        showToast(errorMsg, 'error');
        setLoading(submitBtn, false, 'Create Account');
        if (window.turnstile) turnstile.reset();
        document.getElementById('cfToken').value = '';
    }
});

// ============ Google Signup ============
document.getElementById('googleSignupBtn').addEventListener('click', async () => {
    try {
        const user = await signInGoogle();
        // Google accounts are already email-verified by Google itself
        if (user.emailVerified) {
            showToast('Signup successful! Redirecting...', 'success');
            setTimeout(() => { window.location.href = 'dashboard.html'; }, 1000);
        } else {
            // Very rare — Google should always give verified email
            showToast('Please verify your email.', 'warning');
        }
    } catch (err) {
        showToast(translateFirebaseError(err), 'error');
    }
});

function setLoading(btn, loading, text) {
    btn.disabled = loading;
    btn.innerHTML = loading
        ? '<span class="spinner"></span> ' + text
        : '<span>' + text + '</span>';
}
