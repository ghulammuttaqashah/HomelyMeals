import express from "express";
import rateLimit from "express-rate-limit";
import {
  signupRequest,
  verifyOtpAndCreateAccount,
  signIn,
  signOut,
  resendSignupOtp,
  getCurrentCustomer,
  forgotPasswordRequest,
  verifyForgotPasswordOtp,
  resetPassword,
  resendForgotPasswordOtp,
  updateProfile,
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  changePassword,
} from "../controllers/customerAuth.controller.js";
import { protect } from "../../../shared/middleware/auth.js";

const router = express.Router();

// Rate limiter for sensitive password operations: max 5 requests per 15 minutes per IP
const passwordRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { message: "Too many requests. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

// STEP 1: Send OTP (signup request)
router.post("/signup/request", signupRequest);

// STEP 2: Verify OTP and create account
router.post("/signup/verify", verifyOtpAndCreateAccount);

// Resend OTP
router.post("/signup/resend", resendSignupOtp);

// STEP 3: Sign-in (sets JWT cookie)
router.post("/signin", signIn);

// Get current customer (protected)
router.get("/me", protect, getCurrentCustomer);

// STEP 4: Sign-out (clears cookie - no auth required to allow cleanup)
router.post("/signout", signOut); 

// Forgot Password Routes
router.post("/forgot-password/request", forgotPasswordRequest);
router.post("/forgot-password/verify", verifyForgotPasswordOtp);
router.post("/forgot-password/reset", resetPassword);
router.post("/forgot-password/resend", resendForgotPasswordOtp);

// Profile Management (protected)
router.put("/profile", protect, updateProfile);

// Change Password (while logged in)
router.put("/change-password", passwordRateLimit, protect, changePassword);

// Address Management (protected)
router.post("/addresses", protect, addAddress);
router.put("/addresses/:addressId", protect, updateAddress);
router.delete("/addresses/:addressId", protect, deleteAddress);
router.patch("/addresses/:addressId/default", protect, setDefaultAddress);

export default router;
