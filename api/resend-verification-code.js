// api/resend-verification-code.js
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, cert } from 'firebase-admin/app';

// Initialize Firebase Admin only once (if not already initialized)
if (!global._firebaseAdminApp) {
  const serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT_JSON);
  global._firebaseAdminApp = initializeApp({
    credential: cert(serviceAccount)
  });
}
const db = getFirestore();

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { uid, email } = req.body;
  if (!uid || !email) return res.status(400).json({ error: 'Missing uid or email' });

  // Generate new 6-digit code
  const code = Math.floor(100000 + Math.random() * 900000).toString();

  // Update Firestore document (expires 1 hour from now)
  const docRef = db.collection('emailVerifications').doc(uid);
  await docRef.set({
    code,
    email,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 60 * 60 * 1000)
  }, { merge: true });

  // Send email via Brevo
  const html = `<!DOCTYPE html>...`; // (same as send-verification-code template)
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': process.env.BREVO_API_KEY,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      sender: { name: 'FlickZZ', email: 'noreply@flickzz.qzz.io' },
      to: [{ email }],
      subject: 'New verification code – FlickZZ',
      htmlContent: html
    })
  });
  if (!response.ok) throw new Error('Brevo failed');
  res.status(200).json({ success: true });
}
