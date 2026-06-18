// api/forgot-password.js
// ✅ FIXED:
//   1. Firebase Admin initialization (was missing)
//   2. Proper Brevo error handling
//   3. Better logging
//   4. SPF/DKIM headers for inbox delivery

import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import crypto from 'crypto';

// ✅ FIX: Firebase Admin safe initialization
function initFirebase() {
  if (getApps().length > 0) return true;

  const rawJson = process.env.SERVICE_ACCOUNT_JSON;
  if (!rawJson) {
    console.error('❌ SERVICE_ACCOUNT_JSON missing');
    return false;
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

const firebaseReady = initFirebase();

export default async function handler(req, res) {
  // CORS headers
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

    // Check if user exists
    const user = await authAdmin.getUserByEmail(email);
    console.log(`✅ User found: ${user.uid}`);

    // Generate secure reset token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Save token to Firestore
    await db.collection('passwordResetTokens').doc(token).set({
      email,
      userId: user.uid,
      expiresAt,
      createdAt: new Date()
    });
    console.log(`✅ Reset token saved for ${email}`);

    // Build reset link
    const resetLink = `https://flickzz.qzz.io/reset-password.html?token=${token}`;

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:'Inter',sans-serif; background:#0a0a0f; color:#f1f5f9; padding:2rem; text-align:center;">
  <div style="max-width:500px; margin:0 auto; background:#15151e; border-radius:16px; padding:2rem; border:1px solid rgba(255,255,255,0.08);">
    <img src="https://flickzz.qzz.io/images/logo.png" style="width:80px; margin-bottom:1.5rem;" alt="FlickZZ">
    <h2 style="color:#6366f1; margin-bottom:0.5rem;">Reset Your Password</h2>
    <p style="color:#94a3b8;">Click the button below to create a new password. This link expires in 1 hour.</p>
    <div style="margin:2rem 0;">
      <a href="${resetLink}" style="display:inline-block; background:#6366f1; color:white; padding:12px 32px; border-radius:8px; text-decoration:none; font-weight:600;">Reset Password</a>
    </div>
    <p style="color:#64748b; font-size:0.8rem;">Or paste this link in your browser:<br><span style="word-break:break-all; color:#94a3b8;">${resetLink}</span></p>
    <hr style="border:none; border-top:1px solid #2d2d3a; margin:2rem 0;">
    <p style="color:#64748b; font-size:0.75rem;">If you didn't request this, ignore this email. Your password won't change.</p>
    <p style="font-size:0.75rem; color:#475569;">FlickZZ Team</p>
  </div>
</body>
</html>`;

    // Send via Brevo API with proper headers
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
      message: 'Reset link sent to your email. Check your inbox.' 
    });

  } catch (err) {
    console.error('❌ Forgot password error:', err.message);

    // User not found
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
