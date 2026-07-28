// api/verify-admin-otp.js
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

  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ error: 'Email and OTP required' });

  if (email.toLowerCase().trim() !== OWNER_EMAIL.toLowerCase().trim()) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  try {
    const docRef = db.collection('adminOTP').doc(email);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return res.status(400).json({ error: 'No OTP request found. Please request a new one.' });
    }

    const data = docSnap.data();
    const now = new Date();

    if (data.expiresAt.toDate() < now) {
      await docRef.delete();
      return res.status(400).json({ error: 'OTP expired. Please request a new one.' });
    }

    const attempts = data.attempts || 0;
    if (attempts >= 5) {
      await docRef.delete();
      return res.status(400).json({ error: 'Too many failed attempts. Please request a new OTP.' });
    }

    if (data.otp !== otp) {
      await docRef.update({ attempts: attempts + 1 });
      return res.status(400).json({ error: `Invalid OTP. ${4 - attempts} attempts remaining.` });
    }

    await docRef.delete();
    console.log(`✅ Admin OTP verified for ${email}`);
    res.status(200).json({ success: true, verified: true });
  } catch (err) {
    console.error('❌ Error:', err);
    res.status(500).json({ error: err.message });
  }
}
