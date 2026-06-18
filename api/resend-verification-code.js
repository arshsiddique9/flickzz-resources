// api/resend-verification-code.js
// ✅ FIXED: 
//   1. SERVICE_ACCOUNT_JSON safe parsing (newline fix)
//   2. Sirf Brevo API use karta hai (SMTP hataya)
//   3. Better error logging

import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, cert, getApps } from 'firebase-admin/app';

// ✅ FIX: Firebase Admin safe initialization with JSON newline fix
function initFirebase() {
  if (getApps().length > 0) return true; // Already initialized

  const rawJson = process.env.SERVICE_ACCOUNT_JSON;
  if (!rawJson) {
    console.error('❌ SERVICE_ACCOUNT_JSON environment variable is missing');
    return false;
  }

  try {
    // ✅ KEY FIX: Vercel mein private_key ki newlines escape ho jaati hain
    // "\\n" ko actual "\n" mein convert karna zaroori hai
    const fixedJson = rawJson.replace(/\\n/g, '\n');
    const serviceAccount = JSON.parse(fixedJson);
    
    initializeApp({ credential: cert(serviceAccount) });
    console.log('✅ Firebase Admin SDK initialized successfully');
    return true;
  } catch (err) {
    console.error('❌ Firebase Admin init failed:', err.message);
    console.error('Check SERVICE_ACCOUNT_JSON format in Vercel env vars');
    return false;
  }
}

const firebaseReady = initFirebase();

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { uid, email } = req.body;
  if (!uid || !email) return res.status(400).json({ error: 'Missing uid or email' });

  const BREVO_API_KEY = process.env.BREVO_API_KEY;
  const fromEmail = process.env.BREVO_EMAIL_FROM || 'noreply@flickzz.qzz.io';

  if (!BREVO_API_KEY) {
    console.error('❌ BREVO_API_KEY is not set');
    return res.status(500).json({ error: 'Email service not configured' });
  }

  if (!firebaseReady) {
    return res.status(500).json({ error: 'Database service not configured. Check SERVICE_ACCOUNT_JSON.' });
  }

  try {
    // Generate new 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Save to Firestore
    const db = getFirestore();
    const docRef = db.collection('emailVerifications').doc(uid);
    await docRef.set({
      code,
      email,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    }, { merge: true });

    console.log(`✅ New OTP saved to Firestore for uid: ${uid}`);

    // Email HTML
    const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:'Inter',sans-serif; background:#0a0a0f; color:#f1f5f9; padding:2rem; text-align:center;">
  <div style="max-width:500px; margin:0 auto; background:#15151e; border-radius:16px; padding:2rem; border:1px solid rgba(255,255,255,0.08);">
    <img src="https://flickzz.qzz.io/images/logo.png" style="width:80px; margin-bottom:1.5rem;" alt="FlickZZ">
    <h2 style="color:#6366f1; margin-bottom:0.5rem;">New Verification Code</h2>
    <p style="color:#94a3b8;">Your new code is valid for 10 minutes.</p>
    <div style="background:#1c1c28; padding:1.5rem; border-radius:12px; font-size:2.5rem; letter-spacing:0.8rem; font-weight:bold; color:#6366f1; margin:1.5rem 0;">${code}</div>
    <p style="color:#64748b; font-size:0.8rem;">If you didn't request this, ignore this email.</p>
    <hr style="border:none; border-top:1px solid #2d2d3a; margin:1.5rem 0;">
    <p style="font-size:0.75rem; color:#475569;">FlickZZ Team</p>
  </div>
</body>
</html>`;

    // Send via Brevo API
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': BREVO_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sender: { name: 'FlickZZ', email: fromEmail },
        to: [{ email }],
        subject: 'New verification code – FlickZZ',
        htmlContent: html,
        replyTo: { email: fromEmail, name: 'FlickZZ Support' }
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

    console.log(`✅ Resend verification email sent to ${email}`);
    return res.status(200).json({ success: true });

  } catch (error) {
    console.error('❌ Resend error:', error.message);
    return res.status(500).json({ error: error.message || 'Failed to resend code' });
  }
}
