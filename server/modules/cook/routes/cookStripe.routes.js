import express from "express";
import {
  initiateOnboarding,
  getManageLink,
  getStripeStatus,
  updatePaymentSettings,
} from "../controllers/cookStripe.controller.js";
import { protect } from "../../../shared/middleware/auth.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

// Stripe Connect onboarding and management
router.post("/onboard", initiateOnboarding);
router.post("/manage", getManageLink);
router.get("/status", getStripeStatus);

export default router;
