import express from "express";
import {
  adminSignInRequest,
  verifyAdminSignInOtp,
  adminSignOut,
  createAdmin,
  resendAdminOtp,
  checkSession
} from "../controllers/admin.controller.js";
import { protect } from "../../../shared/middleware/auth.js";

const router = express.Router();

// Step 1: Sign-In with password → get OTP
router.post("/signin/request", adminSignInRequest);

// 🔄 Resend OTP
router.post("/signin/resend", resendAdminOtp);

// Step 2: Verify OTP → set cookie + login
router.post("/signin/verify", verifyAdminSignInOtp);

// Step 3: Sign-Out (clear token cookie)
router.post("/signout", protect, adminSignOut);

// Check session validity (lightweight)
router.get("/session", protect, checkSession);

router.post("/create", createAdmin); 

export default router;