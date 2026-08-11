import { signInEmail, signInGoogle, onAuthReady } from "./auth.js";
import { showToast, translateFirebaseError } from "./main.js";
import { sendPasswordResetEmail, sendEmailVerification } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { auth, OWNER_EMAIL, isAdminEmail } from "./firebase-config.js";

if (new URLSearchParams(location.search).get('verified') === '1') {
    setTimeout(() => showToast('✅ Email verified! Please log in.', 'success'), 300);
}

onAuthReady((state) => {
    if (!state.user) return;
    const isAdmin = isAdminEmail(state.user.email);
    if (state.user.emailVerified || isAdmin) {
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
        await fetch('/api/turnstile-verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token })
        });
    } catch (err) { console.warn('Turnstile skipped'); }

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    setLoading(submitBtn, true, 'Logging in...');
    try {
        const user = await signInEmail({ email, password });
        const isAdmin = isAdminEmail(user.email);

        if (!user.emailVerified && !isAdmin) {
            showToast('Please verify your email before logging in.', 'warning');
            sessionStorage.setItem('pendingVerifyEmail', email);
            await auth.signOut();
            setLoading(submitBtn, false, 'Log In');
            setTimeout(() => window.location.href = 'verify-email.html', 1200);
            return;
        }

        showToast(isAdmin ? '👑 Welcome back, Owner!' : 'Welcome back!', 'success');
        setTimeout(() => {
            window.location.href = isAdmin ? 'flickzz-control-panel-x7k.html' : 'dashboard.html';
        }, 700);
    } catch (err) {
        showToast(translateFirebaseError(err), 'error');
        setLoading(submitBtn, false, 'Log In');
    }
});

document.getElementById('forgotPasswordLink')?.addEventListener('click', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    if (!email) { showToast('Enter your email first', 'warning'); return; }
    try {
        await sendPasswordResetEmail(auth, email);
        showToast('Password reset link sent!', 'success');
    } catch (err) {
        showToast(translateFirebaseError(err), 'error');
    }
});

document.getElementById('googleLoginBtn')?.addEventListener('click', async () => {
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
