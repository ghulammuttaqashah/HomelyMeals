import nodemailer from "nodemailer";

export const sendEmail = async (to, subject, text) => {
  const startTime = Date.now();
  try {
    console.log(`[sendEmail] init -> to=${to} subject="${subject}"`);
    console.log(`[sendEmail] using EMAIL_USER=${process.env.EMAIL_USER ? "set" : "missing"} EMAIL_PASS=${process.env.EMAIL_PASS ? "set" : "missing"}`);
    const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // true for 465, false for other ports
  family: 4,              // true for 465, false for 587
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }, // Stop waiting after 10 seconds
  greetingTimeout: 10000,
  socketTimeout: 10000

});

    console.log("[sendEmail] transport config", {
      service: transporter.options?.service,
      host: transporter.options?.host,
      port: transporter.options?.port,
      secure: transporter.options?.secure
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
    console.error("[sendEmail] error details", {
      code: error.code,
      errno: error.errno,
      syscall: error.syscall,
      address: error.address,
      port: error.port,
      command: error.command,
      responseCode: error.responseCode,
      response: error.response
    });
    if (error.stack) {
      console.error("[sendEmail] stack", error.stack);
    }
    console.error(`[sendEmail] failed -> to=${to} in ${Date.now() - startTime}ms`);
    throw new Error("Failed to send email. Please check the address or try again later.");
  }
};
