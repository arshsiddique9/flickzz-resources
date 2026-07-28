// api/send-admin-otp.js (Unosend)
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, cert, getApps } from 'firebase-admin/app';

// Init Firebase Admin
if (!getApps().length) {
  const serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT_JSON);
  initializeApp({ credential: cert(serviceAccount) });
}

const db = getFirestore();
const OWNER_EMAIL = process.env.OWNER_EMAIL || 'officialflickzzyt@gmail.com';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  if (email.toLowerCase().trim() !== OWNER_EMAIL.toLowerCase().trim()) {
    console.warn(`❌ Unauthorized OTP attempt: ${email}`);
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const UNOSEND_API_KEY = process.env.UNOSEND_API_KEY;
  if (!UNOSEND_API_KEY) {
    console.error('❌ UNOSEND_API_KEY is not set');
    return res.status(500).json({ error: 'Email service not configured' });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  try {
    await db.collection('adminOTP').doc(email).set({
      otp, expiresAt: new Date(Date.now() + 10 * 60 * 1000), createdAt: new Date(), attempts: 0
    }, { merge: true });

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:'Inter',sans-serif; background:#0a0a0f; color:#f1f5f9; padding:2rem; text-align:center;">
  <div style="max-width:500px; margin:0 auto; background:#15151e; border-radius:16px; padding:2rem; border:1px solid rgba(255,255,255,0.08);">
    <img src="https://flickzz.qzz.io/images/logo.png" style="width:80px; margin-bottom:1.5rem;" alt="FlickZZ">
    <h2 style="color:#6366f1;">Admin Panel OTP</h2>
    <p style="color:#94a3b8;">Use the code below. Valid for 10 minutes.</p>
    <div style="background:#1c1c28; padding:1.5rem; border-radius:12px; font-size:2.5rem; letter-spacing:0.8rem; font-weight:bold; color:#6366f1;">${otp}</div>
    <hr style="border:none; border-top:1px solid #2d2d3a; margin:1.5rem 0;">
    <p style="font-size:0.75rem; color:#475569;">FlickZZ Team</p>
  </div>
</body>
</html>`;

    const response = await fetch('https://api.unosend.com/v1/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${UNOSEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: {
          email: 'noreply@flickzz.qzz.io',
          name: 'FlickZZ'
        },
        to: [{ email }],
        subject: '🔐 Admin Panel OTP – FlickZZ',
        html: html
      })
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('❌ Unosend error:', data);
      return res.status(500).json({ error: data.message || 'Failed to send OTP' });
    }

    console.log(`✅ Admin OTP sent to ${email}`, data);
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('❌ Error:', err);
    res.status(500).json({ error: err.message });
  }
}
