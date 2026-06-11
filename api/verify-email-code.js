// api/verify-email-code.js
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, cert } from 'firebase-admin/app';

// Initialize Firebase Admin SDK (same as before)
if (!process.env.SERVICE_ACCOUNT_JSON) {
    console.error("Missing SERVICE_ACCOUNT_JSON");
} else {
    const serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT_JSON);
    if (!initializeApp({ credential: cert(serviceAccount) }, { name: 'verify-email' })) {
        // already initialized
    }
}
const auth = getAuth();
const db = getFirestore();

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { uid, code } = req.body;
    if (!uid || !code) {
        return res.status(400).json({ error: 'Missing uid or code' });
    }

    const docRef = db.collection('emailVerifications').doc(uid);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
        return res.status(400).json({ error: 'No verification request found' });
    }

    const data = docSnap.data();
    if (data.expiresAt.toDate() < new Date()) {
        return res.status(400).json({ error: 'Verification code expired' });
    }

    if (data.code !== code) {
        return res.status(400).json({ error: 'Invalid code' });
    }

    // Mark email as verified in Firebase Auth
    const user = await auth.getUser(uid);
    await auth.updateUser(uid, { emailVerified: true });

    // Delete the verification document
    await docRef.delete();

    res.status(200).json({ verified: true });
}