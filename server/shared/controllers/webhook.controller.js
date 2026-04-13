import { Cook } from "../../modules/cook/models/cook.model.js";
import { Order } from "../models/order.model.js";

// Store processed event IDs to prevent duplicate processing
const processedEvents = new Set();

/**
 * Handle Stripe webhook events
 * POST /api/webhooks/stripe
 */
export const handleStripeWebhook = async (req, res) => {
  try {
    const event = req.stripeEvent;

    // Check for duplicate events (idempotency)
    if (processedEvents.has(event.id)) {
      console.log(`⚠️ Duplicate webhook event: ${event.id}`);
      return res.status(200).json({ received: true, duplicate: true });
    }

    console.log(`📥 Processing webhook event: ${event.type} - ${event.id}`);

    // Route event to appropriate handler
    switch (event.type) {
      case "account.updated":
        await handleAccountUpdated(event);
        break;

      case "payment_intent.succeeded":
        await handlePaymentIntentSucceeded(event);
        break;

      case "payment_intent.payment_failed":
        await handlePaymentIntentFailed(event);
        break;

      default:
        console.log(`ℹ️ Unhandled event type: ${event.type}`);
    }

    // Mark event as processed
    processedEvents.add(event.id);

    // Clean up old event IDs (keep last 1000)
    if (processedEvents.size > 1000) {
      const iterator = processedEvents.values();
      processedEvents.delete(iterator.next().value);
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("❌ Webhook processing error:", error);
    
    // Return 200 for non-transient errors to prevent Stripe retries
    // Return 500 for transient errors to trigger Stripe retry
    const isTransientError = error.message?.includes("timeout") || 
                            error.message?.includes("connection");
    
    return res.status(isTransientError ? 500 : 200).json({ 
      received: true,
      error: error.message 
    });
  }
};

/**
 * Handle account.updated event
 * Updates cook's Stripe account status
 */
async function handleAccountUpdated(event) {
  try {
    const account = event.data.object;
    const cookId = account.metadata?.cookId;

    if (!cookId) {
      console.log("⚠️ No cookId in account metadata");
      return;
    }

    const cook = await Cook.findById(cookId);
    if (!cook) {
      console.log(`⚠️ Cook not found: ${cookId}`);
      return;
    }

    // Determine account status
    let status = "pending";
    if (!account.details_submitted) {
      status = "pending";
    } else if (account.charges_enabled && account.payouts_enabled) {
      status = "active";
    } else if (account.requirements?.disabled_reason) {
      status = "disabled";
    } else if (account.requirements?.currently_due?.length > 0) {
      status = "restricted";
    }

    // Update cook model
    cook.stripeAccountStatus = status;
    
    // Mark onboarding as completed if account is active
    if (status === "active" && !cook.stripeOnboardingCompletedAt) {
      cook.stripeOnboardingCompletedAt = new Date();
    }

    await cook.save();

    console.log(`✅ Updated cook ${cookId} Stripe status to: ${status}`);
  } catch (error) {
    console.error("❌ handleAccountUpdated error:", error);
    throw error;
  }
}

/**
 * Handle payment_intent.succeeded event
 * Updates order payment status
 */
async function handlePaymentIntentSucceeded(event) {
  try {
    const paymentIntent = event.data.object;
    const orderId = paymentIntent.metadata?.orderId;

    if (!orderId) {
      console.log("⚠️ No orderId in payment intent metadata");
      return;
    }

    const order = await Order.findById(orderId);
    if (!order) {
      console.log(`⚠️ Order not found: ${orderId}`);
      return;
    }

    // Update order payment status
    order.paymentStatus = "paid";
    order.paymentCompletedAt = new Date();
    
    // Store transfer ID if available
    if (paymentIntent.transfer) {
      order.stripeTransferId = paymentIntent.transfer;
    }

    await order.save();

    console.log(`✅ Payment succeeded for order: ${order.orderNumber}`);
  } catch (error) {
    console.error("❌ handlePaymentIntentSucceeded error:", error);
    throw error;
  }
}

/**
 * Handle payment_intent.payment_failed event
 * Logs payment failure
 */
async function handlePaymentIntentFailed(event) {
  try {
    const paymentIntent = event.data.object;
    const orderId = paymentIntent.metadata?.orderId;

    console.log(`❌ Payment failed for order: ${orderId}`, {
      reason: paymentIntent.last_payment_error?.message,
      code: paymentIntent.last_payment_error?.code,
    });

    // Optionally update order status or notify customer
    // For now, just log the failure
  } catch (error) {
    console.error("❌ handlePaymentIntentFailed error:", error);
    throw error;
  }
}
