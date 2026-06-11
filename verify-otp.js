// api/verify-otp.js
export default async function handler(req, res) {
  // CORS Headers (Zaroori hai)
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ error: 'Email and OTP are required.' });
  }

  // Admin/Owner check karna bhoolna mat, sirf wahi log verify kar sake
  if (!isOwner(email)) {
    console.warn(`Unauthorized OTP verification attempt for email: ${email}`);
    return res.status(403).json({ error: 'Forbidden' });
  }

  const storedData = global.otpStore?.[email];

  if (!storedData) {
    return res.status(400).json({ error: 'No OTP request found for this email.' });
  }

  if (Date.now() > storedData.expiry) {
    // Clean up expired OTP
    delete global.otpStore[email];
    return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
  }

  if (storedData.otp !== otp) {
    return res.status(400).json({ error: 'Invalid OTP.' });
  }

  // OTP verified, ab ise delete kar do
  delete global.otpStore[email];

  // Yahan session create kar sakte ho ya success response bhej sakte ho
  // Success response mein admin panel ke liye ek temporary token bhejna zyada secure hoga
  // Example: Generate a short-lived JWT or session token
  // const token = generateAdminToken(email);

  res.status(200).json({ message: 'OTP verified successfully.', verified: true });
}

function isOwner(email) {
  // **⚠️ CRITICAL: Production mein proper check implement karo**
  // const ownerEmail = process.env.OWNER_EMAIL;
  // return email === ownerEmail;
  return true; // Saare emails ko allow karna sirf testing ke liye safe nahi hai
}