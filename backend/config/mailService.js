const nodemailer = require('nodemailer');

/**
 * Sends real email if SMTP environment variables are set; otherwise, falls back to logging mock email to the console.
 */
const sendMail = async ({ to, subject, text, html }) => {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  // Fallback to console logging if SMTP variables are not configured (useful for development)
  if (!host || !user || !pass) {
    console.log('\n=======================================');
    console.log('         MOCK EMAIL (DEVELOPMENT)       ');
    console.log(`To:      ${to}`);
    console.log(`Subject: ${subject}`);
    console.log('---------------------------------------');
    console.log(`Body (Plain): \n${text}`);
    console.log('=======================================\n');
    return { messageId: 'mock-id-development' };
  }

  // Set up actual SMTP transporter
  const transporter = nodemailer.createTransport({
    host,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for 587/others
    auth: { user, pass }
  });

  const mailOptions = {
    from: process.env.SMTP_FROM || '"SmartERP Security" <security@mysmarterp.com>',
    to,
    subject,
    text,
    html
  };

  return await transporter.sendMail(mailOptions);
};

module.exports = { sendMail };
