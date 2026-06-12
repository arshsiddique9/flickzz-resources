// api/forgot-password.js
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, cert } from 'firebase-admin/app';
import crypto from 'crypto';

// Initialize admin (same as above)
// ... (same init code)

const authAdmin = getAuth();
const db = getFirestore();

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  try {
    const user = await authAdmin.getUserByEmail(email);
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await db.collection('passwordResetTokens').doc(token).set({
      email,
      userId: user.uid,
      expiresAt
    });

    const resetLink = `https://flickzz.qzz.io/reset-password.html?token=${token}`;
    const html = `<!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"></head>
    <body style="font-family:'Inter',sans-serif; background:#0a0a0f; color:#f1f5f9; text-align:center; padding:2rem;">
      <div style="max-width:500px; margin:0 auto; background:#15151e; border-radius:16px; padding:2rem;">
        <img src="https://flickzz.qzz.io/images/logo.png" width="80">
        <h2 style="color:#6366f1;">Reset Your Password</h2>
        <a href="${resetLink}" style="background:#6366f1; color:white; padding:12px 24px; border-radius:8px; text-decoration:none;">Reset Password</a>
        <p style="margin-top:2rem;">Link expires in 1 hour.</p>
      </div>
    </body>
    </html>`;

    await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': process.env.BREVO_API_KEY, 'content-type': 'application/json' },
      body: JSON.stringify({
        sender: { name: 'FlickZZ', email: 'noreply@flickzz.qzz.io' },
        to: [{ email }],
        subject: 'Reset your FlickZZ password',
        htmlContent: html
      })
    });
    res.status(200).json({ message: 'Reset link sent' });
  } catch (err) {
    console.error(err);
    if (err.code === 'auth/user-not-found') {
      return res.status(404).json({ error: 'No account with this email' });
    }
    res.status(500).json({ error: 'Failed to send reset email' });
  }
}
