// signup.js (OTP Plus)
import { signUpEmail, signInGoogle } from "./auth.js";
import { showToast, translateFirebaseError } from "./main.js";
import { auth, db } from "./firebase-config.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const form = document.getElementById('signupForm');
const submitBtn = document.getElementById('signupSubmit');

async function sendOTP(email, otp) {
  const res = await fetch('/api/send-otp-plus', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp, type: 'email' })
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Failed to send OTP');
  }
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  // CAPTCHA check (Turnstile)
  const token = document.getElementById('cfToken').value;
  if (!token) {
    showToast('Complete security check', 'warning');
    return;
  }
  try {
    const capRes = await fetch('/api/turnstile-verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    });
    if (!capRes.ok) throw new Error('CAPTCHA failed');
  } catch {
    showToast('Security check failed', 'error');
    if (window.turnstile) turnstile.reset();
    document.getElementById('cfToken').value = '';
    return;
  }

  const displayName = document.getElementById('displayName').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const terms = document.getElementById('termsCheck').checked;

  if (!terms) return showToast('Accept Terms', 'warning');
  if (password.length < 6) return showToast('Password min 6 characters', 'warning');

  setLoading(submitBtn, true, 'Creating account...');

  try {
    const user = await signUpEmail({ email, password, displayName });
    if (!user.uid) throw new Error('No UID');

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    await setDoc(doc(db, 'emailVerifications', user.uid), {
      code: otp,
      email,
      createdAt: serverTimestamp(),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000)
    });

    await sendOTP(email, otp);
    await signOut(auth);

    showToast('OTP sent! Check your email.', 'success');
    setTimeout(() => {
      window.location.href = `verify-email.html?uid=${user.uid}&email=${encodeURIComponent(email)}`;
    }, 1200);

  } catch (err) {
    console.error(err);
    showToast(translateFirebaseError(err) || err.message, 'error');
    setLoading(submitBtn, false, 'Create Account');
    if (window.turnstile) turnstile.reset();
    document.getElementById('cfToken').value = '';
  }
});

// Google signup (same as before)
document.getElementById('googleSignupBtn').addEventListener('click', async () => {
  try {
    const user = await signInGoogle();
    showToast('Signup successful!', 'success');
    setTimeout(() => window.location.href = 'dashboard.html', 1000);
  } catch (err) {
    showToast(translateFirebaseError(err), 'error');
  }
});

function setLoading(btn, loading, text) {
  btn.disabled = loading;
  btn.innerHTML = loading ? '<span class="spinner"></span> ' + text : '<span>' + text + '</span>';
}
