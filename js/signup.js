// Signup page script
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
    const displayName = document.getElementById('displayName').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const terms = document.getElementById('termsCheck').checked;

    if (!terms) {
        showToast('You must accept the Terms and Privacy Policy', 'warning');
        return;
    }

    setLoading(submitBtn, true, 'Creating account...');
    try {
        await signUpEmail({ email, password, displayName });
        showToast('Account created! Welcome to FlickZZ 🎉', 'success');
        setTimeout(() => { window.location.href = 'dashboard.html'; }, 900);
    } catch (err) {
        showToast(translateFirebaseError(err), 'error');
        setLoading(submitBtn, false, 'Create Account');
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
