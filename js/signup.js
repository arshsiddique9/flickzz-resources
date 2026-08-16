// signup.js (Keep user logged in after signup + Username uniqueness + Error Handling)
import { signUpEmail, signInGoogle } from "./auth.js";
import { showToast, translateFirebaseError } from "./main.js";
import { auth, db, OWNER_EMAIL } from "./firebase-config.js";
import { doc, setDoc, getDoc, serverTimestamp, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { deleteUser, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const form = document.getElementById('signupForm');
const submitBtn = document.getElementById('signupSubmit');

// ============ CHECK USERNAME UNIQUENESS ============
async function isUsernameTaken(username, email) {
    const usernameRef = doc(db, 'usernames', username.toLowerCase().trim());
    const snap = await getDoc(usernameRef);
    if (snap.exists()) {
        const data = snap.data();
        const isOwner = email === OWNER_EMAIL && username.toLowerCase().trim() === 'flick zz'.toLowerCase().trim();
        if (isOwner) return false;
        return true;
    }
    return false;
}

// ============ SEND OTP VIA BREVO API ============
async function sendVerificationCode(email, code) {
    const res = await fetch('/api/send-verification-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code })
    });
    if (!res.ok) {
        let errorMsg = 'Failed to send OTP';
        try {
            const data = await res.json();
            errorMsg = data.error || errorMsg;
        } catch (_) {}
        throw new Error(errorMsg);
    }
}

// ============ FORM SUBMIT ============
form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // CAPTCHA check
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

    // Input validation
    const displayName = document.getElementById('displayName').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const terms = document.getElementById('termsCheck').checked;

    if (!terms) {
        showToast('Accept Terms', 'warning');
        return;
    }
    if (displayName.length < 3) {
        showToast('Username must be at least 3 characters', 'warning');
        return;
    }
    if (password.length < 6) {
        showToast('Password min 6 characters', 'warning');
        return;
    }

    // Check username uniqueness
    try {
        const taken = await isUsernameTaken(displayName, email);
        if (taken) {
            showToast('Username already taken. Please choose another.', 'warning');
            return;
        }
    } catch (err) {
        console.warn('Username check failed:', err);
    }

    setLoading(submitBtn, true, 'Creating account...');

    try {
        // Create Firebase Auth user
        const user = await signUpEmail({ email, password, displayName });
        if (!user.uid) throw new Error('No UID returned');

        // Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // ✅ Firestore writes with error handling
        try {
            await setDoc(doc(db, 'emailVerifications', user.uid), {
                code: otp,
                email,
                createdAt: serverTimestamp(),
                expiresAt: new Date(Date.now() + 10 * 60 * 1000)
            });

            const usernameDocRef = doc(db, 'usernames', displayName.toLowerCase().trim());
            const usernameSnap = await getDoc(usernameDocRef);
            if (usernameSnap.exists() && email === OWNER_EMAIL) {
                await setDoc(usernameDocRef, {
                    uid: user.uid,
                    username: displayName,
                    updatedAt: serverTimestamp()
                }, { merge: true });
            } else {
                await setDoc(usernameDocRef, {
                    uid: user.uid,
                    username: displayName,
                    createdAt: serverTimestamp()
                });
            }

            await setDoc(doc(db, 'users', user.uid), {
                displayName,
                email,
                createdAt: serverTimestamp(),
                username: displayName,
                isAdmin: email === OWNER_EMAIL
            }, { merge: true });
        } catch (firestoreErr) {
            console.error('Firestore write failed:', firestoreErr);
            // ✅ CRITICAL: Delete user and sign out on Firestore failure
            try {
                await deleteUser(auth.currentUser);
            } catch (_) {}
            try {
                await signOut(auth);
            } catch (_) {}
            showToast('Account creation failed. Please try again.', 'error');
            setLoading(submitBtn, false, 'Create Account');
            return;
        }

        // Send OTP
        await sendVerificationCode(email, otp);

        showToast('OTP sent! Check your email.', 'success');
        setTimeout(() => {
            window.location.href = `verify-email.html?uid=${user.uid}&email=${encodeURIComponent(email)}`;
        }, 1500);

    } catch (err) {
        console.error('Signup error:', err);
        showToast(translateFirebaseError(err) || err.message, 'error');

        // If OTP failed, cleanup
        if (auth.currentUser) {
            try {
                await deleteUser(auth.currentUser);
            } catch (_) {}
            try {
                await signOut(auth);
            } catch (_) {}
        }

        setLoading(submitBtn, false, 'Create Account');
        if (window.turnstile) turnstile.reset();
        document.getElementById('cfToken').value = '';
    }
});

// ============ GOOGLE SIGNUP ============
document.getElementById('googleSignupBtn').addEventListener('click', async () => {
    try {
        const user = await signInGoogle();
        const isAdmin = user.email === OWNER_EMAIL;
        if (isAdmin) {
            await setDoc(doc(db, 'users', user.uid), {
                displayName: 'Flick ZZ',
                isAdmin: true,
                username: 'Flick ZZ'
            }, { merge: true });
        }
        showToast('Signup successful!', 'success');
        setTimeout(() => window.location.href = isAdmin ? 'flickzz-control-panel-x7k.html' : 'dashboard.html', 1000);
    } catch (err) {
        showToast(translateFirebaseError(err), 'error');
    }
});

function setLoading(btn, loading, text) {
    btn.disabled = loading;
    btn.innerHTML = loading ? '<span class="spinner"></span> ' + text : '<span>' + text + '</span>';
}
