// signup.js (Keep user logged in after signup + Username uniqueness with Owner Exception)
import { signUpEmail, signInGoogle } from "./auth.js";
import { showToast, translateFirebaseError } from "./main.js";
import { auth, db, OWNER_EMAIL } from "./firebase-config.js";
import { doc, setDoc, getDoc, serverTimestamp, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { deleteUser } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const form = document.getElementById('signupForm');
const submitBtn = document.getElementById('signupSubmit');

// ============ CHECK USERNAME UNIQUENESS (WITH OWNER EXCEPTION) ============
async function isUsernameTaken(username, email) {
    const usernameRef = doc(db, 'usernames', username.toLowerCase().trim());
    const snap = await getDoc(usernameRef);
    
    // ✅ If username exists, check if it's the owner
    if (snap.exists()) {
        const data = snap.data();
        const isOwner = email === OWNER_EMAIL && username.toLowerCase().trim() === 'flick zz'.toLowerCase().trim();
        // If it's the owner, allow it (update existing record instead of blocking)
        if (isOwner) {
            return false; // Allow owner to use this username
        }
        return true; // Block for normal users
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

    // 1️⃣ CAPTCHA check
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

    // 2️⃣ Input validation
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

    // 3️⃣ Check username uniqueness (with owner exception)
    try {
        const taken = await isUsernameTaken(displayName, email);
        if (taken) {
            showToast('Username already taken. Please choose another.', 'warning');
            return;
        }
    } catch (err) {
        console.warn('Username check failed:', err);
        // Continue anyway - Firestore rules will handle it
    }

    setLoading(submitBtn, true, 'Creating account...');

    try {
        // 4️⃣ Create Firebase Auth user
        const user = await signUpEmail({ email, password, displayName });
        if (!user.uid) throw new Error('No UID returned');

        // 5️⃣ Generate & store OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        await setDoc(doc(db, 'emailVerifications', user.uid), {
            code: otp,
            email,
            createdAt: serverTimestamp(),
            expiresAt: new Date(Date.now() + 10 * 60 * 1000)
        });

        // 6️⃣ Store username mapping (for uniqueness) – owner ke liye update
        const usernameDocRef = doc(db, 'usernames', displayName.toLowerCase().trim());
        const usernameSnap = await getDoc(usernameDocRef);
        
        if (usernameSnap.exists() && email === OWNER_EMAIL) {
            // Owner ke liye update existing record
            await setDoc(usernameDocRef, {
                uid: user.uid,
                username: displayName,
                updatedAt: serverTimestamp()
            }, { merge: true });
        } else {
            // Normal user ke liye create new
            await setDoc(usernameDocRef, {
                uid: user.uid,
                username: displayName,
                createdAt: serverTimestamp()
            });
        }

        // 7️⃣ Store user profile
        await setDoc(doc(db, 'users', user.uid), {
            displayName,
            email,
            createdAt: serverTimestamp(),
            username: displayName,
            isAdmin: email === OWNER_EMAIL
        }, { merge: true });

        // 8️⃣ Send OTP email
        await sendVerificationCode(email, otp);

        // 9️⃣ Redirect to verification page (user stays logged in)
        showToast('OTP sent! Check your email.', 'success');
        setTimeout(() => {
            window.location.href = `verify-email.html?uid=${user.uid}&email=${encodeURIComponent(email)}`;
        }, 1500);

    } catch (err) {
        console.error('Signup error:', err);
        showToast(translateFirebaseError(err) || err.message, 'error');

        // ❌ If OTP failed, delete the partially created user
        if (auth.currentUser && err.message.includes('OTP')) {
            try {
                await deleteUser(auth.currentUser);
                console.log('Partially created user deleted due to OTP failure.');
            } catch (deleteErr) {
                console.warn('Could not delete user:', deleteErr);
            }
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
            // Owner ke liye username set karo
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

// ============ HELPER ============
function setLoading(btn, loading, text) {
    btn.disabled = loading;
    btn.innerHTML = loading ? '<span class="spinner"></span> ' + text : '<span>' + text + '</span>';
}
