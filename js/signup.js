// Signup page script with Email Verification
import { signUpEmail, signInGoogle, onAuthReady } from "./auth.js";
import { showToast, translateFirebaseError } from "./main.js";
import { getAuth, sendEmailVerification } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { auth } from "./firebase-config.js";

onAuthReady((state) => {
    if (state.user && state.user.emailVerified) {
        // Already verified user goes to dashboard
        window.location.href = 'dashboard.html';
    } else if (state.user && !state.user.emailVerified) {
        // User exists but not verified – show verification message
        showToast('Please verify your email first. Check your inbox.', 'warning');
        // Optional: redirect to a "verify email" page
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
        // Step 1: Create user
        const userCred = await signUpEmail({ email, password, displayName });
        const user = userCred.user;

        // Step 2: Send email verification
        await sendEmailVerification(user);
        
        showToast('Account created! Verification email sent. Please verify to login.', 'success');
        
        // Step 3: Redirect to login page after 3 seconds
        setTimeout(() => {
            window.location.href = 'login.html?pending_verification=1';
        }, 3000);
        
    } catch (err) {
        showToast(translateFirebaseError(err), 'error');
        setLoading(submitBtn, false, 'Create Account');
    }
});

document.getElementById('googleSignupBtn').addEventListener('click', async () => {
    try {
        const userCred = await signInGoogle();
        const user = userCred.user;
        if (user && !user.emailVerified) {
            // Force send verification for Google sign-in as well
            await sendEmailVerification(user);
            showToast('Please verify your email. Check your inbox.', 'warning');
            await signOut(auth); // sign out until verified
        }
        setTimeout(() => { window.location.href = 'login.html'; }, 1500);
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
