// api/forgot-password.js
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import crypto from 'crypto';

// Firebase Admin init
function initFirebase() {
  if (getApps().length > 0) return true;
  const raw = process.env.SERVICE_ACCOUNT_JSON;
  if (!raw) {
    console.error('❌ SERVICE_ACCOUNT_JSON missing');
    return false;
  }
  try {
    const account = JSON.parse(raw);
    initializeApp({ credential: cert(account) });
    console.log('✅ Firebase initialized');
    return true;
  } catch (err) {
    console.error('❌ Init error:', err.message);
    return false;
  }
}

const firebaseReady = initFirebase();

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  if (!firebaseReady) {
    return res.status(500).json({ error: 'Service temporarily unavailable' });
  }

  const BREVO_API_KEY = process.env.BREVO_API_KEY;
  const fromEmail = process.env.BREVO_EMAIL_FROM || 'noreply@flickzz.qzz.io';

  if (!BREVO_API_KEY) {
    console.error('❌ BREVO_API_KEY not set');
    return res.status(500).json({ error: 'Email service not configured' });
  }

  try {
    const authAdmin = getAuth();
    const db = getFirestore();
    const user = await authAdmin.getUserByEmail(email);

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

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
    <img src="https://flickzz.qzz.io/images/logo.png" style="width:80px; margin-bottom:1.5rem;">
    <h2 style="color:#6366f1;">Reset Your Password</h2>
    <p>Click the button below. Link expires in 1 hour.</p>
    <a href="${resetLink}" style="display:inline-block; background:#6366f1; color:white; padding:12px 32px; border-radius:8px; text-decoration:none;">Reset Password</a>
    <hr style="border-color:#2d2d3a; margin:2rem 0;">
    <p style="font-size:0.75rem;">FlickZZ Team</p>
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
      const errData = await response.json().catch(() => ({}));
      console.error('Brevo error:', response.status, errData);
      return res.status(500).json({ error: 'Failed to send reset email' });
    }

    return res.status(200).json({ success: true, message: 'Reset link sent' });
  } catch (err) {
    console.error('Error:', err.message);
    if (err.code === 'auth/user-not-found') {
      return res.status(404).json({ error: 'No account found with this email' });
    }
    return res.status(500).json({ error: 'Failed to process request' });
  }
}
