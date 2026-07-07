// api/send-admin-otp.js - SMTP Method (No IP Restriction)
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import nodemailer from 'nodemailer';

// Init Firebase Admin
if (!getApps().length) {
  if (!process.env.SERVICE_ACCOUNT_JSON) {
    console.error('❌ SERVICE_ACCOUNT_JSON missing');
  } else {
    try {
      const serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT_JSON);
      initializeApp({ credential: cert(serviceAccount) });
      console.log('✅ Firebase Admin initialized for admin OTP');
    } catch (err) {
      console.error('❌ Firebase init failed:', err.message);
    }
  }
}

const db = getFirestore();
const OWNER_EMAIL = process.env.OWNER_EMAIL || 'officialflickzzyt@gmail.com';

// SMTP Transporter (Brevo SMTP - no IP restriction)
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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  // ✅ Only owner email can receive OTP
  if (email.toLowerCase().trim() !== OWNER_EMAIL.toLowerCase().trim()) {
    console.warn(`❌ Unauthorized OTP attempt for: ${email}`);
    return res.status(403).json({ 
      error: 'This email is not authorized to access the admin panel.' 
    });
  }

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  try {
    // Store OTP in Firestore
    await db.collection('adminOTP').doc(email).set({
      otp,
      expiresAt,
      createdAt: new Date(),
      attempts: 0
    }, { merge: true });
    console.log(`✅ Admin OTP stored for ${email}: ${otp}`);

    const fromEmail = process.env.BREVO_EMAIL_FROM || 'noreply@flickzz.qzz.io';
    const fromName = 'FlickZZ';

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:'Inter',sans-serif; background:#0a0a0f; color:#f1f5f9; padding:2rem; text-align:center;">
  <div style="max-width:500px; margin:0 auto; background:#15151e; border-radius:16px; padding:2rem; border:1px solid rgba(255,255,255,0.08);">
    <img src="https://flickzz.qzz.io/images/logo.png" style="width:80px; margin-bottom:1.5rem;" alt="FlickZZ">
    <h2 style="color:#6366f1;">Admin Panel Verification</h2>
    <p style="color:#94a3b8;">Use the code below to log in to your admin panel. This code is valid for 10 minutes.</p>
    <div style="background:#1c1c28; padding:1rem; border-radius:12px; font-size:2rem; letter-spacing:0.5rem; font-weight:bold; margin:1.5rem 0; color:#f1f5f9;">${otp}</div>
    <hr style="border:none; border-top:1px solid #2d2d3a; margin:2rem 0;">
    <p style="color:#64748b; font-size:0.75rem;">If you didn't request this, please ignore this email.</p>
    <p style="font-size:0.75rem; color:#475569;">FlickZZ Team</p>
  </div>
</body>
</html>`;

    // Send via SMTP (no IP restriction)
    await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: email,
      subject: '🔐 Admin Panel OTP – FlickZZ',
      html: html
    });

    console.log(`✅ Admin OTP sent via SMTP to ${email}`);
    return res.status(200).json({ 
      success: true, 
      message: 'OTP sent to your email. Check inbox/spam.' 
    });

  } catch (err) {
    console.error('❌ Send admin OTP error:', err.message);
    return res.status(500).json({ 
      error: 'Failed to send OTP. Please try again later.',
      details: err.message 
    });
  }
}
