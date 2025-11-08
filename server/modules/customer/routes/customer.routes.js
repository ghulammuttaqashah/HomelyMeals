import express from "express";
import {
  signupRequest,
  verifyOtpAndCreateAccount,
  signIn,
  signOut
} from "../controllers/customer.controller.js";
import { protect } from "../../../shared/middleware/auth.js"; // optional if you need protected routes

const router = express.Router();

// STEP 1: Send OTP (signup request)
router.post("/signup/request", signupRequest);

// STEP 2: Verify OTP and create account
router.post("/signup/verify", verifyOtpAndCreateAccount);

// STEP 3: Sign-in (sets JWT cookie)
router.post("/signin", signIn);

// STEP 4: Sign-out (clears cookie)
router.post("/signout", protect, signOut); // can protect or leave open — up to you

export default router;
