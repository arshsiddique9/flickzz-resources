// api/reset-password.js
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { token, newPassword } = req.body;
  if (!token || !newPassword) return res.status(400).json({ error: 'Missing token/password' });

  const docRef = db.collection('passwordResetTokens').doc(token);
  const docSnap = await docRef.get();
  if (!docSnap.exists) return res.status(400).json({ error: 'Invalid token' });
  const data = docSnap.data();
  if (data.expiresAt.toDate() < new Date()) return res.status(400).json({ error: 'Token expired' });

  await getAuth().updateUser(data.userId, { password: newPassword });
  await docRef.delete();
  res.status(200).json({ message: 'Password updated' });
}
