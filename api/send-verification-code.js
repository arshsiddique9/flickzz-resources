// api/send-verification-code.js - SMTP Method (No IP Restriction)
import nodemailer from 'nodemailer';

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

  const { email, code } = req.body;
  if (!email || !code) return res.status(400).json({ error: 'Email and code required' });

  const fromEmail = process.env.BREVO_EMAIL_FROM || 'noreply@flickzz.qzz.io';
  const fromName = 'FlickZZ';

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:'Inter',sans-serif; background:#0a0a0f; color:#f1f5f9; padding:2rem; text-align:center;">
  <div style="max-width:500px; margin:0 auto; background:#15151e; border-radius:16px; padding:2rem; border:1px solid rgba(255,255,255,0.08);">
    <img src="https://flickzz.qzz.io/images/logo.png" style="width:80px; margin-bottom:1.5rem;" alt="FlickZZ">
    <h2 style="color:#6366f1; margin-bottom:0.5rem;">Verify Your Email</h2>
    <p style="color:#94a3b8;">Use the code below to complete signup. Valid for 10 minutes.</p>
    <div style="background:#1c1c28; padding:1.5rem; border-radius:12px; font-size:2.5rem; letter-spacing:0.8rem; font-weight:bold; color:#6366f1; margin:1.5rem 0;">${code}</div>
    <p style="color:#64748b; font-size:0.8rem;">If you didn't request this, ignore this email.</p>
    <hr style="border:none; border-top:1px solid #2d2d3a; margin:1.5rem 0;">
    <p style="font-size:0.75rem; color:#475569;">FlickZZ Team</p>
  </div>
</body>
</html>`;

  try {
    await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: email,
      subject: 'Your 6-digit verification code – FlickZZ',
      html: html
    });

    console.log(`✅ Verification email sent via SMTP to ${email}`);
    return res.status(200).json({ success: true });

  } catch (err) {
    console.error('❌ Error sending email:', err.message);
    return res.status(500).json({ error: err.message || 'Failed to send verification email' });
  }
}
