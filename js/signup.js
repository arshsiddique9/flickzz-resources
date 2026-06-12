// ============================================
// SIGNUP WITH 6-DIGIT OTP (Brevo)
// ============================================
import { signUpEmail, signInGoogle } from "./auth.js";
import { showToast, translateFirebaseError } from "./main.js";
import { auth, db } from "./firebase-config.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

let signupInProgress = false;

const form = document.getElementById('signupForm');
const submitBtn = document.getElementById('signupSubmit');

async function sendVerificationCode(email, code) {
  const res = await fetch('/api/send-verification-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code })
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to send email');
  }
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  // --- CAPTCHA (Turnstile) ---
  const token = document.getElementById('cfToken').value;
  if (!token) return showToast('Complete security check', 'warning');
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
  if (password.length < 6) return showToast('Password min 6 chars', 'warning');

  setLoading(submitBtn, true, 'Creating account...');
  signupInProgress = true;

  try {
    // 1) Create Firebase Auth user
    const user = await signUpEmail({ email, password, displayName });
    if (!user.uid) throw new Error('No UID');

    // 2) Generate & store 6‑digit code in Firestore
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await setDoc(doc(db, 'emailVerifications', user.uid), {
      code,
      email,
      createdAt: serverTimestamp(),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000)
    });

    // 3) Send OTP via Brevo
    await sendVerificationCode(email, code);

    // 4) Sign out the user (they are not verified yet)
    await signOut(auth);
    showToast('Verification code sent! Check your email.', 'success');

    // 5) Redirect to verification page
    setTimeout(() => {
      window.location.href = `verify-email.html?uid=${user.uid}&email=${encodeURIComponent(email)}`;
    }, 1200);
  } catch (err) {
    console.error(err);
    let msg = translateFirebaseError(err);
    if (err.message.includes('email-already-exists')) msg = 'Email already registered';
    else if (err.message.includes('weak-password')) msg = 'Password too weak';
    showToast(msg, 'error');
    setLoading(submitBtn, false, 'Create Account');
    if (window.turnstile) turnstile.reset();
    document.getElementById('cfToken').value = '';
  } finally {
    signupInProgress = false;
  }
});

// Google signup – similar (optional, can be handled separately)
// ... (keep existing Google handler, but optionally send verification too)

function setLoading(btn, loading, text) {
  btn.disabled = loading;
  btn.innerHTML = loading ? '<span class="spinner"></span> ' + text : '<span>' + text + '</span>';
}
