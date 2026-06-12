// api/verify-otp.js
// Verifies the 6-digit OTP sent to the owner's email for admin panel access.
// Reads the stored OTP from Firestore (adminOtps/{owner-email}) and compares.

import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const OWNER_EMAIL = (process.env.OWNER_EMAIL || 'officialflickzzyt@gmail.com').toLowerCase().trim();
const MAX_ATTEMPTS = 5;

function initAdmin() {
    if (getApps().length) return;
    if (!process.env.SERVICE_ACCOUNT_JSON) {
        throw new Error('Missing SERVICE_ACCOUNT_JSON environment variable on Vercel');
    }
    const serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT_JSON);
    initializeApp({ credential: cert(serviceAccount) });
}

function isOwner(email) {
    if (!email) return false;
    return email.toLowerCase().trim() === OWNER_EMAIL;
}

export default async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { email, otp } = req.body || {};
    if (!email || !otp) {
        return res.status(400).json({ error: 'Email and OTP are required.' });
    }

    if (!isOwner(email)) {
        console.warn(`[verify-otp] Unauthorized attempt for: ${email}`);
        return res.status(403).json({ error: 'Not authorized.' });
    }

    try {
        initAdmin();
    } catch (e) {
        console.error('Admin init failed:', e);
        return res.status(500).json({ error: 'Server not configured.' });
    }

    const db = getFirestore();
    const docRef = db.collection('adminOtps').doc(OWNER_EMAIL);

    try {
        const snap = await docRef.get();
        if (!snap.exists) {
            return res.status(400).json({ error: 'No OTP request found. Please request a new code.' });
        }

        const data = snap.data();
        const attempts = data.attempts || 0;

        if (attempts >= MAX_ATTEMPTS) {
            await docRef.delete();
            return res.status(429).json({ error: 'Too many attempts. Please request a new OTP.' });
        }

        // Expiry
        const expiresAt = data.expiresAt?.toDate ? data.expiresAt.toDate() : new Date(data.expiresAt);
        if (expiresAt < new Date()) {
            await docRef.delete();
            return res.status(400).json({ error: 'OTP expired. Please request a new code.' });
        }

        // Code compare
        if (String(data.code) !== String(otp).trim()) {
            await docRef.update({ attempts: attempts + 1 });
            return res.status(400).json({
                error: 'Invalid OTP.',
                attemptsLeft: MAX_ATTEMPTS - (attempts + 1)
            });
        }

        // ✅ Success — delete OTP doc and return success
        await docRef.delete();

        // Return a short-lived token (just a flag + expiry) the client can store
        // in sessionStorage. The control-panel.html still requires the user
        // to be authenticated AND be the owner email — this OTP is the extra gate.
        return res.status(200).json({
            verified: true,
            grantedAt: Date.now(),
            // Session valid for 4 hours after OTP verification
            validUntil: Date.now() + (4 * 60 * 60 * 1000)
        });
    } catch (err) {
        console.error('[verify-otp] fatal:', err);
        return res.status(500).json({ error: err.message || 'Verification failed' });
    }
}
