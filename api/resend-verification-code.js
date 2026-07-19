import { Resend } from 'resend';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, cert, getApps } from 'firebase-admin/app';

if (!getApps().length) {
  const serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT_JSON);
  initializeApp({ credential: cert(serviceAccount) });
}

const db = getFirestore();
const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { uid, email } = req.body;
  if (!uid || !email) return res.status(400).json({ error: 'Missing uid or email' });

  try {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await db.collection('emailVerifications').doc(uid).set({
      code, email, createdAt: new Date(), expiresAt: new Date(Date.now() + 10 * 60 * 1000)
    }, { merge: true });

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:'Inter',sans-serif; background:#0a0a0f; color:#f1f5f9; padding:2rem; text-align:center;">
  <div style="max-width:500px; margin:0 auto; background:#15151e; border-radius:16px; padding:2rem; border:1px solid rgba(255,255,255,0.08);">
    <img src="https://flickzz.qzz.io/images/logo.png" style="width:80px; margin-bottom:1.5rem;">
    <h2 style="color:#6366f1;">New Verification Code</h2>
    <p style="color:#94a3b8;">Your new code is valid for 10 minutes.</p>
    <div style="background:#1c1c28; padding:1.5rem; border-radius:12px; font-size:2.5rem; letter-spacing:0.8rem; font-weight:bold; color:#6366f1;">${code}</div>
    <hr style="border:none; border-top:1px solid #2d2d3a; margin:1.5rem 0;">
    <p style="font-size:0.75rem; color:#475569;">FlickZZ Team</p>
  </div>
</body>
</html>`;

    await resend.emails.send({
      from: 'FlickZZ <onboarding@resend.dev>',
      to: email,
      subject: 'New verification code – FlickZZ',
      html: html
    });
    console.log(`✅ Resend email sent to ${email}`);
    res.status(200).json({ success: true });
  } catch (err) {
    console.error('❌ Error:', err);
    res.status(500).json({ error: err.message });
  }
}
