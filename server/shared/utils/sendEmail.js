import nodemailer from "nodemailer";

export const sendEmail = async (to, subject, text) => {
  const startTime = Date.now();
  try {
    console.log(`\n========== [sendEmail] START ==========`);
    console.log(`[sendEmail] Timestamp: ${new Date().toISOString()}`);
    console.log(`[sendEmail] To: ${to}`);
    console.log(`[sendEmail] Subject: "${subject}"`);
    console.log(`[sendEmail] Text length: ${text?.length || 0} chars`);
    console.log(`[sendEmail] EMAIL_USER: ${process.env.EMAIL_USER ? '✓ SET' : '✗ MISSING'}`);
    console.log(`[sendEmail] EMAIL_PASS: ${process.env.EMAIL_PASS ? '✓ SET' : '✗ MISSING'}`);
    console.log(`[sendEmail] Environment: ${process.env.NODE_ENV || 'development'}`);
    
    console.log(`[sendEmail] Creating transporter...`);
    const transporter = nodemailer.createTransport({
      service: "gmail",
      family: 4,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      debug: true, logger: true
    });
    console.log(`[sendEmail] ✓ Transporter created successfully`);

    console.log(`[sendEmail] Attempting to send email...`);
    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject,
      text
    });
    
    console.log(`[sendEmail] ✓ Email sent successfully!`);
    console.log(`[sendEmail] Message ID: ${info.messageId}`);
    console.log(`[sendEmail] Response: ${info.response}`);
    console.log(`[sendEmail] Duration: ${Date.now() - startTime}ms`);
    console.log(`========== [sendEmail] END ==========\n`);
    return true;
  } catch (error) {
    console.error(`\n========== [sendEmail] ERROR ==========`);
    console.error(`[sendEmail] ✗ Email send failed!`);
    console.error(`[sendEmail] Error Type: ${error.name}`);
    console.error(`[sendEmail] Error Message: ${error.message}`);
    console.error(`[sendEmail] Error Code: ${error.code || 'N/A'}`);
    console.error(`[sendEmail] Command: ${error.command || 'N/A'}`);
    console.error(`[sendEmail] Response Code: ${error.responseCode || 'N/A'}`);
    console.error(`[sendEmail] Response: ${error.response || 'N/A'}`);
    console.error(`[sendEmail] Duration: ${Date.now() - startTime}ms`);
    
    if (error.stack) {
      console.error(`[sendEmail] Stack Trace:\n${error.stack}`);
    }
    
    console.error(`========== [sendEmail] ERROR END ==========\n`);
    throw new Error("Failed to send email. Please check the address or try again later.");
  }
};
