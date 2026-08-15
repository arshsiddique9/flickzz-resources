// api/reset-password.js
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

    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
        return res.status(400).json({ error: 'Token and password required' });
    }

    if (newPassword.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    try {
        const docRef = db.collection('passwordResetTokens').doc(token);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
            return res.status(400).json({ error: 'Invalid or expired reset link' });
        }

        const data = docSnap.data();
        const tokenExpiry = data.expiresAt.toDate();

        if (tokenExpiry < new Date()) {
            await docRef.delete();
            return res.status(400).json({ error: 'Reset link has expired' });
        }

        await authAdmin.updateUser(data.userId, { password: newPassword });
        await docRef.delete();

        console.log(`✅ Password reset for user: ${data.userId}`);
        res.status(200).json({ success: true, message: 'Password reset successfully' });
    } catch (err) {
        console.error('❌ Error:', err);
        if (err.code === 'auth/user-not-found') {
            return res.status(404).json({ error: 'User not found' });
        }
        res.status(500).json({ error: err.message });
    }
}
