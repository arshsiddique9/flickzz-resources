// api/turnstile-verify.js
export default async function handler(req, res) {
    // Sirf POST request allow hai
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { token } = req.body;
    if (!token) {
        return res.status(400).json({ error: 'Missing CAPTCHA token' });
    }

    // 🔐 Secret key – environment variable se le rahe hain (Vercel mein set karna hoga)
    const secret = process.env.TURNSTILE_SECRET_KEY;
    if (!secret) {
        console.error('TURNSTILE_SECRET_KEY not set in environment');
        return res.status(500).json({ error: 'Server configuration error' });
    }

    const formData = new URLSearchParams();
    formData.append('secret', secret);
    formData.append('response', token);

    try {
        const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            method: 'POST',
            body: formData,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        const outcome = await verifyRes.json();

        if (outcome.success) {
            return res.status(200).json({ success: true });
        } else {
            console.warn('Turnstile verification failed:', outcome);
            return res.status(403).json({ error: 'CAPTCHA verification failed. Please try again.' });
        }
    } catch (err) {
        console.error('Verification error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}