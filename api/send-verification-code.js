// api/send-verification-code.js
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

async function sendViaBrevoAPI(email, code, html) {
  const BREVO_API_KEY = process.env.BREVO_API_KEY;
  if (!BREVO_API_KEY) throw new Error('BREVO_API_KEY not set');
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': BREVO_API_KEY,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      sender: { name: 'FlickZZ', email: process.env.BREVO_EMAIL_FROM || 'noreply@flickzz.qzz.io' },
      to: [{ email }],
      subject: 'Your 6‑digit verification code – FlickZZ',
      htmlContent: html
    })
  });
  if (!response.ok) {
    const errData = await response.json();
    throw new Error(`Brevo API error: ${errData.message || response.statusText}`);
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { email, code } = req.body;
  if (!email || !code) return res.status(400).json({ error: 'Email and code required' });

  const hasSMTP = process.env.BREVO_SMTP_USER && process.env.BREVO_SMTP_PASSWORD;
  const hasAPI = process.env.BREVO_API_KEY;
  if (!hasSMTP && !hasAPI) return res.status(500).json({ error: 'No email credentials' });

  const fromEmail = process.env.BREVO_EMAIL_FROM || 'noreply@flickzz.qzz.io';
  const fromName = 'FlickZZ';
  const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:'Inter',sans-serif; background:#0a0a0f; color:#f1f5f9; padding:2rem; text-align:center;">
  <div style="max-width:500px; margin:0 auto; background:#15151e; border-radius:16px; padding:2rem; border:1px solid rgba(255,255,255,0.08);">
    <img src="https://flickzz.qzz.io/images/logo.png" style="width:80px; margin-bottom:1.5rem;">
    <h2 style="color:#6366f1;">Verify Your Email</h2>
    <p>Use the code below to complete signup. Valid for 10 minutes.</p>
    <div style="background:#1c1c28; padding:1rem; border-radius:12px; font-size:2rem; letter-spacing:0.5rem; font-weight:bold;">${code}</div>
    <hr style="border-color:#2d2d3a; margin:2rem 0;">
    <p style="font-size:0.75rem;">FlickZZ Team</p>
  </div>
</body>
</html>`;

  try {
    if (hasSMTP) {
      await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: email,
        subject: 'Your 6‑digit verification code – FlickZZ',
        html
      });
      console.log(`✅ Email sent via SMTP to ${email}`);
      return res.status(200).json({ success: true });
    } else if (hasAPI) {
      await sendViaBrevoAPI(email, code, html);
      return res.status(200).json({ success: true });
    }
  } catch (err) {
    console.error('SMTP failed, trying API fallback...');
    if (hasAPI) {
      try {
        await sendViaBrevoAPI(email, code, html);
        return res.status(200).json({ success: true });
      } catch (apiErr) {
        return res.status(500).json({ error: apiErr.message });
      }
    }
    return res.status(500).json({ error: err.message });
  }
}
