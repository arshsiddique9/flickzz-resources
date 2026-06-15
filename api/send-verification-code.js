// api/send-verification-code.js
// ✅ FIXED: Sirf Brevo API use karta hai (SMTP hataya - Vercel ke saath reliable nahi tha)

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, code } = req.body;
  if (!email || !code) return res.status(400).json({ error: 'Email and code required' });

  const BREVO_API_KEY = process.env.BREVO_API_KEY;
  const fromEmail = process.env.BREVO_EMAIL_FROM || 'noreply@flickzz.qzz.io';

  if (!BREVO_API_KEY) {
    console.error('❌ BREVO_API_KEY is not set in environment variables');
    return res.status(500).json({ error: 'Email service not configured' });
  }

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
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': BREVO_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sender: { name: 'FlickZZ', email: fromEmail },
        to: [{ email }],
        subject: 'Your 6-digit verification code – FlickZZ',
        htmlContent: html
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      console.error('❌ Brevo API error:', response.status, errData);
      return res.status(500).json({
        error: 'Failed to send email',
        details: errData.message || response.statusText
      });
    }

    console.log(`✅ Verification email sent to ${email}`);
    return res.status(200).json({ success: true });

  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  }
}
