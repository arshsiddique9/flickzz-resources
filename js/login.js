// Login page script with Cloudflare Turnstile + Forgot Password
import { signInEmail, signInGoogle, onAuthReady } from "./auth.js";
import { showToast, translateFirebaseError } from "./main.js";
import { getAuth, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { auth } from "./firebase-config.js";

// Redirect if already logged in
onAuthReady((state) => {
    if (state.user) {
        const redirect = sessionStorage.getItem('redirectAfterLogin') || 'dashboard.html';
        sessionStorage.removeItem('redirectAfterLogin');
        window.location.href = redirect;
    }
});

const form = document.getElementById('loginForm');
const submitBtn = document.getElementById('loginSubmit');

// Turnstile success callback already defined in HTML (onTurnstileSuccess)

// ========== LOGIN SUBMIT ==========
form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Get CAPTCHA token from hidden input
    const token = document.getElementById('cfToken').value;
    if (!token) {
        showToast('Please complete the security check', 'warning');
        return;
    }

    setLoading(submitBtn, true, 'Verifying...');

    // Step 1: Verify CAPTCHA token with backend
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
        showToast(err.message || 'Security check failed. Please refresh and try again.', 'error');
        setLoading(submitBtn, false, 'Log In');
        // Reset CAPTCHA widget
        if (window.turnstile) turnstile.reset();
        document.getElementById('cfToken').value = '';
        return;
    }

    if (!verified) return;

    // Step 2: Firebase login
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    setLoading(submitBtn, true, 'Logging in...');
    try {
        await signInEmail({ email, password });
        showToast('Welcome back! Redirecting...', 'success');
        setTimeout(() => {
            const redirect = sessionStorage.getItem('redirectAfterLogin') || 'dashboard.html';
            sessionStorage.removeItem('redirectAfterLogin');
            window.location.href = redirect;
        }, 800);
    } catch (err) {
        showToast(translateFirebaseError(err), 'error');
        setLoading(submitBtn, false, 'Log In');
        // Reset CAPTCHA on failure
        if (window.turnstile) turnstile.reset();
        document.getElementById('cfToken').value = '';
    }
});

// ========== GOOGLE LOGIN ==========
document.getElementById('googleLoginBtn').addEventListener('click', async () => {
    try {
        await signInGoogle();
        showToast('Welcome! Redirecting...', 'success');
        setTimeout(() => { window.location.href = 'dashboard.html'; }, 800);
    } catch (err) {
        showToast(translateFirebaseError(err), 'error');
    }
});

// ========== FORGOT PASSWORD ==========
document.getElementById('forgotPasswordLink').addEventListener('click', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    if (!email) {
        showToast('Please enter your email address first', 'warning');
        return;
    }
    setLoading(submitBtn, true, 'Sending reset link...');
    try {
        await sendPasswordResetEmail(auth, email);
        showToast('Password reset link sent! Check your inbox/spam folder.', 'success');
    } catch (err) {
        showToast(translateFirebaseError(err), 'error');
    } finally {
        setLoading(submitBtn, false, 'Log In');
    }
});

// ========== HELPER ==========
function setLoading(btn, loading, text) {
    btn.disabled = loading;
    btn.innerHTML = loading
        ? '<span class="spinner"></span> ' + text
        : '<span>' + text + '</span>';
}
