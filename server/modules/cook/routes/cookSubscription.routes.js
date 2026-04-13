import express from "express";
import {
  getActivePlans,
  createSubscriptionPaymentIntent,
  confirmSubscription,
  getMySubscriptionStatus,
} from "../controllers/cookSubscription.controller.js";
import { protect } from "../../../shared/middleware/auth.js";

const router = express.Router();

router.use(protect);

router.get("/plans", getActivePlans);
router.post("/payment-intent", createSubscriptionPaymentIntent);
router.post("/confirm", confirmSubscription);
router.get("/me", getMySubscriptionStatus);

export default router;
