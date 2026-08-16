// api/verify-email-code.js
// ✅ FIXED:
//   1. Uses firebase-init.js for safe JSON parsing (newline fix)
//   2. Proper error handling
//   3. CORS headers added

import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { initFirebaseAdmin } from './firebase-init.js';

const firebaseReady = initFirebaseAdmin();

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    if (!firebaseReady) {
        return res.status(500).json({ error: 'Server configuration error. Check SERVICE_ACCOUNT_JSON.' });
    }

    const { uid, code } = req.body;
    if (!uid || !code) {
        return res.status(400).json({ error: 'Missing uid or code' });
    }

    try {
        const db = getFirestore();
        const authAdmin = getAuth();

        const docRef = db.collection('emailVerifications').doc(uid);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
            return res.status(400).json({ error: 'No verification request found. Please request a new code.' });
        }

        const data = docSnap.data();

        // Check expiry
        const expiresAt = data.expiresAt?.toDate ? data.expiresAt.toDate() : new Date(data.expiresAt);
        if (expiresAt < new Date()) {
            await docRef.delete();
            return res.status(400).json({ error: 'Code expired. Please request a new one.' });
        }

        // Check code
        if (String(data.code) !== String(code).trim()) {
            return res.status(400).json({ error: 'Invalid code. Please check and try again.' });
        }

        // ✅ Mark email as verified in Firebase Auth (Admin SDK)
        await authAdmin.updateUser(uid, { emailVerified: true });

        // Clean up verification doc
        await docRef.delete();

        console.log(`✅ Email verified for user: ${uid}`);
        return res.status(200).json({ verified: true });

    } catch (err) {
        console.error('❌ verify-email-code error:', err.message);
        return res.status(500).json({ error: err.message || 'Verification failed' });
    }
}
