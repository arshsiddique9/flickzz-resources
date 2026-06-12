// api/verify-email-code.js
// Verifies the 6-digit code that was emailed to the user during signup.
// On success: marks emailVerified=true in Firebase Auth, deletes the OTP doc.

import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// ---- Initialize Firebase Admin SDK (only once across cold starts) ----
function initAdmin() {
    if (getApps().length) return;
    if (!process.env.SERVICE_ACCOUNT_JSON) {
        throw new Error('Missing SERVICE_ACCOUNT_JSON environment variable on Vercel');
    }
    const serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT_JSON);
    initializeApp({ credential: cert(serviceAccount) });
}

export default async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        initAdmin();
    } catch (e) {
        console.error('Admin init failed:', e);
        return res.status(500).json({ error: 'Server not configured (SERVICE_ACCOUNT_JSON missing)' });
    }

    const auth = getAuth();
    const db = getFirestore();

    const { uid, code } = req.body || {};
    if (!uid || !code) {
        return res.status(400).json({ error: 'Missing uid or code' });
    }

    try {
        const docRef = db.collection('emailVerifications').doc(uid);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
            return res.status(400).json({ error: 'No verification request found. Please sign up again.' });
        }

        const data = docSnap.data();

        // Expiry check
        const expiresAt = data.expiresAt?.toDate ? data.expiresAt.toDate() : new Date(data.expiresAt);
        if (expiresAt < new Date()) {
            return res.status(400).json({ error: 'Verification code expired. Please request a new code.' });
        }

        // Code check (force string compare)
        if (String(data.code) !== String(code).trim()) {
            return res.status(400).json({ error: 'Invalid code. Please try again.' });
        }

        // Mark email as verified
        await auth.updateUser(uid, { emailVerified: true });

        // Delete the verification doc
        await docRef.delete();

        return res.status(200).json({ verified: true });
    } catch (err) {
        console.error('verify-email-code error:', err);
        return res.status(500).json({ error: err.message || 'Verification failed' });
    }
}
