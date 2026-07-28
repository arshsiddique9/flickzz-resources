// login.js (Firebase built-in – Admin skip verification)
import { signInEmail, signInGoogle, onAuthReady } from "./auth.js";
import { showToast, translateFirebaseError } from "./main.js";
import { getAuth, sendPasswordResetEmail, sendEmailVerification } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { auth, OWNER_EMAIL } from "./firebase-config.js";

// Redirect if already logged in
onAuthReady((state) => {
    if (state.user && state.user.emailVerified) {
        const redirect = sessionStorage.getItem('redirectAfterLogin') || 'dashboard.html';
        sessionStorage.removeItem('redirectAfterLogin');
        window.location.href = redirect;
    } else if (state.user && !state.user.emailVerified) {
        // Admin ko verification skip
        if (state.user.email === OWNER_EMAIL) {
            // Admin ke liye verified maano
            const redirect = sessionStorage.getItem('redirectAfterLogin') || 'dashboard.html';
            sessionStorage.removeItem('redirectAfterLogin');
            window.location.href = redirect;
            return;
        }
        showToast('Please verify your email first.', 'warning');
        auth.signOut();
    }
});

const form = document.getElementById('loginForm');
const submitBtn = document.getElementById('loginSubmit');

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const token = document.getElementById('cfToken').value;
    if (!token) {
        showToast('Complete security check', 'warning');
        return;
    }

    // Verify CAPTCHA
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

    setLoading(submitBtn, true, 'Logging in...');
    try {
        const user = await signInEmail({ email, password });
        
        const isAdmin = user.email === OWNER_EMAIL;
        
        if (!user.emailVerified && !isAdmin) {
            showToast('Please verify your email before logging in.', 'warning');
            await auth.signOut();
            setLoading(submitBtn, false, 'Log In');
            if (window.turnstile) turnstile.reset();
            document.getElementById('cfToken').value = '';
            if (confirm('Resend verification email?')) {
                await sendEmailVerification(user);
                showToast('Verification email resent! Check inbox/spam.', 'success');
            }
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

// ✅ Forgot Password – Firebase Built-in (NO custom API)
document.getElementById('forgotPasswordLink').addEventListener('click', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    if (!email) {
        showToast('Enter your email address first', 'warning');
        document.getElementById('email').focus();
        return;
    }
    const link = e.target;
    const originalText = link.textContent;
    link.textContent = 'Sending...';
    link.style.pointerEvents = 'none';
    try {
        await sendPasswordResetEmail(auth, email);
        showToast('Password reset link sent! Check inbox/spam.', 'success');
        link.textContent = '✓ Sent!';
        setTimeout(() => {
            link.textContent = originalText;
            link.style.pointerEvents = 'auto';
        }, 4000);
    } catch (err) {
        showToast(translateFirebaseError(err), 'error');
        link.textContent = originalText;
        link.style.pointerEvents = 'auto';
    }
});

// ============ GOOGLE LOGIN ============
document.getElementById('googleLoginBtn').addEventListener('click', async () => {
    try {
        const user = await signInGoogle();
        const isAdmin = user.email === OWNER_EMAIL;
        if (!user.emailVerified && !isAdmin) {
            showToast('Please verify your email first.', 'warning');
            await auth.signOut();
            return;
        }
        showToast('Welcome! Redirecting...', 'success');
        setTimeout(() => window.location.href = 'dashboard.html', 800);
    } catch (err) {
        showToast(translateFirebaseError(err), 'error');
    }
});

function setLoading(btn, loading, text) {
    btn.disabled = loading;
    btn.innerHTML = loading ? '<span class="spinner"></span> ' + text : '<span>' + text + '</span>';
}
