// api/send-verification-code.js (Brevo API – Fixed)
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { email, code } = req.body;
    if (!email || !code) {
        return res.status(400).json({ error: 'Email and code required' });
    }

    const BREVO_API_KEY = process.env.BREVO_API_KEY;
    const fromEmail = process.env.BREVO_EMAIL_FROM || 'noreply@flickzz.qzz.io';

    if (!BREVO_API_KEY) {
        console.error('❌ BREVO_API_KEY missing');
        return res.status(500).json({ error: 'Email service not configured' });
    }

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:'Inter',sans-serif; background:#0a0a0f; color:#f1f5f9; padding:2rem; text-align:center;">
  <div style="max-width:500px; margin:0 auto; background:#15151e; border-radius:16px; padding:2rem; border:1px solid rgba(255,255,255,0.08);">
    <img src="https://flickzz.qzz.io/images/logo.png" style="width:80px; margin-bottom:1.5rem;" alt="FlickZZ">
    <h2 style="color:#6366f1;">Verify Your Email</h2>
    <p style="color:#94a3b8;">Use the code below. Valid for 10 minutes.</p>
    <div style="background:#1c1c28; padding:1.5rem; border-radius:12px; font-size:2.5rem; letter-spacing:0.8rem; font-weight:bold; color:#6366f1;">${code}</div>
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
                subject: 'Your verification code – FlickZZ',
                htmlContent: html
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('❌ Brevo error:', response.status, data);
            // Check if it's a permission/authentication error
            if (response.status === 401 || response.status === 403) {
                return res.status(403).json({ 
                    error: 'Email service authentication failed. Please check API key and sender email.',
                    details: data.message || 'Permission denied'
                });
            }
            return res.status(response.status).json({ 
                error: data.message || 'Failed to send email',
                details: data
            });
        }

        console.log(`✅ Verification email sent to ${email}`);
        res.status(200).json({ success: true });
    } catch (err) {
        console.error('❌ Error:', err);
        res.status(500).json({ error: err.message });
    }
}
