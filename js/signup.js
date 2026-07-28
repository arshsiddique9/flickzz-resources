// signup.js (Firebase built-in verification)
import { signUpEmail, signInGoogle } from "./auth.js";
import { showToast, translateFirebaseError } from "./main.js";
import { getAuth, sendEmailVerification } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { auth } from "./firebase-config.js";

const form = document.getElementById('signupForm');
const submitBtn = document.getElementById('signupSubmit');

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

    const displayName = document.getElementById('displayName').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const terms = document.getElementById('termsCheck').checked;

    if (!terms) {
        showToast('Accept Terms', 'warning');
        return;
    }
    if (password.length < 6) {
        showToast('Password must be at least 6 characters', 'warning');
        return;
    }

    setLoading(submitBtn, true, 'Creating account...');
    try {
        const user = await signUpEmail({ email, password, displayName });
        await sendEmailVerification(user);
        await auth.signOut();
        showToast('Verification email sent! Check inbox/spam.', 'success');
        setTimeout(() => window.location.href = 'login.html?verified=pending', 2500);
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
        if (user.emailVerified) {
            showToast('Signup successful!', 'success');
            setTimeout(() => window.location.href = 'dashboard.html', 1000);
        } else {
            await sendEmailVerification(user);
            showToast('Verification email sent!', 'success');
            await auth.signOut();
            setTimeout(() => window.location.href = 'login.html', 1500);
        }
    } catch (err) {
        showToast(translateFirebaseError(err), 'error');
    }
});

function setLoading(btn, loading, text) {
    btn.disabled = loading;
    btn.innerHTML = loading ? '<span class="spinner"></span> ' + text : '<span>' + text + '</span>';
}
