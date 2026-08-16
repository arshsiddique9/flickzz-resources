// api/verify-email-code.js
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, cert, getApps } from 'firebase-admin/app';

if (!getApps().length) {
    const serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT_JSON);
    initializeApp({ credential: cert(serviceAccount) });
}

const authAdmin = getAuth();
const db = getFirestore();

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { uid, code } = req.body;
    if (!uid || !code) {
        return res.status(400).json({ error: 'Missing uid or code' });
    }

    try {
        const docRef = db.collection('emailVerifications').doc(uid);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
            return res.status(400).json({ error: 'No verification request found' });
        }

        const data = docSnap.data();
        if (data.expiresAt.toDate() < new Date()) {
            await docRef.delete();
            return res.status(400).json({ error: 'Code expired. Please request a new one.' });
        }

        if (data.code !== code) {
            return res.status(400).json({ error: 'Invalid code' });
        }

        // ✅ Mark email as verified in Firebase Auth
        await authAdmin.updateUser(uid, { emailVerified: true });
        await docRef.delete();

        console.log(` Email verified for user: ${uid}`);
        res.status(200).json({ verified: true });
    } catch (err) {
        console.error(' Error:', err);
        res.status(500).json({ error: err.message });
    }
}
