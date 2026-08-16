// login.js (Brevo API for forgot password + Full Login Logic)
import { signInEmail, signInGoogle, onAuthReady } from "./auth.js";
import { showToast, translateFirebaseError } from "./main.js";
import { auth, OWNER_EMAIL, isAdminEmail } from "./firebase-config.js";
import { sendEmailVerification } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// ============ REDIRECT IF ALREADY LOGGED IN ============
onAuthReady((state) => {
    if (!state.user) return;
    const isAdmin = isAdminEmail(state.user.email);
    if (state.user.emailVerified || isAdmin) {
        const redirect = isAdmin
            ? 'flickzz-control-panel-x7k.html'
            : sessionStorage.getItem('redirectAfterLogin') || 'dashboard.html';
        sessionStorage.removeItem('redirectAfterLogin');
        window.location.href = redirect;
    } else {
        // User exists but not verified – show message and sign out
        showToast('Please verify your email before logging in.', 'warning');
        sessionStorage.setItem('pendingVerifyEmail', state.user.email);
        auth.signOut();
        // Redirect to verify-email page after signout
        setTimeout(() => {
            window.location.href = `verify-email.html?uid=${state.user.uid}&email=${encodeURIComponent(state.user.email)}`;
        }, 1200);
    }
});

// ============ DOM REFS ============
const form = document.getElementById('loginForm');
const submitBtn = document.getElementById('loginSubmit');
const forgotLink = document.getElementById('forgotPasswordLink');

// ============ LOGIN SUBMIT ============
form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // CAPTCHA token check
    const token = document.getElementById('cfToken')?.value;
    if (!token) {
        showToast('Please complete the security check', 'warning');
        return;
    }

    // Verify Turnstile CAPTCHA
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
        if (window.turnstile) turnstile.reset();
        document.getElementById('cfToken').value = '';
        return;
    }

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    if (!email || !password) {
        showToast('Please fill in all fields', 'warning');
        return;
    }

    setLoading(submitBtn, true, 'Logging in...');

    try {
        const user = await signInEmail({ email, password });
        const isAdmin = isAdminEmail(user.email);

        // Check if email is verified (admins skip this check)
        if (!user.emailVerified && !isAdmin) {
            showToast('Your email is not verified. Please check your inbox.', 'warning');
            // Send verification email again
            await sendEmailVerification(user);
            showToast('Verification email resent. Please verify and try again.', 'success');
            await auth.signOut();
            setLoading(submitBtn, false, 'Log In');
            return;
        }

        // Success – redirect
        showToast(isAdmin ? 'Welcome back, Owner' : 'Welcome back!', 'success');
        setTimeout(() => {
            const redirect = isAdmin
                ? 'flickzz-control-panel-x7k.html'
                : sessionStorage.getItem('redirectAfterLogin') || 'dashboard.html';
            sessionStorage.removeItem('redirectAfterLogin');
            window.location.href = redirect;
        }, 800);

    } catch (err) {
        console.error('Login error:', err);
        showToast(translateFirebaseError(err), 'error');
        setLoading(submitBtn, false, 'Log In');
        if (window.turnstile) turnstile.reset();
        document.getElementById('cfToken').value = '';
    }
});

// ============ GOOGLE LOGIN ============
document.getElementById('googleLoginBtn')?.addEventListener('click', async () => {
    try {
        const user = await signInGoogle();
        const isAdmin = isAdminEmail(user.email);
        if (!user.emailVerified && !isAdmin) {
            showToast('Your email is not verified. Please verify via Google first.', 'warning');
            await auth.signOut();
            return;
        }
        showToast(isAdmin ? 'Welcome, Owner' : 'Welcome!', 'success');
        setTimeout(() => {
            const redirect = isAdmin
                ? 'flickzz-control-panel-x7k.html'
                : sessionStorage.getItem('redirectAfterLogin') || 'dashboard.html';
            sessionStorage.removeItem('redirectAfterLogin');
            window.location.href = redirect;
        }, 800);
    } catch (err) {
        showToast(translateFirebaseError(err), 'error');
    }
});

// ============ FORGOT PASSWORD (CUSTOM BREVO API) ============
forgotLink?.addEventListener('click', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    if (!email) {
        showToast('Please enter your email address first', 'warning');
        document.getElementById('email').focus();
        return;
    }

    const originalText = forgotLink.textContent;
    forgotLink.textContent = 'Sending...';
    forgotLink.style.pointerEvents = 'none';

    try {
        const res = await fetch('/api/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to send reset link');

        showToast('Password reset link sent to your email.', 'success');
        forgotLink.textContent = 'Sent';
        setTimeout(() => {
            forgotLink.textContent = originalText;
            forgotLink.style.pointerEvents = 'auto';
        }, 4000);
    } catch (err) {
        showToast(err.message || 'Could not send reset link', 'error');
        forgotLink.textContent = originalText;
        forgotLink.style.pointerEvents = 'auto';
    }
});

// ============ HELPER FUNCTIONS ============
function setLoading(btn, loading, text) {
    btn.disabled = loading;
    btn.innerHTML = loading
        ? '<span class="spinner"></span> ' + text
        : '<span>' + text + '</span>';
}
