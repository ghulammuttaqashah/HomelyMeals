import nodemailer from "nodemailer";

export const sendEmail = async (to, subject, text) => {
  const startTime = Date.now();
  try {
    console.log(`[sendEmail] init -> to=${to} subject="${subject}"`);
    
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject,
      text
    });
    
    console.log(`[sendEmail] success -> to=${to} in ${Date.now() - startTime}ms`);
    return true;
  } catch (error) {
    console.error("Email send failed:", error.message);
    console.error(`[sendEmail] failed -> to=${to} in ${Date.now() - startTime}ms`);
    throw new Error("Failed to send email. Please check the address or try again later.");
  }
};
