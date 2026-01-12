import express from "express";
import {
  signupRequest,
  verifyOtpAndCreateAccount,
  cookSignin,
  cookSignout,
  resendSignupOtp,
  getCurrentCook,
  forgotPasswordRequest,
  verifyForgotPasswordOtp,
  resetPassword,
  resendForgotPasswordOtp
} from "../controllers/cookAuth.controller.js";
import { protect } from "../../../shared/middleware/auth.js";

const router = express.Router();

// Step 1: Request OTP
router.post("/signup/request", signupRequest);

// Step 2: Verify OTP → create account
router.post("/signup/verify", verifyOtpAndCreateAccount);

// Resend OTP
router.post("/signup/resend", resendSignupOtp);

// Step 3: Login
router.post("/signin", cookSignin);

// Get current cook (protected)
router.get("/me", protect, getCurrentCook);

// Step 4: Logout (no auth required to allow cleanup)
router.post("/signout", cookSignout);

// Forgot Password Routes
router.post("/forgot-password/request", forgotPasswordRequest);
router.post("/forgot-password/verify", verifyForgotPasswordOtp);
router.post("/forgot-password/reset", resetPassword);
router.post("/forgot-password/resend", resendForgotPasswordOtp);

export default router;
