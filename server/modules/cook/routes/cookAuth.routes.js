import express from "express";
import {
  signupRequest,
  verifyOtpAndCreateAccount, cookSignin, cookSignout
} from "../controllers/cookAuth.controller.js";
import { protect } from "../../../shared/middleware/auth.js";

const router = express.Router();

// Step 1: Request OTP
router.post("/signup/request", signupRequest);

// Step 2: Verify OTP → create account
router.post("/signup/verify", verifyOtpAndCreateAccount);

// Step 3: Login
router.post("/signin", cookSignin);

// Step 4: Logout
router.post("/signout", protect, cookSignout);

export default router;
