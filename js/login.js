// Login page script with Cloudflare Turnstile + Email Verified Check
import { signInEmail, signInGoogle, onAuthReady } from "./auth.js";
import { showToast, translateFirebaseError } from "./main.js";
import { getAuth, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { auth } from "./firebase-config.js";

// Redirect if already logged in and verified
onAuthReady((state) => {
    if (state.user && state.user.emailVerified) {
        const redirect = sessionStorage.getItem('redirectAfterLogin') || 'dashboard.html';
        sessionStorage.removeItem('redirectAfterLogin');
        window.location.href = redirect;
    } else if (state.user && !state.user.emailVerified) {
        showToast('Please verify your email first. Check your inbox for 6-digit code.', 'warning');
        // Optionally sign out
        auth.signOut();
    }
});

const form = document.getElementById('loginForm');
const submitBtn = document.getElementById('loginSubmit');

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // CAPTCHA check (same as before)
    const token = document.getElementById('cfToken').value;
    if (!token) {
        showToast('Please complete the security check', 'warning');
        return;
    }

    setLoading(submitBtn, true, 'Verifying...');

    let verified = false;
    try {
        const res = await fetch('/api/turnstile-verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Verification failed');
        verified = true;
    } catch (err) {
        showToast(err.message || 'Security check failed', 'error');
        setLoading(submitBtn, false, 'Log In');
        if (window.turnstile) turnstile.reset();
        document.getElementById('cfToken').value = '';
        return;
    }

    if (!verified) return;

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    setLoading(submitBtn, true, 'Logging in...');
    try {
        const userCred = await signInEmail({ email, password });
        const user = userCred.user;

        // ✅ Check if email is verified
        if (!user.emailVerified) {
            showToast('Please verify your email before logging in. Check your inbox for 6-digit code.', 'warning');
            await auth.signOut();
            setLoading(submitBtn, false, 'Log In');
            if (window.turnstile) turnstile.reset();
            document.getElementById('cfToken').value = '';
            return;
        }

        showToast('Welcome back! Redirecting...', 'success');
        setTimeout(() => {
            const redirect = sessionStorage.getItem('redirectAfterLogin') || 'dashboard.html';
            sessionStorage.removeItem('redirectAfterLogin');
            window.location.href = redirect;
        }, 800);
    } catch (err) {
        showToast(translateFirebaseError(err), 'error');
        setLoading(submitBtn, false, 'Log In');
        if (window.turnstile) turnstile.reset();
        document.getElementById('cfToken').value = '';
    }
});

// Google login check
document.getElementById('googleLoginBtn').addEventListener('click', async () => {
    try {
        const userCred = await signInGoogle();
        const user = userCred.user;
        if (!user.emailVerified) {
            showToast('Please verify your email first.', 'warning');
            await auth.signOut();
            return;
        }
        showToast('Welcome! Redirecting...', 'success');
        setTimeout(() => { window.location.href = 'dashboard.html'; }, 800);
    } catch (err) {
        showToast(translateFirebaseError(err), 'error');
    }
});

// Forgot password
document.getElementById('forgotPasswordLink').addEventListener('click', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    if (!email) {
        showToast('Enter your email address first', 'warning');
        return;
    }
    setLoading(submitBtn, true, 'Sending reset link...');
    try {
        await sendPasswordResetEmail(auth, email);
        showToast('Password reset link sent!', 'success');
    } catch (err) {
        showToast(translateFirebaseError(err), 'error');
    } finally {
        setLoading(submitBtn, false, 'Log In');
    }
});

function setLoading(btn, loading, text) {
    btn.disabled = loading;
    btn.innerHTML = loading ? '<span class="spinner"></span> ' + text : '<span>' + text + '</span>';
}
