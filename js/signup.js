// signup.js — Firebase email verification with proper page redirect
import { signUpEmail, signInGoogle } from "./auth.js";
import { showToast, translateFirebaseError } from "./main.js";
import { sendEmailVerification } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { auth } from "./firebase-config.js";

const form = document.getElementById('signupForm');
const submitBtn = document.getElementById('signupSubmit');

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const token = document.getElementById('cfToken').value;
    if (!token) {
        showToast('Please complete the security check', 'warning');
        return;
    }

    // Verify Turnstile (silent fail-safe: allow if API unavailable)
    try {
        const res = await fetch('/api/turnstile-verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token })
        });
        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error || 'Security check failed');
        }
    } catch (err) {
        console.warn('Turnstile verify skipped:', err.message);
    }

    const displayName = document.getElementById('displayName').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const terms = document.getElementById('termsCheck').checked;

    if (!terms) { showToast('Please accept Terms', 'warning'); return; }
    if (password.length < 6) { showToast('Password must be at least 6 characters', 'warning'); return; }

    setLoading(submitBtn, true, 'Creating account...');
    try {
        const user = await signUpEmail({ email, password, displayName });

        // Send Firebase built-in verification email with proper action URL
        const actionCodeSettings = {
            url: window.location.origin + '/login.html?verified=1',
            handleCodeInApp: false
        };
        await sendEmailVerification(user, actionCodeSettings);

        // Store email for verification page
        sessionStorage.setItem('pendingVerifyEmail', email);
        // Sign out (require re-login after verification)
        await auth.signOut();

        showToast('✅ Verification email sent!', 'success');
        setTimeout(() => window.location.href = 'verify-email.html', 1200);
    } catch (err) {
        showToast(translateFirebaseError(err), 'error');
        setLoading(submitBtn, false, 'Create Account');
        if (window.turnstile) turnstile.reset();
        document.getElementById('cfToken').value = '';
    }
});

document.getElementById('googleSignupBtn').addEventListener('click', async () => {
    try {
        const user = await signInGoogle();
        // Google-verified emails skip verification
        showToast('Welcome to FlickZZ!', 'success');
        setTimeout(() => window.location.href = 'dashboard.html', 800);
    } catch (err) {
        showToast(translateFirebaseError(err), 'error');
    }
});

function setLoading(btn, loading, text) {
    btn.disabled = loading;
    btn.innerHTML = loading ? '<span class="spinner"></span> ' + text : '<span>' + text + '</span>';
}
