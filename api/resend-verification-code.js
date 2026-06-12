// api/resend-verification-code.js
// Generates a new 6-digit code, replaces the existing one in Firestore,
// and re-sends via Brevo.

import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

function initAdmin() {
    if (getApps().length) return;
    if (!process.env.SERVICE_ACCOUNT_JSON) {
        throw new Error('Missing SERVICE_ACCOUNT_JSON environment variable on Vercel');
    }
    const serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT_JSON);
    initializeApp({ credential: cert(serviceAccount) });
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const brevoApiKey = process.env.BREVO_API_KEY;
    if (!brevoApiKey) {
        return res.status(500).json({ error: 'Email service not configured.' });
    }

    try {
        initAdmin();
    } catch (e) {
        console.error('Admin init failed:', e);
        return res.status(500).json({ error: 'Server not configured.' });
    }

    const { uid } = req.body || {};
    if (!uid) {
        return res.status(400).json({ error: 'Missing uid' });
    }

    const auth = getAuth();
    const db = getFirestore();

    try {
        // Get user's email from Firebase Auth
        const userRecord = await auth.getUser(uid);
        const email = userRecord.email;
        if (!email) {
            return res.status(400).json({ error: 'User has no email on record.' });
        }
        if (userRecord.emailVerified) {
            return res.status(400).json({ error: 'Email is already verified.' });
        }

        // Generate new 6-digit code
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        await db.collection('emailVerifications').doc(uid).set({
            code,
            email,
            createdAt: new Date(),
            expiresAt
        });

        // Send via Brevo
        const htmlTemplate = `
            <!DOCTYPE html>
            <html>
            <head><meta charset="UTF-8"></head>
            <body style="font-family: 'Inter', Arial, sans-serif; background-color:#0a0a0f; color:#f1f5f9; padding:2rem; text-align:center; margin:0;">
                <div style="max-width:500px; margin:0 auto; background-color:#15151e; border-radius:16px; padding:2rem; border:1px solid rgba(255,255,255,0.08);">
                    <img src="https://flickzz.qzz.io/images/logo.png" alt="FlickZZ Logo" style="width:80px; height:auto; margin-bottom:1.5rem;">
                    <h2 style="color:#6366f1;">New Verification Code</h2>
                    <p style="color:#cbd5e1;">Here is your new 6-digit FlickZZ verification code:</p>
                    <div style="background-color:#1c1c28; padding:1rem; border-radius:12px; font-size:2rem; letter-spacing:0.5rem; font-weight:bold; margin:1.5rem 0; font-family:monospace; color:#22d3ee;">
                        ${code}
                    </div>
                    <p style="color:#94a3b8; font-size:0.85rem;">Expires in 1 hour.</p>
                    <hr style="border:none; border-top:1px solid rgba(255,255,255,0.08); margin:2rem 0;">
                    <p style="color:#64748b; font-size:0.75rem;">— <strong style="color:#6366f1;">FlickZZ Team</strong></p>
                </div>
            </body>
            </html>
        `;

        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'api-key': brevoApiKey,
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                sender: { name: 'FlickZZ', email: 'noreply@flickzz.qzz.io' },
                to: [{ email }],
                subject: 'Your New FlickZZ Verification Code',
                htmlContent: htmlTemplate
            })
        });

        const text = await response.text();
        if (!response.ok) {
            console.error('Brevo error', response.status, text);
            return res.status(500).json({ error: 'Failed to send email', brevoStatus: response.status });
        }

        return res.status(200).json({ message: 'New code sent', ok: true });
    } catch (err) {
        console.error('[resend-verification-code] fatal:', err);
        return res.status(500).json({ error: err.message || 'Failed to resend' });
    }
}
