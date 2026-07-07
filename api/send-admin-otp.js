// api/send-admin-otp.js (SMTP Method)
import nodemailer from 'nodemailer';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, cert, getApps } from 'firebase-admin/app';

// Init Firebase Admin
if (!getApps().length) {
  const serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT_JSON);
  initializeApp({ credential: cert(serviceAccount) });
}

const db = getFirestore();
const OWNER_EMAIL = process.env.OWNER_EMAIL || 'officialflickzzyt@gmail.com';

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
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  if (email.toLowerCase().trim() !== OWNER_EMAIL.toLowerCase().trim()) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  await db.collection('adminOTP').doc(email).set({
    otp, expiresAt: new Date(Date.now() + 10 * 60 * 1000), createdAt: new Date(), attempts: 0
  }, { merge: true });

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:'Inter',sans-serif; background:#0a0a0f; color:#f1f5f9; padding:2rem; text-align:center;">
  <div style="max-width:500px; margin:0 auto; background:#15151e; border-radius:16px; padding:2rem; border:1px solid rgba(255,255,255,0.08);">
    <img src="https://flickzz.qzz.io/images/logo.png" style="width:80px; margin-bottom:1.5rem;" alt="FlickZZ">
    <h2 style="color:#6366f1;">Admin Panel OTP</h2>
    <p style="color:#94a3b8;">Use the code below. Valid for 10 minutes.</p>
    <div style="background:#1c1c28; padding:1rem; border-radius:12px; font-size:2rem; letter-spacing:0.5rem; font-weight:bold; color:#6366f1;">${otp}</div>
    <hr style="border:none; border-top:1px solid #2d2d3a; margin:1.5rem 0;">
    <p style="font-size:0.75rem; color:#475569;">FlickZZ Team</p>
  </div>
</body>
</html>`;

  try {
    await transporter.sendMail({
      from: `"FlickZZ" <${process.env.BREVO_EMAIL_FROM || 'noreply@flickzz.qzz.io'}>`,
      to: email,
      subject: '🔐 Admin Panel OTP – FlickZZ',
      html
    });
    console.log(`✅ Admin OTP sent via SMTP to ${email}`);
    res.status(200).json({ success: true });
  } catch (err) {
    console.error('❌ SMTP error:', err);
    res.status(500).json({ error: err.message });
  }
}
