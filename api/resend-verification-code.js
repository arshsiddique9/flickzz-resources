// api/resend-verification-code.js
import nodemailer from 'nodemailer';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, cert } from 'firebase-admin/app';

// Initialize Firebase Admin only once (if not already initialized)
if (!global._firebaseAdminApp) {
  if (!process.env.SERVICE_ACCOUNT_JSON) {
    console.error('❌ SERVICE_ACCOUNT_JSON is missing');
  } else {
    const serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT_JSON);
    global._firebaseAdminApp = initializeApp({
      credential: cert(serviceAccount)
    });
  }
}
const db = getFirestore();

// SMTP transporter (same as send-verification-code)
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
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { uid, email } = req.body;
  if (!uid || !email) {
    return res.status(400).json({ error: 'Missing uid or email' });
  }

  if (!process.env.BREVO_SMTP_USER || !process.env.BREVO_SMTP_PASSWORD) {
    console.error('❌ SMTP credentials missing');
    return res.status(500).json({ error: 'Email service not configured' });
  }

  try {
    // Generate new 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Update Firestore document (expires 1 hour from now)
    const docRef = db.collection('emailVerifications').doc(uid);
    await docRef.set({
      code,
      email,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000)
    }, { merge: true });

    // Professional HTML email template
    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:'Inter',sans-serif; background:#0a0a0f; color:#f1f5f9; padding:2rem; text-align:center;">
  <div style="max-width:500px; margin:0 auto; background:#15151e; border-radius:16px; padding:2rem; border:1px solid rgba(255,255,255,0.08);">
    <img src="https://flickzz.qzz.io/images/logo.png" alt="FlickZZ" style="width:80px; margin-bottom:1.5rem;">
    <h2 style="color:#6366f1;">New Verification Code</h2>
    <p>You requested a new code. Use the code below to verify your account. Valid for 10 minutes.</p>
    <div style="background:#1c1c28; padding:1rem; border-radius:12px; font-size:2rem; letter-spacing:0.5rem; font-weight:bold;">${code}</div>
    <hr style="border-color:#2d2d3a; margin:2rem 0;">
    <p style="font-size:0.75rem;">FlickZZ Team</p>
  </div>
</body>
</html>
    `;

    const fromEmail = process.env.BREVO_EMAIL_FROM || 'noreply@flickzz.qzz.io';
    const fromName = 'FlickZZ';

    await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: email,
      subject: 'New verification code – FlickZZ',
      html: html
    });

    console.log('✅ Resend email sent to', email);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('❌ Resend error:', error);
    res.status(500).json({ error: error.message || 'Failed to resend verification code' });
  }
}
