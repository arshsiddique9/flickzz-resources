// api/resend-verification-code.js
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin SDK (only once)
if (!process.env.SERVICE_ACCOUNT_JSON) {
    console.error("Missing SERVICE_ACCOUNT_JSON environment variable");
} else {
    try {
        const serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT_JSON);
        initializeApp({
            credential: cert(serviceAccount)
        });
    } catch (err) {
        console.error("Failed to initialize Firebase Admin SDK:", err);
    }
}

const auth = getAuth();
const db = getFirestore();

const brevoApiKey = process.env.BREVO_API_KEY;

export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { uid } = req.body;
    if (!uid) {
        return res.status(400).json({ error: 'User ID (uid) is required' });
    }

    try {
        // Get user email from Firebase Auth
        const userRecord = await auth.getUser(uid);
        const email = userRecord.email;
        if (!email) {
            return res.status(400).json({ error: 'User has no email address' });
        }

        // Generate new 6-digit code
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Store new code in Firestore (overwrites old one)
        await db.collection('emailVerifications').doc(uid).set({
            code: verificationCode,
            email: email,
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 60 * 60 * 1000) // 1 hour expiry
        }, { merge: true });

        // Professional HTML email template
        const htmlTemplate = `
            <!DOCTYPE html>
            <html>
            <head><meta charset="UTF-8"></head>
            <body style="font-family: 'Inter', sans-serif; background-color: #0a0a0f; color: #f1f5f9; padding: 2rem; text-align: center;">
                <div style="max-width: 500px; margin: 0 auto; background-color: #15151e; border-radius: 16px; padding: 2rem; border: 1px solid rgba(255,255,255,0.08); box-shadow: 0 8px 30px rgba(0,0,0,0.3);">
                    <img src="https://flickzz.qzz.io/images/logo.png" alt="FlickZZ Logo" style="width: 80px; height: auto; margin-bottom: 1.5rem;">
                    <h2 style="color: #6366f1; margin-bottom: 0.5rem;">New Verification Code</h2>
                    <p style="margin-bottom: 2rem;">You requested a new verification code. Use the code below to verify your FlickZZ account.</p>
                    <div style="background-color: #1c1c28; padding: 1rem; border-radius: 12px; font-size: 2rem; letter-spacing: 0.5rem; font-weight: bold; margin-bottom: 2rem; font-family: monospace;">
                        ${verificationCode}
                    </div>
                    <p style="color: #94a3b8; font-size: 0.85rem;">This code expires in 1 hour. If you didn't request this, please ignore.</p>
                    <hr style="border-color: rgba(255,255,255,0.08); margin: 2rem 0;">
                    <p style="color: #64748b; font-size: 0.75rem;">Thank you,<br><strong style="color:#6366f1;">FlickZZ Team</strong></p>
                </div>
            </body>
            </html>
        `;

        if (!brevoApiKey) {
            console.error("BREVO_API_KEY is not set");
            return res.status(500).json({ error: 'Email service not configured' });
        }

        const brevoResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'api-key': brevoApiKey,
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                sender: { name: 'FlickZZ', email: 'noreply@flickzz.qzz.io' },
                to: [{ email: email }],
                subject: 'New Verification Code - FlickZZ',
                htmlContent: htmlTemplate
            })
        });

        if (!brevoResponse.ok) {
            const errorData = await brevoResponse.json();
            console.error('Brevo API error:', errorData);
            throw new Error('Failed to send email');
        }

        res.status(200).json({ success: true, message: 'Verification code resent successfully' });
    } catch (err) {
        console.error('Resend code error:', err);
        res.status(500).json({ error: err.message || 'Failed to resend verification code' });
    }
}