// api/resend-verification-code.js
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, cert, getApps } from 'firebase-admin/app';

if (!getApps().length) {
  const serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT_JSON);
  initializeApp({ credential: cert(serviceAccount) });
}

const db = getFirestore();

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { uid, email } = req.body;
  if (!uid || !email) return res.status(400).json({ error: 'Missing uid or email' });

  try {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await db.collection('emailVerifications').doc(uid).set({
      code: otp,
      email,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000)
    }, { merge: true });

    // Send via OTP Plus
    const API_KEY = process.env.OTP_PLUS_API_KEY;
    const response = await fetch('https://api.otp.plus/v1/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to: email,
        type: 'email',
        otp: otp,
        template: 'Your new FlickZZ verification code is: {{otp}}. Valid for 10 minutes.',
        expiry: 10
      })
    });

    if (!response.ok) throw new Error('Failed to resend OTP');

    console.log(`✅ Resend OTP to ${email}`);
    res.status(200).json({ success: true });

  } catch (err) {
    console.error('❌ Resend error:', err);
    res.status(500).json({ error: err.message });
  }
}
