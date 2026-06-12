// api/verify-email-code.js
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

if (!process.env.SERVICE_ACCOUNT_JSON) {
  console.error('Missing SERVICE_ACCOUNT_JSON');
} else {
  const serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT_JSON);
  initializeApp({ credential: cert(serviceAccount) });
}

const authAdmin = getAuth();
const db = getFirestore();

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { uid, code } = req.body;
  if (!uid || !code) return res.status(400).json({ error: 'Missing uid/code' });

  const docRef = db.collection('emailVerifications').doc(uid);
  const docSnap = await docRef.get();
  if (!docSnap.exists) return res.status(400).json({ error: 'No verification request' });
  const data = docSnap.data();
  if (data.expiresAt.toDate() < new Date()) return res.status(400).json({ error: 'Code expired' });
  if (data.code !== code) return res.status(400).json({ error: 'Invalid code' });

  // Mark email as verified in Firebase Auth
  await authAdmin.updateUser(uid, { emailVerified: true });
  await docRef.delete(); // Clean up
  res.status(200).json({ verified: true });
}
