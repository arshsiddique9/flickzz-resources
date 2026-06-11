// api/reset-password.js
import { getAuth } from 'firebase-admin/auth';
import { initializeApp, cert } from 'firebase-admin/app';

// Firebase Admin SDK Initialize Karo (Service Account JSON chahiye)
// 🔐 SERVICE_ACCOUNT_JSON environment variable set karna bhoolna mat.
if (!process.env.SERVICE_ACCOUNT_JSON) {
  console.error("FATAL: SERVICE_ACCOUNT_JSON environment variable is missing.");
  // throw new Error("Missing Firebase Admin SDK credentials");
} else {
  try {
    const serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT_JSON);
    initializeApp({
      credential: cert(serviceAccount)
    });
  } catch (error) {
    console.error("Failed to initialize Firebase Admin SDK:", error);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required.' });
  }

  try {
    const auth = getAuth();
    // Firebase Authentication se password reset link generate karo
    const link = await auth.generatePasswordResetLink(email);

    // Brevo se email bhejne ka code (Sendinblue API v3)
    const brevoApiKey = process.env.BREVO_API_KEY;
    if (!brevoApiKey) {
      throw new Error("BREVO_API_KEY is not set");
    }

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': brevoApiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: 'FlickZZ', email: 'noreply@flickzz.qzz.io' },
        to: [{ email: email }],
        subject: 'Reset Your FlickZZ Account Password',
        htmlContent: `
          <!DOCTYPE html>
          <html>
          <head><meta charset="UTF-8"></head>
          <body style="font-family: 'Inter', sans-serif; background-color: #0a0a0f; color: #f1f5f9; padding: 2rem; text-align: center;">
            <div style="max-width: 500px; margin: 0 auto; background-color: #15151e; border-radius: 16px; padding: 2rem; border: 1px solid rgba(255,255,255,0.08);">
              <img src="https://flickzz.qzz.io/images/logo.png" alt="FlickZZ Logo" style="width: 80px; height: auto; margin-bottom: 1.5rem;">
              <h2 style="color: #6366f1; margin-bottom: 0.5rem;">Reset Your Password</h2>
              <p style="margin-bottom: 2rem;">Click the button below to reset your password. This link is valid for a limited time.</p>
              <a href="${link}" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Reset Password</a>
              <p style="color: #94a3b8; font-size: 0.85rem; margin-top: 2rem;">If you didn't request this, please ignore this email.</p>
              <hr style="border-color: rgba(255,255,255,0.08); margin: 2rem 0;">
              <p style="color: #64748b; font-size: 0.75rem;">© 2025 FlickZZ Resources. All rights reserved.</p>
            </div>
          </body>
          </html>
        `
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Brevo API Error:', errorData);
      throw new Error(errorData.message || 'Failed to send email');
    }

    res.status(200).json({ message: 'Password reset email sent successfully.' });
  } catch (error) {
    console.error('Error sending password reset email:', error);
    res.status(500).json({ error: 'Failed to send password reset email. Please try again later.' });
  }
}