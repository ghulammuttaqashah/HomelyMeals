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
      label: String,
      houseNo: String,
      street: String,
      city: String,
      postalCode: String,
      landmark: String,
      latitude: Number,
      longitude: Number
    },
    maxDeliveryDistance: Number, // For cook signup
  }
}, { timestamps: true });

export const OTPVerification = mongoose.model("OTPVerification", otpVerificationSchema);
