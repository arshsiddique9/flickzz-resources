// api/send-otp.js
// Sends a 6-digit OTP to the OWNER's email for admin panel access.
// This OTP is used as the second-factor gate for the control panel
// (the owner first logs in with email/password, then must enter this OTP).
//
// 🚨 REQUIRED Vercel environment variables:
//    BREVO_API_KEY         — Brevo transactional email API key
//    SERVICE_ACCOUNT_JSON  — Firebase Admin SDK service account JSON (stringified)
//    OWNER_EMAIL           — (optional) defaults to officialflickzzyt@gmail.com

import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const OWNER_EMAIL = (process.env.OWNER_EMAIL || 'officialflickzzyt@gmail.com').toLowerCase().trim();

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
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { email } = req.body || {};
    if (!email) {
        return res.status(400).json({ error: 'Email is required.' });
    }

    // 🔐 Hard gate: only the owner email can request an admin OTP
    if (!isOwner(email)) {
        console.warn(`[send-otp] Unauthorized OTP request for: ${email}`);
        // Don't leak existence — return generic message
        return res.status(403).json({ error: 'Not authorized.' });
    }

    const brevoApiKey = process.env.BREVO_API_KEY;
    if (!brevoApiKey) {
        return res.status(500).json({ error: 'Email service not configured (BREVO_API_KEY missing)' });
    }

    try {
        initAdmin();
    } catch (e) {
        console.error('Admin init failed:', e);
        return res.status(500).json({ error: 'Server not configured (SERVICE_ACCOUNT_JSON missing)' });
    }

    // Generate 6-digit code
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store in Firestore at adminOtps/{email}
    try {
        const db = getFirestore();
        await db.collection('adminOtps').doc(OWNER_EMAIL).set({
            code: otp,
            email: OWNER_EMAIL,
            createdAt: new Date(),
            expiresAt,
            attempts: 0
        });
    } catch (err) {
        console.error('[send-otp] Firestore write failed:', err);
        return res.status(500).json({ error: 'Failed to store OTP' });
    }

    // HTML email
    const htmlTemplate = `
        <!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8"></head>
        <body style="font-family: 'Inter', Arial, sans-serif; background-color:#0a0a0f; color:#f1f5f9; padding:2rem; text-align:center; margin:0;">
            <div style="max-width:500px; margin:0 auto; background-color:#15151e; border-radius:16px; padding:2rem; border:1px solid rgba(255,255,255,0.08); box-shadow:0 8px 30px rgba(0,0,0,0.3);">
                <img src="https://flickzz.qzz.io/images/logo.png" alt="FlickZZ Logo" style="width:80px; height:auto; margin-bottom:1.5rem;">
                <h2 style="color:#f59e0b; margin-bottom:0.5rem;">🔐 Admin Panel Access</h2>
                <p style="margin-bottom:2rem; color:#cbd5e1;">Someone requested access to the FlickZZ Control Panel. Use this code to continue:</p>
                <div style="background-color:#1c1c28; padding:1rem; border-radius:12px; font-size:2rem; letter-spacing:0.5rem; font-weight:bold; margin-bottom:2rem; font-family:monospace; color:#f59e0b;">
                    ${otp}
                </div>
                <p style="color:#94a3b8; font-size:0.85rem;">This code expires in <strong>10 minutes</strong>. If you didn't request this, someone may be trying to access your admin panel — change your password immediately.</p>
                <hr style="border:none; border-top:1px solid rgba(255,255,255,0.08); margin:2rem 0;">
                <p style="color:#64748b; font-size:0.75rem; margin:0;">— <strong style="color:#6366f1;">FlickZZ Security</strong></p>
            </div>
        </body>
        </html>
    `;

    try {
        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'api-key': brevoApiKey,
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                sender: { name: 'FlickZZ Security', email: 'noreply@flickzz.qzz.io' },
                to: [{ email: OWNER_EMAIL }],
                subject: '🔐 FlickZZ Admin Panel — Access Code',
                htmlContent: htmlTemplate
            })
        });

        const text = await response.text();
        if (!response.ok) {
            console.error('Brevo API error', response.status, text);
            return res.status(500).json({
                error: 'Failed to send OTP email',
                brevoStatus: response.status
            });
        }

        return res.status(200).json({
            message: 'OTP sent to owner email',
            ok: true,
            expiresInMinutes: 10
        });
    } catch (err) {
        console.error('[send-otp] fatal:', err);
        return res.status(500).json({ error: err.message || 'Failed to send OTP' });
    }
}
