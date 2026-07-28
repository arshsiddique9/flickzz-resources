// login.js (Firebase built-in password reset + Admin Skip Email Verification)
import { signInEmail, signInGoogle, onAuthReady } from "./auth.js";
import { showToast, translateFirebaseError } from "./main.js";
import { getAuth, sendPasswordResetEmail, sendEmailVerification } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { auth, OWNER_EMAIL } from "./firebase-config.js";

// Redirect if already logged in and verified (Admin ko skip)
onAuthReady((state) => {
  if (state.user) {
    const isAdmin = state.user.email === OWNER_EMAIL;
    if (state.user.emailVerified || isAdmin) {
      const redirect = sessionStorage.getItem('redirectAfterLogin') || 'dashboard.html';
      sessionStorage.removeItem('redirectAfterLogin');
      window.location.href = redirect;
    } else {
      showToast('Please verify your email first.', 'warning');
      auth.signOut();
    }
  }
});

const form = document.getElementById('loginForm');
const submitBtn = document.getElementById('loginSubmit');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const token = document.getElementById('cfToken').value;
  if (!token) return showToast('Complete security check', 'warning');

  // CAPTCHA verification
  let verified = false;
  try {
    const res = await fetch('/api/turnstile-verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Verification failed');
    verified = true;
  } catch (err) {
    showToast(err.message || 'Security check failed', 'error');
    setLoading(submitBtn, false, 'Log In');
    if (window.turnstile) turnstile.reset();
    document.getElementById('cfToken').value = '';
    return;
  }

  if (!verified) return;

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  setLoading(submitBtn, true, 'Logging in...');
  try {
    const user = await signInEmail({ email, password });
    
    // ✅ Admin skip email verification
    const isAdmin = user.email === OWNER_EMAIL;
    
    if (!user.emailVerified && !isAdmin) {
      showToast('Please verify your email before logging in.', 'warning');
      await auth.signOut();
      setLoading(submitBtn, false, 'Log In');
      if (window.turnstile) turnstile.reset();
      document.getElementById('cfToken').value = '';
      // Offer to resend verification
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
