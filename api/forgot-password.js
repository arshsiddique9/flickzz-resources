// api/forgot-password.js (Unosend)
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
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  const UNOSEND_API_KEY = process.env.UNOSEND_API_KEY;
  if (!UNOSEND_API_KEY) {
    console.error('❌ UNOSEND_API_KEY is not set');
    return res.status(500).json({ error: 'Email service not configured' });
  }

  try {
    const user = await authAdmin.getUserByEmail(email);
    const token = crypto.randomBytes(32).toString('hex');
    await db.collection('passwordResetTokens').doc(token).set({
      email, userId: user.uid, expiresAt: new Date(Date.now() + 60 * 60 * 1000), createdAt: new Date()
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
    <div style="margin:2rem 0;"><a href="${resetLink}" style="display:inline-block; background:#6366f1; color:white; padding:12px 32px; border-radius:8px; text-decoration:none; font-weight:600;">Reset Password</a></div>
    <hr style="border:none; border-top:1px solid #2d2d3a; margin:1.5rem 0;">
    <p style="font-size:0.75rem; color:#475569;">FlickZZ Team</p>
  </div>
</body>
</html>`;

    const response = await fetch('https://api.unosend.com/v1/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${UNOSEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: {
          email: 'noreply@flickzz.qzz.io',
          name: 'FlickZZ'
        },
        to: [{ email }],
        subject: 'Reset your FlickZZ password',
        html: html
      })
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('❌ Unosend error:', data);
      return res.status(500).json({ error: data.message || 'Failed to send email' });
    }

    console.log(`✅ Reset email sent to ${email}`, data);
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('❌ Error:', err);
    if (err.code === 'auth/user-not-found') {
      return res.status(404).json({ error: 'No account found' });
    }
    res.status(500).json({ error: err.message });
  }
}
