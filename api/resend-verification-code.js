// api/resend-verification-code.js
import nodemailer from 'nodemailer';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, cert, getApps } from 'firebase-admin/app';

// Initialize Firebase Admin only once
if (!getApps().length) {
  if (!process.env.SERVICE_ACCOUNT_JSON) {
    console.error('❌ SERVICE_ACCOUNT_JSON missing');
  } else {
    try {
      const serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT_JSON);
      initializeApp({ credential: cert(serviceAccount) });
      console.log('✅ Firebase Admin SDK initialized');
    } catch (err) {
      console.error('Failed to init Firebase Admin:', err);
    }
  }
}
const db = getFirestore();

// SMTP transporter
const transporter = nodemailer.createTransport({
  host: process.env.BREVO_SMTP_HOST || 'smtp-relay.brevo.com',
  port: parseInt(process.env.BREVO_SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.BREVO_SMTP_USER,
    pass: process.env.BREVO_SMTP_PASSWORD
  }
});

// API fallback
async function sendViaBrevoAPI(email, code, html) {
  const BREVO_API_KEY = process.env.BREVO_API_KEY;
  if (!BREVO_API_KEY) throw new Error('No API key');
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': BREVO_API_KEY, 'content-type': 'application/json' },
    body: JSON.stringify({
      sender: { name: 'FlickZZ', email: process.env.BREVO_EMAIL_FROM || 'noreply@flickzz.qzz.io' },
      to: [{ email }],
      subject: 'New verification code – FlickZZ',
      htmlContent: html
    })
  });
  if (!res.ok) throw new Error('Brevo API failed');
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { uid, email } = req.body;
  if (!uid || !email) return res.status(400).json({ error: 'Missing uid or email' });

  const hasSMTP = process.env.BREVO_SMTP_USER && process.env.BREVO_SMTP_PASSWORD;
  const hasAPI = process.env.BREVO_API_KEY;
  if (!hasSMTP && !hasAPI) return res.status(500).json({ error: 'No email credentials' });

  try {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const docRef = db.collection('emailVerifications').doc(uid);
    await docRef.set({
      code, email,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000)
    }, { merge: true });

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:'Inter',sans-serif; background:#0a0a0f; color:#f1f5f9; padding:2rem; text-align:center;">
  <div style="max-width:500px; background:#15151e; border-radius:16px; padding:2rem;">
    <img src="https://flickzz.qzz.io/images/logo.png" style="width:80px; margin-bottom:1.5rem;">
    <h2 style="color:#6366f1;">New Verification Code</h2>
    <p>Your new code is valid for 10 minutes.</p>
    <div style="background:#1c1c28; padding:1rem; font-size:2rem; letter-spacing:0.5rem; font-weight:bold;">${code}</div>
    <hr style="border-color:#2d2d3a; margin:2rem 0;">
    <p style="font-size:0.75rem;">FlickZZ Team</p>
  </div>
</body>
</html>`;

    const fromEmail = process.env.BREVO_EMAIL_FROM || 'noreply@flickzz.qzz.io';
    const fromName = 'FlickZZ';

    if (hasSMTP) {
      try {
        await transporter.sendMail({
          from: `"${fromName}" <${fromEmail}>`,
          to: email,
          subject: 'New verification code – FlickZZ',
          html
        });
        console.log(`✅ Resend via SMTP to ${email}`);
        return res.status(200).json({ success: true });
      } catch (smtpErr) {
        console.error('SMTP resend failed, trying API...', smtpErr.message);
        if (!hasAPI) throw smtpErr;
        await sendViaBrevoAPI(email, code, html);
        console.log(`✅ Resend via API to ${email}`);
        return res.status(200).json({ success: true });
      }
    } else if (hasAPI) {
      await sendViaBrevoAPI(email, code, html);
      return res.status(200).json({ success: true });
    }
  } catch (error) {
    console.error('❌ Resend error:', error);
    res.status(500).json({ error: error.message || 'Failed to resend code' });
  }
}
