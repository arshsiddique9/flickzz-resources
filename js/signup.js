// signup.js (Firebase built-in email verification)
import { signUpEmail, signInGoogle } from "./auth.js";
import { showToast, translateFirebaseError } from "./main.js";
import { getAuth, sendEmailVerification } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { auth } from "./firebase-config.js";

const form = document.getElementById('signupForm');
const submitBtn = document.getElementById('signupSubmit');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  // CAPTCHA check
  const token = document.getElementById('cfToken').value;
  if (!token) return showToast('Complete security check', 'warning');

  // Verify CAPTCHA (your existing fetch to /api/turnstile-verify)
  // ...

  const displayName = document.getElementById('displayName').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const terms = document.getElementById('termsCheck').checked;
  if (!terms) return showToast('Accept Terms', 'warning');

  setLoading(submitBtn, true, 'Creating account...');
  try {
    const user = await signUpEmail({ email, password, displayName });
    await sendEmailVerification(user);
    await auth.signOut();
    showToast('Verification email sent! Check inbox/spam.', 'success');
    setTimeout(() => window.location.href = 'login.html', 2500);
  } catch (err) {
    showToast(translateFirebaseError(err), 'error');
    setLoading(submitBtn, false, 'Create Account');
  }
});

function setLoading(btn, loading, text) {
  btn.disabled = loading;
  btn.innerHTML = loading ? '<span class="spinner"></span> ' + text : '<span>' + text + '</span>';
}
