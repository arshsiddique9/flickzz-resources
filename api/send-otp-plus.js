// api/send-otp-plus.js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, otp, type = 'email' } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ error: 'Email and OTP are required' });
  }

  const API_KEY = process.env.OTP_PLUS_API_KEY;
  if (!API_KEY) {
    console.error('❌ OTP_PLUS_API_KEY is missing');
    return res.status(500).json({ error: 'OTP service not configured' });
  }

  try {
    const response = await fetch('https://api.otp.plus/v1/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to: email,
        type: type,
        otp: otp,
        template: 'Your FlickZZ verification code is: {{otp}}. Valid for 10 minutes.',
        expiry: 10 // minutes
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ OTP Plus error:', data);
      return res.status(500).json({ 
        error: data.message || 'Failed to send OTP' 
      });
    }

    console.log(`✅ OTP sent to ${email} via OTP Plus`);
    return res.status(200).json({ success: true });

  } catch (err) {
    console.error('❌ OTP Plus exception:', err);
    return res.status(500).json({ error: err.message });
  }
}
