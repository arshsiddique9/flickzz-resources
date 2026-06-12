// api/send-verification-code.js
// Sends the 6-digit verification code via Brevo (Sendinblue) transactional email.
//
// 🚨 REQUIRED Vercel environment variables:
//    BREVO_API_KEY       — Get from https://app.brevo.com/settings/keys/api
//
// 🚨 REQUIRED Brevo setup:
//    1. Verify your sender email (or sender domain) in Brevo dashboard:
//       https://app.brevo.com/senders/list
//    2. The `sender.email` below MUST match a verified sender, otherwise
//       Brevo will reject the request with HTTP 400.

export default async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const brevoApiKey = process.env.BREVO_API_KEY;
    if (!brevoApiKey) {
        console.error('BREVO_API_KEY env var is missing on Vercel');
        return res.status(500).json({ error: 'Email service not configured (BREVO_API_KEY missing)' });
    }

    const { email, code } = req.body || {};
    if (!email || !code) {
        return res.status(400).json({ error: 'Email and code are required' });
    }

    const htmlTemplate = `
        <!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8"></head>
        <body style="font-family: 'Inter', Arial, sans-serif; background-color: #0a0a0f; color: #f1f5f9; padding: 2rem; text-align: center; margin:0;">
            <div style="max-width: 500px; margin: 0 auto; background-color: #15151e; border-radius: 16px; padding: 2rem; border: 1px solid rgba(255,255,255,0.08); box-shadow: 0 8px 30px rgba(0,0,0,0.3);">
                <img src="https://flickzz.qzz.io/images/logo.png" alt="FlickZZ Logo" style="width: 80px; height: auto; margin-bottom: 1.5rem;">
                <h2 style="color: #6366f1; margin-bottom: 0.5rem;">Verify Your Email</h2>
                <p style="margin-bottom: 2rem; color:#cbd5e1;">Use the 6-digit code below to verify your FlickZZ account.</p>
                <div style="background-color: #1c1c28; padding: 1rem; border-radius: 12px; font-size: 2rem; letter-spacing: 0.5rem; font-weight: bold; margin-bottom: 2rem; font-family: monospace; color:#22d3ee;">
                    ${code}
                </div>
                <p style="color: #94a3b8; font-size: 0.85rem;">This code expires in 1 hour. If you didn't request this, please ignore this email.</p>
                <hr style="border:none; border-top:1px solid rgba(255,255,255,0.08); margin: 2rem 0;">
                <p style="color: #64748b; font-size: 0.75rem; margin:0;">— <strong style="color:#6366f1;">FlickZZ Team</strong></p>
            </div>
        </body>
        </html>
    `;

    try {
        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'api-key': brevoApiKey,
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                sender: { name: 'FlickZZ', email: 'noreply@flickzz.qzz.io' },
                to: [{ email }],
                subject: 'Your FlickZZ Verification Code',
                htmlContent: htmlTemplate
            })
        });

        const respText = await response.text();
        if (!response.ok) {
            console.error('Brevo API error', response.status, respText);
            return res.status(500).json({
                error: 'Failed to send email',
                brevoStatus: response.status,
                brevoBody: respText
            });
        }

        return res.status(200).json({ message: 'Email sent', ok: true });
    } catch (err) {
        console.error('send-verification-code fatal:', err);
        return res.status(500).json({ error: err.message || 'Failed to send verification email' });
    }
}
