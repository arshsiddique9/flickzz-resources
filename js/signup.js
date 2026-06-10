// Signup page script with Cloudflare Turnstile
import { signUpEmail, signInGoogle, onAuthReady } from "./auth.js";
import { showToast, translateFirebaseError } from "./main.js";

onAuthReady((state) => {
    if (state.user) {
        window.location.href = 'dashboard.html';
    }
});

const form = document.getElementById('signupForm');
const submitBtn = document.getElementById('signupSubmit');

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Check terms
    const terms = document.getElementById('termsCheck').checked;
    if (!terms) {
        showToast('You must accept the Terms and Privacy Policy', 'warning');
        return;
    }

    // Get CAPTCHA token
    const token = document.getElementById('cfToken').value;
    if (!token) {
        showToast('Please complete the security check', 'warning');
        return;
    }

    setLoading(submitBtn, true, 'Verifying...');

    // Verify CAPTCHA token
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
        setLoading(submitBtn, false, 'Create Account');
        if (window.turnstile) turnstile.reset();
        document.getElementById('cfToken').value = '';
        return;
    }

    if (!verified) return;

    // Firebase signup
    const displayName = document.getElementById('displayName').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    setLoading(submitBtn, true, 'Creating account...');
    try {
        await signUpEmail({ email, password, displayName });
        showToast('Account created! Welcome to FlickZZ 🎉', 'success');
        setTimeout(() => { window.location.href = 'dashboard.html'; }, 900);
    } catch (err) {
        showToast(translateFirebaseError(err), 'error');
        setLoading(submitBtn, false, 'Create Account');
        if (window.turnstile) turnstile.reset();
        document.getElementById('cfToken').value = '';
    }
});

document.getElementById('googleSignupBtn').addEventListener('click', async () => {
    try {
        await signInGoogle();
        showToast('Account created! Welcome 🎉', 'success');
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
