import mongoose from "mongoose";

const otpVerificationSchema = new mongoose.Schema({
  email: { type: String, required: true },
  otpCode: { type: String, required: true },
  purpose: { type: String, required: true }, // e.g., signup, resetPassword
  expiryTime: { type: Date, required: true },
  isVerified: { type: Boolean, default: false },
  tempData: {
    name: String,
    contact: String,
    password: String,
    address: {
      houseNo: String,
      street: String,
      city: { type: String, default: "Sukkur" },
      postalCode: String
    }
  }
}, { timestamps: true });

export const OTPVerification = mongoose.model("OTPVerification", otpVerificationSchema);
