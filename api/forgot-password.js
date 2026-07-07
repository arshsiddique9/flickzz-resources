// api/forgot-password.js - SMTP Method (No IP Restriction)
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { initFirebaseAdmin } from './firebase-init.js';

const firebaseReady = initFirebaseAdmin();

const transporter = nodemailer.createTransport({
  host: process.env.BREVO_SMTP_HOST || 'smtp-relay.brevo.com',
  port: parseInt(process.env.BREVO_SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.BREVO_SMTP_USER,
    pass: process.env.BREVO_SMTP_PASSWORD
  }
});

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

  const fromEmail = process.env.BREVO_EMAIL_FROM || 'noreply@flickzz.qzz.io';
  const fromName = 'FlickZZ';

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

    await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: email,
      subject: 'Reset your FlickZZ password',
      html: html
    });

    console.log(`✅ Password reset email sent via SMTP to ${email}`);
    return res.status(200).json({
      success: true,
      message: 'Reset link sent to your email. Check your inbox.'
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
