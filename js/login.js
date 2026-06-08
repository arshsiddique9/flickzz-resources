// Login page script
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

form.addEventListener('submit', async (e) => {
    e.preventDefault();
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
