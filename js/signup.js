// ============================================
// FlickZZ Resources - Signup Script (6-DIGIT EMAIL VERIFICATION)
// ============================================
import { signUpEmail, signInGoogle } from "./auth.js";
import { showToast, translateFirebaseError } from "./main.js";
import { auth, db } from "./firebase-config.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

let signupInProgress = false;

onAuthStateChanged(auth, (user) => {
    if (signupInProgress) return;
    if (user && user.emailVerified) {
        window.location.href = 'dashboard.html';
    }
});

const form = document.getElementById('signupForm');
const submitBtn = document.getElementById('signupSubmit');

async function sendVerificationCode(email, code) {
    const response = await fetch('/api/send-verification-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code })
    });
    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to send verification email');
    }
}

form.addEventListener('submit', async (e) => {
    e.preventDefault();

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

    setLoading(submitBtn, true, 'Verifying...');
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
    signupInProgress = true;

    let createdUser = null;
    try {
        createdUser = await signUpEmail({ email, password, displayName });
        if (!createdUser || !createdUser.uid) throw new Error('No UID returned');

        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        await setDoc(doc(db, 'emailVerifications', createdUser.uid), {
            code: verificationCode,
            email: email,
            createdAt: serverTimestamp(),
            expiresAt: new Date(Date.now() + 60 * 60 * 1000)
        });

        try {
            await sendVerificationCode(email, verificationCode);
        } catch (emailErr) {
            console.error('Email send failed:', emailErr);
            showToast('Account created, but email sending failed. You can resend on next page.', 'warning');
        }

        showToast('Account created! Check your email for the 6-digit code.', 'success');
        const uidForRedirect = createdUser.uid;
        await signOut(auth);
        setTimeout(() => {
            window.location.href = `verify-email.html?uid=${uidForRedirect}&email=${encodeURIComponent(email)}`;
        }, 1200);

    } catch (err) {
        console.error('Signup error:', err);
        signupInProgress = false;
        let errorMsg = '';
        if (err.message.includes('email-already-exists')) errorMsg = 'Email already registered. Please login instead.';
        else if (err.message.includes('weak-password')) errorMsg = 'Password too weak. Use at least 6 characters.';
        else errorMsg = translateFirebaseError(err) || 'Signup failed. Please try again.';
        showToast(errorMsg, 'error');
        setLoading(submitBtn, false, 'Create Account');
        if (window.turnstile) turnstile.reset();
        document.getElementById('cfToken').value = '';
    }
});

document.getElementById('googleSignupBtn').addEventListener('click', async () => {
    try {
        const user = await signInGoogle();
        if (user.emailVerified) {
            showToast('Signup successful! Redirecting...', 'success');
            setTimeout(() => window.location.href = 'dashboard.html', 1000);
        } else {
            showToast('Please verify your email.', 'warning');
        }
    } catch (err) {
        showToast(translateFirebaseError(err), 'error');
    }
});

function setLoading(btn, loading, text) {
    btn.disabled = loading;
    btn.innerHTML = loading ? '<span class="spinner"></span> ' + text : '<span>' + text + '</span>';
}
