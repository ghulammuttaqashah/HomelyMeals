import paymentService from "../../modules/customer/services/payment.service.js";
import { STRIPE_WEBHOOK_SECRET } from "../config/env.js";

/**
 * Verify Stripe webhook signature
 * Attaches verified event to req.stripeEvent
 */
export const verifyStripeWebhook = async (req, res, next) => {
  try {
    const signature = req.headers["stripe-signature"];

    if (!signature) {
      console.error("❌ Webhook signature missing");
      return res.status(400).json({ error: "Missing stripe-signature header" });
    }

    if (!STRIPE_WEBHOOK_SECRET) {
      console.error("❌ Webhook secret not configured");
      return res.status(500).json({ error: "Webhook secret not configured" });
    }

    // Construct and verify webhook event
    const event = await paymentService.constructWebhookEvent(
      req.body,
      signature,
      STRIPE_WEBHOOK_SECRET
    );

    // Attach verified event to request
    req.stripeEvent = event;
    next();
  } catch (error) {
    console.error("❌ Webhook verification failed:", error.message);
    return res.status(400).json({ error: "Invalid signature" });
  }
};
