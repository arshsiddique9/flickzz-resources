// api/reset-password.js
// ✅ FIXED:
//   1. Firebase Admin initialization (was missing)
//   2. Proper token validation
//   3. Password validation
//   4. Better error handling

import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { initFirebaseAdmin } from './firebase-init.js';
const firebaseReady = initFirebaseAdmin();

// ✅ FIX: Firebase Admin safe initialization
function initFirebase() {
  if (getApps().length > 0) return true;

  const rawJson = process.env.SERVICE_ACCOUNT_JSON;
  if (!rawJson) {
    console.error('❌ SERVICE_ACCOUNT_JSON missing');
    return false;
  }

  try {
    const fixedJson = rawJson.replace(/\\n/g, '\n');
    const serviceAccount = JSON.parse(fixedJson);
    initializeApp({ credential: cert(serviceAccount) });
    console.log('✅ Firebase initialized for reset-password');
    return true;
  } catch (err) {
    console.error('❌ Firebase init failed:', err.message);
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

  const { token, newPassword } = req.body;

  // Validation
  if (!token || !newPassword) {
    return res.status(400).json({ error: 'Token and password are required' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  if (!firebaseReady) {
    return res.status(500).json({ error: 'Service temporarily unavailable' });
  }

  try {
    await authAdmin.updateUser(data.userId, { password: newPassword });
    const authAdmin = getAuth();

    // Get reset token from Firestore
    const docRef = db.collection('passwordResetTokens').doc(token);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      console.warn(`❌ Invalid token attempt: ${token}`);
      return res.status(400).json({ error: 'Invalid or expired reset link' });
    }

    const data = docSnap.data();
    
    // Check if token has expired
    const tokenExpiry = data.expiresAt.toDate();
    if (tokenExpiry < new Date()) {
      console.warn(`❌ Expired token: ${token}`);
      await docRef.delete(); // Clean up expired token
      return res.status(400).json({ error: 'Reset link has expired. Please request a new one.' });
    }

    // Update Firebase Auth password
    await authAdmin.updateUser(data.userId, { password: newPassword });
    console.log(`✅ Password reset for user: ${data.userId}`);

    // Delete used token (one-time use)
    await docRef.delete();

    return res.status(200).json({ 
      success: true, 
      message: 'Password reset successfully. Please log in with your new password.' 
    });

  } catch (err) {
    console.error('❌ Password reset error:', err.message);

    // Specific error handling
    if (err.code === 'auth/invalid-password') {
      return res.status(400).json({ 
        error: 'Password is too weak. Use a stronger password.' 
      });
    }

    if (err.code === 'auth/user-not-found') {
      return res.status(404).json({ 
        error: 'User account not found' 
      });
    }

    return res.status(500).json({ 
      error: 'Failed to reset password',
      details: err.message 
    });
  }
}
