// api/forgot-password.js (Brevo API – Custom Reset)
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import crypto from 'crypto';

// Init Firebase Admin
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

    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ error: 'Email required' });
    }

    const BREVO_API_KEY = process.env.BREVO_API_KEY;
    const fromEmail = process.env.BREVO_EMAIL_FROM || 'officialflickzzyt@gmail.com';

    if (!BREVO_API_KEY) {
        return res.status(500).json({ error: 'Email service not configured' });
    }

    try {
        const user = await authAdmin.getUserByEmail(email);
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        await db.collection('passwordResetTokens').doc(token).set({
            email,
            userId: user.uid,
            expiresAt,
            createdAt: new Date()
        });

        const resetLink = `https://flickzz.qzz.io/reset-password.html?token=${token}`;

        const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:'Inter',sans-serif; background:#0a0a0f; color:#f1f5f9; padding:2rem; text-align:center;">
  <div style="max-width:500px; margin:0 auto; background:#15151e; border-radius:16px; padding:2rem; border:1px solid rgba(255,255,255,0.08);">
    <img src="https://flickzz.qzz.io/images/logo.png" style="width:80px; margin-bottom:1.5rem;" alt="FlickZZ">
    <h2 style="color:#6366f1;">Reset Your Password</h2>
    <p style="color:#94a3b8;">Click the button below. Expires in 1 hour.</p>
    <div style="margin:2rem 0;">
      <a href="${resetLink}" style="display:inline-block; background:#6366f1; color:white; padding:12px 32px; border-radius:8px; text-decoration:none; font-weight:600;">Reset Password</a>
    </div>
    <hr style="border:none; border-top:1px solid #2d2d3a; margin:1.5rem 0;">
    <p style="font-size:0.75rem; color:#475569;">FlickZZ Team</p>
  </div>
</body>
</html>`;

        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                'api-key': BREVO_API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                sender: { name: 'FlickZZ', email: fromEmail },
                to: [{ email }],
                subject: 'Reset your FlickZZ password',
                htmlContent: html
            })
        });

        if (!response.ok) {
            const errData = await response.json();
            console.error('❌ Brevo error:', errData);
            return res.status(500).json({ error: errData.message || 'Failed to send email' });
        }

        console.log(`✅ Password reset email sent to ${email}`);
        res.status(200).json({ success: true });
    } catch (err) {
        console.error('❌ Error:', err);
        if (err.code === 'auth/user-not-found') {
            return res.status(404).json({ error: 'No account found with this email' });
        }
        res.status(500).json({ error: err.message });
    }
}
