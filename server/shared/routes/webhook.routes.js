import express from "express";
import { handleStripeWebhook } from "../controllers/webhook.controller.js";
import { verifyStripeWebhook } from "../middleware/webhookVerify.middleware.js";

const router = express.Router();

// Stripe webhook endpoint
// Note: This route needs raw body for signature verification
// The raw body parser should be configured in server.js for this specific route
router.post("/stripe", express.raw({ type: "application/json" }), verifyStripeWebhook, handleStripeWebhook);

export default router;
