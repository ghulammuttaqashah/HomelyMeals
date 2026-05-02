import express from "express";
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
  subscribeToPush,
} from "../controllers/customerAuth.controller.js";
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

// Forgot Password Routes
router.post("/forgot-password/request", forgotPasswordRequest);
router.post("/forgot-password/verify", verifyForgotPasswordOtp);
router.post("/forgot-password/reset", resetPassword);
router.post("/forgot-password/resend", resendForgotPasswordOtp);

// Profile Management (protected)
router.put("/profile", protect, updateProfile);

// Address Management (protected)
router.post("/addresses", protect, addAddress);
router.put("/addresses/:addressId", protect, updateAddress);
router.delete("/addresses/:addressId", protect, deleteAddress);
router.patch("/addresses/:addressId/default", protect, setDefaultAddress);

// Push Notifications (protected)
router.post("/push/subscribe", protect, subscribeToPush);

// Test push notification endpoint (protected) - for debugging
router.post("/push/test", protect, async (req, res) => {
  try {
    const customer = await import("../models/customer.model.js").then(m => m.Customer.findById(req.user._id));
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }
    
    console.log('[Test Push] Sending test notification to customer:', customer.name, customer._id);
    console.log('[Test Push] Customer has pushSubscription:', !!customer.pushSubscription);
    
    if (!customer.pushSubscription) {
      return res.status(400).json({ 
        message: "No push subscription found. Please enable notifications first.",
        hasPushSubscription: false
      });
    }
    
    const { sendPushToUser } = await import("../../../shared/utils/push.js");
    await sendPushToUser(customer, {
      title: "Test Notification",
      body: "This is a test push notification from Homely Meals!",
      url: "/dashboard",
    });
    
    return res.status(200).json({ 
      message: "Test notification sent successfully",
      hasPushSubscription: true
    });
  } catch (error) {
    console.error("[Test Push] Error:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
});

export default router;
