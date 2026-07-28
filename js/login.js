// login.js (Firebase built-in password reset)
import { signInEmail, signInGoogle, onAuthReady } from "./auth.js";
import { showToast, translateFirebaseError } from "./main.js";
import { getAuth, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { auth } from "./firebase-config.js";

// Redirect if already logged in and verified
onAuthReady((state) => {
  if (state.user && state.user.emailVerified) {
    const redirect = sessionStorage.getItem('redirectAfterLogin') || 'dashboard.html';
    sessionStorage.removeItem('redirectAfterLogin');
    window.location.href = redirect;
  } else if (state.user && !state.user.emailVerified) {
    showToast('Please verify your email first.', 'warning');
    auth.signOut();
  }
});

const form = document.getElementById('loginForm');
const submitBtn = document.getElementById('loginSubmit');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const token = document.getElementById('cfToken').value;
  if (!token) return showToast('Complete security check', 'warning');

  // Verify CAPTCHA
  // ...

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  setLoading(submitBtn, true, 'Logging in...');
  try {
    const user = await signInEmail({ email, password });
    if (!user.emailVerified) {
      showToast('Please verify your email before logging in.', 'warning');
      await auth.signOut();
      setLoading(submitBtn, false, 'Log In');
      if (window.turnstile) turnstile.reset();
      document.getElementById('cfToken').value = '';
      // Offer to resend verification
      if (confirm('Resend verification email?')) {
        await sendEmailVerification(user);
        showToast('Verification email resent!', 'success');
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

// Forgot password link
document.getElementById('forgotPasswordLink').addEventListener('click', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value.trim();
  if (!email) {
    showToast('Enter your email address first', 'warning');
    return;
  }
  const originalText = e.target.textContent;
  e.target.textContent = 'Sending...';
  e.target.style.pointerEvents = 'none';
  try {
    await sendPasswordResetEmail(auth, email);
    showToast('Password reset link sent! Check inbox/spam.', 'success');
  } catch (err) {
    showToast(translateFirebaseError(err), 'error');
  } finally {
    e.target.textContent = originalText;
    e.target.style.pointerEvents = 'auto';
  }
});

document.getElementById('googleLoginBtn').addEventListener('click', async () => {
  try {
    const user = await signInGoogle();
    if (!user.emailVerified) {
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
