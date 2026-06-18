// ============================================
// FlickZZ Resources - Login Script (FIXED)
// Owner: Arsh Siddique © 2026
// ============================================
// Cloudflare Turnstile + Email Verified Check + Forgot Password

import { signInEmail, signInGoogle, onAuthReady } from "./auth.js";
import { showToast, translateFirebaseError } from "./main.js";

// Redirect if already logged in and verified
onAuthReady((state) => {
    if (state.user && state.user.emailVerified) {
        const redirect = sessionStorage.getItem('redirectAfterLogin') || 'dashboard.html';
        sessionStorage.removeItem('redirectAfterLogin');
        window.location.href = redirect;
    } else if (state.user && !state.user.emailVerified) {
        showToast('Please verify your email first. Check your inbox for 6-digit code.', 'warning');
        auth.signOut();
    }
});

const form = document.getElementById('loginForm');
const submitBtn = document.getElementById('loginSubmit');
const forgotLink = document.getElementById('forgotPasswordLink');

// ============ LOGIN ============
form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const token = document.getElementById('cfToken').value;
    if (!token) {
        showToast('Please complete the security check', 'warning');
        return;
    }

    setLoading(submitBtn, true, 'Verifying...');

    // Turnstile verify
    try {
        const res = await fetch('/api/turnstile-verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Verification failed');
    } catch (err) {
        showToast(err.message || 'Security check failed', 'error');
        setLoading(submitBtn, false, 'Log In');
        if (window.turnstile) turnstile.reset();
        document.getElementById('cfToken').value = '';
        return;
    }

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    setLoading(submitBtn, true, 'Logging in...');
    try {
        const user = await signInEmail({ email, password });

        if (!user.emailVerified) {
            showToast('Please verify your email before logging in.', 'warning');
            await auth.signOut();
            setLoading(submitBtn, false, 'Log In');
            if (window.turnstile) turnstile.reset();
            document.getElementById('cfToken').value = '';
            // Offer to take them to verify-email.html
            setTimeout(() => {
                if (confirm('Open verification page now?')) {
                    window.location.href = `verify-email.html?uid=${user.uid}&email=${encodeURIComponent(email)}`;
                }
            }, 500);
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

// ============ GOOGLE LOGIN ============
document.getElementById('googleLoginBtn').addEventListener('click', async () => {
    try {
        const user = await signInGoogle();
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

// ============ FORGOT PASSWORD (CUSTOM ENDPOINT) ============
// Uses custom /api/forgot-password endpoint for better control and custom email template
forgotLink.addEventListener('click', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value.trim();
    if (!email) {
        showToast('Enter your email address in the Email field first, then click Forgot password.', 'warning');
        document.getElementById('email').focus();
        return;
    }
    
    // Simple email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showToast('Please enter a valid email address.', 'warning');
        return;
    }

    // Use the forgot link itself as loading indicator
    const originalText = forgotLink.textContent;
    forgotLink.style.pointerEvents = 'none';
    forgotLink.textContent = 'Sending reset link...';

    try {
        const res = await fetch('/api/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        const data = await res.json();
        
        if (!res.ok) {
            throw new Error(data.error || 'Failed to send reset email');
        }

        showToast('✅ Password reset link sent! Check your inbox (and spam folder).', 'success');
        forgotLink.textContent = '✓ Email sent';
        setTimeout(() => {
            forgotLink.textContent = originalText;
            forgotLink.style.pointerEvents = 'auto';
        }, 4000);
    } catch (err) {
        console.error('Password reset error:', err);
        showToast(err.message || 'Failed to send reset email', 'error');
        forgotLink.textContent = originalText;
        forgotLink.style.pointerEvents = 'auto';
    }
});

function setLoading(btn, loading, text) {
    btn.disabled = loading;
    btn.innerHTML = loading
        ? '<span class="spinner"></span> ' + text
        : '<span>' + text + '</span>';
}
