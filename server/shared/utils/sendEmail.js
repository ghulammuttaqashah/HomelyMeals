import nodemailer from "nodemailer";

export const sendEmail = async (to, subject, text) => {
  const startTime = Date.now();
  try {
    console.log(`[sendEmail] init -> to=${to} subject="${subject}"`);
    console.log(`[sendEmail] using EMAIL_USER=${process.env.EMAIL_USER ? "set" : "missing"} EMAIL_PASS=${process.env.EMAIL_PASS ? "set" : "missing"}`);
    const transporter = nodemailer.createTransport({
      service: "gmail", // or your provider
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    const mailOptions = {
      from: `<${process.env.EMAIL_USER}>`,
      to,
      subject,
      text
    };

    await transporter.sendMail(mailOptions);
    console.log(`[sendEmail] success -> to=${to} in ${Date.now() - startTime}ms`);
    return true; // success
  } catch (error) {
    console.error("Email send failed:", error.message);
    console.error(`[sendEmail] failed -> to=${to} in ${Date.now() - startTime}ms`);
    throw new Error("Failed to send email. Please check the address or try again later.");
  }
};
