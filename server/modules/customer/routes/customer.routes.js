import express from "express";
import {
  signupRequest,
  verifyOtpAndCreateAccount,
  signIn,
  signOut,
  getAllMealsForCustomer,
  resendSignupOtp,
  getCurrentCustomer
} from "../controllers/customer.controller.js";
import { protect } from "../../../shared/middleware/auth.js";

const router = express.Router();

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

// Get all meals (public endpoint - no authentication required)
router.get("/meals", getAllMealsForCustomer);

export default router;
