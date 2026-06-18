// api/forgot-password.js
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import crypto from 'crypto';  // ← Add this

// ✅ Firebase Admin safe initialization
function initFirebase() {
  if (getApps().length > 0) return true;
  const rawJson = process.env.SERVICE_ACCOUNT_JSON;
  if (!rawJson) return false;
  try {
    const serviceAccount = JSON.parse(rawJson);  // ← remove replace
    initializeApp({ credential: cert(serviceAccount) });
    return true;
  } catch (err) {
    console.error('❌ Firebase init failed:', err.message);
    return false;
  }
}

  try {
    const fixedJson = rawJson.replace(/\\n/g, '\n');
    const serviceAccount = JSON.parse(fixedJson);
    initializeApp({ credential: cert(serviceAccount) });
    console.log('✅ Firebase initialized for forgot-password');
    return true;
  } catch (err) {
    console.error('❌ Firebase init failed:', err.message);
    return false;
  }
}

const firebaseReady = initFirebase();  // ← Only once

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

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
    console.log(`✅ User found: ${user.uid}`);

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await db.collection('passwordResetTokens').doc(token).set({
      email,
      userId: user.uid,
      expiresAt,
      createdAt: new Date()
    });
    console.log(`✅ Reset token saved for ${email}`);

    const resetLink = `https://flickzz.qzz.io/reset-password.html?token=${token}`;

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:'Inter',sans-serif; background:#0a0a0f; color:#f1f5f9; padding:2rem; text-align:center;">
  <div style="max-width:500px; margin:0 auto; background:#15151e; border-radius:16px; padding:2rem; border:1px solid rgba(255,255,255,0.08);">
    <img src="https://flickzz.qzz.io/images/logo.png" style="width:80px; margin-bottom:1.5rem;" alt="FlickZZ">
    <h2 style="color:#6366f1;">Reset Your Password</h2>
    <p style="color:#94a3b8;">Click the button below to create a new password. This link expires in 1 hour.</p>
    <a href="${resetLink}" style="display:inline-block; background:#6366f1; color:white; padding:12px 32px; border-radius:8px; text-decoration:none; font-weight:600;">Reset Password</a>
    <p style="color:#64748b; font-size:0.8rem; margin-top:1rem;">Or paste this link in your browser:<br><span style="word-break:break-all; color:#94a3b8;">${resetLink}</span></p>
    <hr style="border:none; border-top:1px solid #2d2d3a; margin:2rem 0;">
    <p style="color:#64748b; font-size:0.75rem;">If you didn't request this, ignore this email. Your password won't change.</p>
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
        htmlContent: html,
        replyTo: { email: fromEmail, name: 'FlickZZ Support' }
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      console.error('❌ Brevo API error:', response.status, errData);
      return res.status(500).json({
        error: 'Failed to send reset email',
        details: errData.message || response.statusText
      });
    }

    console.log(`✅ Password reset email sent to ${email}`);
    return res.status(200).json({ 
      success: true, 
      message: 'Reset link sent to your email.' 
    });

  } catch (err) {
    console.error('❌ Forgot password error:', err.message);

    if (err.code === 'auth/user-not-found') {
      return res.status(404).json({ 
        error: 'No account found with this email address' 
      });
    }

    return res.status(500).json({ 
      error: 'Failed to process password reset request',
      details: err.message 
    });
  }
}
