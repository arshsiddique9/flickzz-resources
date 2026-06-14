import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  const transporter = nodemailer.createTransport({
    host: process.env.BREVO_SMTP_HOST,
    port: parseInt(process.env.BREVO_SMTP_PORT),
    secure: false,
    auth: {
      user: process.env.BREVO_SMTP_USER,
      pass: process.env.BREVO_SMTP_PASSWORD,
    },
  });

  try {
    await transporter.verify();
    res.status(200).json({ success: true, message: 'SMTP credentials are valid!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
