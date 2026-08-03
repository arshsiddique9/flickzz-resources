// login.js (OTP Plus for forgot password)
import { signInEmail, signInGoogle, onAuthReady } from "./auth.js";
import { showToast, translateFirebaseError } from "./main.js";
import { getAuth, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { auth } from "./firebase-config.js";

// ... (rest same as before, forgot password uses Firebase built-in or OTP Plus)

// Forgot password link – using Firebase built-in (reliable)
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
