// login.js (Brevo API for forgot password)
import { signInEmail, signInGoogle, onAuthReady } from "./auth.js";
import { showToast, translateFirebaseError } from "./main.js";
import { auth, OWNER_EMAIL, isAdminEmail } from "./firebase-config.js";

// ... (login, google login code same as before) ...

// ✅ Forgot password with Brevo API (NO Firebase default)
document.getElementById('forgotPasswordLink').addEventListener('click', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    if (!email) {
        showToast('Enter your email address first', 'warning');
        return;
    }
    
    const link = e.target;
    const originalText = link.textContent;
    link.textContent = 'Sending...';
    link.style.pointerEvents = 'none';
    
    try {
        const res = await fetch('/api/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to send reset link');
        showToast('✅ Password reset link sent! Check your inbox/spam.', 'success');
        link.textContent = '✓ Sent!';
        setTimeout(() => {
            link.textContent = originalText;
            link.style.pointerEvents = 'auto';
        }, 4000);
    } catch (err) {
        showToast(err.message, 'error');
        link.textContent = originalText;
        link.style.pointerEvents = 'auto';
    }
});
