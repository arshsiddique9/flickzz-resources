// api/verify-admin-otp.js
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, cert, getApps } from 'firebase-admin/app';

// Init Firebase Admin
if (!getApps().length) {
  if (!process.env.SERVICE_ACCOUNT_JSON) {
    console.error('❌ SERVICE_ACCOUNT_JSON missing');
  } else {
    try {
      const serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT_JSON);
      initializeApp({ credential: cert(serviceAccount) });
      console.log('✅ Firebase Admin initialized for admin OTP verify');
    } catch (err) {
      console.error('❌ Firebase init failed:', err.message);
    }
  }
}

const db = getFirestore();
const OWNER_EMAIL = process.env.OWNER_EMAIL || 'officialflickzzyt@gmail.com';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ error: 'Email and OTP are required' });
  }

  // ✅ Only owner email can verify
  if (email.toLowerCase().trim() !== OWNER_EMAIL.toLowerCase().trim()) {
    return res.status(403).json({ error: 'Unauthorized email' });
  }

  try {
    const docRef = db.collection('adminOTP').doc(email);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return res.status(400).json({ error: 'No OTP request found. Please request a new one.' });
    }

    const data = docSnap.data();
    const now = new Date();

    // Check expiry
    if (data.expiresAt.toDate() < now) {
      // Delete expired OTP
      await docRef.delete();
      return res.status(400).json({ error: 'OTP expired. Please request a new one.' });
    }

    // Check attempts (max 5)
    const attempts = data.attempts || 0;
    if (attempts >= 5) {
      await docRef.delete();
      return res.status(400).json({ 
        error: 'Too many failed attempts. Please request a new OTP.' 
      });
    }

    // Verify OTP
    if (data.otp !== otp) {
      await docRef.update({ attempts: attempts + 1 });
      const remaining = 4 - attempts;
      return res.status(400).json({ 
        error: `Invalid OTP. ${remaining} attempts remaining.` 
      });
    }

    // ✅ OTP verified – delete it
    await docRef.delete();

    console.log(`✅ Admin OTP verified for ${email}`);
    return res.status(200).json({ 
      success: true, 
      verified: true,
      message: 'OTP verified successfully. Access granted.' 
    });

  } catch (err) {
    console.error('❌ Verify admin OTP error:', err.message);
    return res.status(500).json({ 
      error: 'Failed to verify OTP. Please try again.' 
    });
  }
}
