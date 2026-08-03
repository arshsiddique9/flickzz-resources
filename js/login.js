// login.js — Firebase built-in verification + admin auto-entry
import { signInEmail, signInGoogle, onAuthReady } from "./auth.js";
import { showToast, translateFirebaseError } from "./main.js";
import { sendPasswordResetEmail, sendEmailVerification } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { auth, OWNER_EMAIL, isAdminEmail } from "./firebase-config.js";

// Show success toast if user came back after email verification
if (new URLSearchParams(location.search).get('verified') === '1') {
    setTimeout(() => showToast('✅ Email verified! Please log in.', 'success'), 300);
}

// Redirect if already logged in
onAuthReady((state) => {
    if (!state.user) return;
    const isAdmin = isAdminEmail(state.user.email);
    if (state.user.emailVerified || isAdmin) {
        // Admin → straight to control panel
        if (isAdmin) {
            window.location.href = 'flickzz-control-panel-x7k.html';
            return;
        }
        const redirect = sessionStorage.getItem('redirectAfterLogin') || 'dashboard.html';
        sessionStorage.removeItem('redirectAfterLogin');
        window.location.href = redirect;
    } else {
        showToast('Please verify your email first.', 'warning');
        auth.signOut();
    }
});

const form = document.getElementById('loginForm');
const submitBtn = document.getElementById('loginSubmit');

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const token = document.getElementById('cfToken').value;
    if (!token) { showToast('Please complete security check', 'warning'); return; }

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

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    setLoading(submitBtn, true, 'Logging in...');
    try {
        const user = await signInEmail({ email, password });
        const isAdmin = isAdminEmail(user.email);

        // Admin skips email verification
        if (!user.emailVerified && !isAdmin) {
            showToast('Please verify your email before logging in.', 'warning');
            sessionStorage.setItem('pendingVerifyEmail', email);
            await auth.signOut();
            setLoading(submitBtn, false, 'Log In');
            if (window.turnstile) turnstile.reset();
            document.getElementById('cfToken').value = '';
            setTimeout(() => window.location.href = 'verify-email.html', 1200);
            return;
        }

        showToast(isAdmin ? '👑 Welcome back, Owner!' : 'Welcome back!', 'success');
        setTimeout(() => {
            if (isAdmin) {
                window.location.href = 'flickzz-control-panel-x7k.html';
            } else {
                const redirect = sessionStorage.getItem('redirectAfterLogin') || 'dashboard.html';
                sessionStorage.removeItem('redirectAfterLogin');
                window.location.href = redirect;
            }
        }, 700);
    } catch (err) {
        showToast(translateFirebaseError(err), 'error');
        setLoading(submitBtn, false, 'Log In');
        if (window.turnstile) turnstile.reset();
        document.getElementById('cfToken').value = '';
    }
});

// Forgot password
document.getElementById('forgotPasswordLink').addEventListener('click', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    if (!email) { showToast('Enter your email first', 'warning'); document.getElementById('email').focus(); return; }
    const link = e.target;
    const original = link.textContent;
    link.textContent = 'Sending...';
    link.style.pointerEvents = 'none';
    try {
        await sendPasswordResetEmail(auth, email, {
            url: window.location.origin + '/login.html',
            handleCodeInApp: false
        });
        showToast('✅ Password reset link sent!', 'success');
        link.textContent = '✓ Sent!';
        setTimeout(() => { link.textContent = original; link.style.pointerEvents = 'auto'; }, 4000);
    } catch (err) {
        showToast(translateFirebaseError(err), 'error');
        link.textContent = original;
        link.style.pointerEvents = 'auto';
    }
});

// Google login
document.getElementById('googleLoginBtn').addEventListener('click', async () => {
    try {
        const user = await signInGoogle();
        const isAdmin = isAdminEmail(user.email);
        showToast(isAdmin ? '👑 Welcome, Owner!' : 'Welcome!', 'success');
        setTimeout(() => {
            window.location.href = isAdmin ? 'flickzz-control-panel-x7k.html' : 'dashboard.html';
        }, 700);
    } catch (err) {
        showToast(translateFirebaseError(err), 'error');
    }
});

function setLoading(btn, loading, text) {
    btn.disabled = loading;
    btn.innerHTML = loading ? '<span class="spinner"></span> ' + text : '<span>' + text + '</span>';
}
