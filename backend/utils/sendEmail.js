const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  // For development/testing purposes, use ethereal.email
  // In production, you would use your actual email service
  const testAccount = await nodemailer.createTestAccount();

  // Create a transporter using ethereal.email
  const transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass
    }
  });

  // Email message options
  const message = {
    from: `"Exam Invigilation App" <noreply@examinvigilation.com>`,
    to: options.email,
    subject: options.subject,
    text: options.message
  };

  // Send email
  const info = await transporter.sendMail(message);

  // Log the ethereal URL for testing (so we can see the email in browser)
  console.log(`Email sent: ${nodemailer.getTestMessageUrl(info)}`);
  
  return nodemailer.getTestMessageUrl(info);
};

module.exports = sendEmail; 