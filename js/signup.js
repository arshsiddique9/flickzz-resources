// Signup page script with 6-digit email verification via Brevo
import { signUpEmail, signInGoogle, onAuthReady } from "./auth.js";
import { showToast, translateFirebaseError } from "./main.js";
import { getAuth, sendEmailVerification } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { auth, db } from "./firebase-config.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

onAuthReady((state) => {
    if (state.user && state.user.emailVerified) {
        window.location.href = 'dashboard.html';
    } else if (state.user && !state.user.emailVerified) {
        showToast('Please verify your email. Check your inbox for 6-digit code.', 'warning');
    }
});

const form = document.getElementById('signupForm');
const submitBtn = document.getElementById('signupSubmit');

async function sendVerificationCode(email, code) {
    const response = await fetch('/api/send-verification-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code })
    });
    if (!response.ok) throw new Error('Failed to send verification email');
    return await response.json();
}

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
        // Create user
        const userCred = await signUpEmail({ email, password, displayName });
        const user = userCred.user;

        // Generate 6-digit code
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Store code in Firestore (expires in 1 hour)
        await setDoc(doc(db, 'emailVerifications', user.uid), {
            code: verificationCode,
            email: email,
            createdAt: serverTimestamp(),
            expiresAt: new Date(Date.now() + 60 * 60 * 1000)
        });

        // Send email via Brevo
        await sendVerificationCode(email, verificationCode);
        
        showToast('Account created! Verification email sent with 6-digit code.', 'success');
        
        // Redirect to verification page
        setTimeout(() => {
            window.location.href = `verify-email.html?uid=${user.uid}`;
        }, 2000);
        
    } catch (err) {
        showToast(translateFirebaseError(err), 'error');
        setLoading(submitBtn, false, 'Create Account');
    }
});

document.getElementById('googleSignupBtn').addEventListener('click', async () => {
    try {
        const userCred = await signInGoogle();
        showToast('Google signup successful! Please check email for verification.', 'success');
        setTimeout(() => { window.location.href = 'login.html'; }, 1500);
    } catch (err) {
        showToast(translateFirebaseError(err), 'error');
    }
});

function setLoading(btn, loading, text) {
    btn.disabled = loading;
    btn.innerHTML = loading ? '<span class="spinner"></span> ' + text : '<span>' + text + '</span>';
}
