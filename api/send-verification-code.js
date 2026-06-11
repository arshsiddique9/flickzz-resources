// api/send-verification-code.js
const brevoApiKey = process.env.BREVO_API_KEY;

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { email, code } = req.body;
    if (!email || !code) {
        return res.status(400).json({ error: 'Email and code are required' });
    }

    const htmlTemplate = `
        <!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8"></head>
        <body style="font-family: 'Inter', sans-serif; background-color: #0a0a0f; color: #f1f5f9; padding: 2rem; text-align: center;">
            <div style="max-width: 500px; margin: 0 auto; background-color: #15151e; border-radius: 16px; padding: 2rem; border: 1px solid rgba(255,255,255,0.08); box-shadow: 0 8px 30px rgba(0,0,0,0.3);">
                <img src="https://flickzz.qzz.io/images/logo.png" alt="FlickZZ Logo" style="width: 80px; height: auto; margin-bottom: 1.5rem;">
                <h2 style="color: #6366f1; margin-bottom: 0.5rem;">Email Verification</h2>
                <p style="margin-bottom: 2rem;">Use the code below to verify your FlickZZ account.</p>
                <div style="background-color: #1c1c28; padding: 1rem; border-radius: 12px; font-size: 2rem; letter-spacing: 0.5rem; font-weight: bold; margin-bottom: 2rem; font-family: monospace;">
                    ${code}
                </div>
                <p style="color: #94a3b8; font-size: 0.85rem;">This code expires in 1 hour. If you didn't request this, please ignore.</p>
                <hr style="border-color: rgba(255,255,255,0.08); margin: 2rem 0;">
                <p style="color: #64748b; font-size: 0.75rem;">Thank you,<br><strong style="color:#6366f1;">FlickZZ Team</strong></p>
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
                to: [{ email: email }],
                subject: 'Verify Your FlickZZ Account',
                htmlContent: htmlTemplate
            })
        });

        if (!response.ok) throw new Error('Failed to send');
        res.status(200).json({ message: 'Email sent' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to send verification email' });
    }
}