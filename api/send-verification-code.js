// api/send-verification-code.js
import nodemailer from 'nodemailer';

// SMTP transporter with explicit auth method
const transporter = nodemailer.createTransport({
  host: process.env.BREVO_SMTP_HOST || 'smtp-relay.brevo.com',
  port: parseInt(process.env.BREVO_SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.BREVO_SMTP_USER,
    pass: process.env.BREVO_SMTP_PASSWORD
  },
  authMethod: 'LOGIN',  // Explicitly set auth method
  tls: {
    rejectUnauthorized: false  // Sometimes needed for self-signed certs
  }
});

// Fallback: Send via Brevo API (if SMTP fails)
async function sendViaBrevoAPI(email, code, html) {
  const BREVO_API_KEY = process.env.BREVO_API_KEY;
  if (!BREVO_API_KEY) throw new Error('BREVO_API_KEY not set for fallback');
  
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
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
  return { success: true };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, code } = req.body;
  if (!email || !code) {
    return res.status(400).json({ error: 'Email and code are required' });
  }

  // Check SMTP credentials
  const hasSMTP = process.env.BREVO_SMTP_USER && process.env.BREVO_SMTP_PASSWORD;
  const hasAPI = process.env.BREVO_API_KEY;
  
  if (!hasSMTP && !hasAPI) {
    console.error('❌ No email credentials (SMTP or API) configured');
    return res.status(500).json({ error: 'Email service not configured' });
  }

  const fromEmail = process.env.BREVO_EMAIL_FROM || 'noreply@flickzz.qzz.io';
  const fromName = 'FlickZZ';

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:'Inter',sans-serif; background:#0a0a0f; color:#f1f5f9; padding:2rem; text-align:center;">
  <div style="max-width:500px; margin:0 auto; background:#15151e; border-radius:16px; padding:2rem; border:1px solid rgba(255,255,255,0.08);">
    <img src="https://flickzz.qzz.io/images/logo.png" alt="FlickZZ" style="width:80px; margin-bottom:1.5rem;">
    <h2 style="color:#6366f1;">Verify Your Email</h2>
    <p>Use the code below to complete signup. Valid for 10 minutes.</p>
    <div style="background:#1c1c28; padding:1rem; border-radius:12px; font-size:2rem; letter-spacing:0.5rem; font-weight:bold;">${code}</div>
    <hr style="border-color:#2d2d3a; margin:2rem 0;">
    <p style="font-size:0.75rem;">FlickZZ Team</p>
  </div>
</body>
</html>
  `;

  try {
    // Try SMTP first if credentials exist
    if (hasSMTP) {
      const info = await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: email,
        subject: 'Your 6‑digit verification code – FlickZZ',
        html: html
      });
      console.log('✅ Email sent via SMTP to', email, 'Message ID:', info.messageId);
      return res.status(200).json({ success: true, method: 'SMTP' });
    }
    
    // Fallback to API
    if (hasAPI) {
      await sendViaBrevoAPI(email, code, html);
      console.log('✅ Email sent via Brevo API to', email);
      return res.status(200).json({ success: true, method: 'API' });
    }
    
    throw new Error('No email method available');
  } catch (error) {
    console.error('❌ Error sending email:', error);
    
    // Try API fallback if SMTP failed and API is available
    if (hasSMTP && hasAPI && error.message.includes('Authentication failed')) {
      console.log('SMTP auth failed, trying API fallback...');
      try {
        await sendViaBrevoAPI(email, code, html);
        console.log('✅ Email sent via Brevo API fallback to', email);
        return res.status(200).json({ success: true, method: 'API-fallback' });
      } catch (apiErr) {
        console.error('❌ API fallback also failed:', apiErr);
        return res.status(500).json({ error: apiErr.message });
      }
    }
    
    res.status(500).json({ error: error.message || 'Failed to send verification email' });
  }
}
