// Login page script with Cloudflare Turnstile
import { signInEmail, signInGoogle, onAuthReady } from "./auth.js";
import { showToast, translateFirebaseError } from "./main.js";

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

document.getElementById('googleLoginBtn').addEventListener('click', async () => {
    try {
        await signInGoogle();
        showToast('Welcome! Redirecting...', 'success');
        setTimeout(() => { window.location.href = 'dashboard.html'; }, 800);
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
