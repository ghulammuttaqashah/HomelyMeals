import axios from "axios";

export const verifyEmailAPI = async (email) => {
  // If API credentials are not configured, skip external verification
  if (!process.env.EMAIL_VERIFICATION_API || !process.env.EMAIL_VERIFICATION_KEY) {
    console.log("⚠️ Email verification API not configured, skipping external check");
    return { valid: true };
  }

  try {
    const url = `${process.env.EMAIL_VERIFICATION_API}?api_key=${process.env.EMAIL_VERIFICATION_KEY}&email=${email}`;
    //console.log("🔍 Verifying email via:", url);

    const { data } = await axios.get(url);
   //console.log("📩 API Response:", data);

    // ✅ Check deliverability from email_deliverability.status
    if (data.email_deliverability?.status === "deliverable") {
      return { valid: true };
    } else {
      return {
        valid: false,
        reason: data.email_deliverability?.status_detail || "Email not deliverable"
      };
    }
  } catch (err) {
    console.error("🚫 Email verification API error:", err.message);
    // On API error, allow signup to proceed (fail open)
    return { valid: true };
  }
};
