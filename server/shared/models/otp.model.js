import mongoose from "mongoose";

const otpVerificationSchema = new mongoose.Schema({
  email: { type: String, required: true },
  otpCode: { type: String, required: true },
  purpose: { type: String, required: true }, 
  expiryTime: { type: Date, required: true },
  isVerified: { type: Boolean, default: false },
  tempData: {
  name: String,
  contact: String,
  password: String,
  address: {
    houseNo: String,
    street: String,
    city: String,
    postalCode: String
  }
}

}, { timestamps: true });

// Automatically delete OTP documents 1 hour after expiryTime
otpVerificationSchema.index({ expiryTime: 1 }, { expireAfterSeconds: 3600 });

export const OTPVerification = mongoose.model("OTPVerification", otpVerificationSchema);
