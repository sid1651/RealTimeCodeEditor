const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  pool: true,
  maxConnections: 2,
  maxMessages: 50,
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 15000,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const getSenderEmail = () => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS || !process.env.SENDER_EMAIL) {
    throw new Error('Email delivery is not configured. Set SMTP_USER, SMTP_PASS, and SENDER_EMAIL in the server environment.');
  }

  return process.env.SENDER_EMAIL;
};

const sendVerificationOtpEmail = async ({ to, name, otp }) => {
  const from = getSenderEmail();

  await transporter.sendMail({
    from,
    to,
    subject: 'Verify your Kodikos account',
    text: `Hi ${name}, your Kodikos verification code is ${otp}. It expires in 10 minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937;">
        <h2 style="margin-bottom: 12px;">Verify your Kodikos account</h2>
        <p>Hi ${name},</p>
        <p>Use this one-time password to finish creating your account:</p>
        <p style="font-size: 28px; font-weight: 700; letter-spacing: 6px; margin: 20px 0;">${otp}</p>
        <p>This code expires in 10 minutes.</p>
      </div>
    `,
  });
};

module.exports = {
  transporter,
  sendVerificationOtpEmail,
};
