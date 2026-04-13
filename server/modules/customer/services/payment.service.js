import { getStripeClient } from "../../../shared/utils/stripe.js";

/**
 * Payment Service for Customer Payment Processing
 * Handles payment intent creation and confirmation
 */
class PaymentService {
  /**
   * Create a payment intent with destination charges
   * @param {number} amount - Amount in PKR (will be converted to paisa)
   * @param {string} currency - Currency code (default: pkr)
   * @param {string} destinationAccountId - Cook's Stripe Connect account ID
   * @param {object} metadata - Additional metadata (orderId, cookId, customerId)
   * @returns {Promise<{paymentIntentId: string, clientSecret: string}>}
   */
  async createPaymentIntent(amount, currency = "pkr", destinationAccountId, metadata = {}) {
    try {
      const stripe = getStripeClient();
      
      // Convert amount to smallest currency unit (paisa/cents)
      const amountInSmallestUnit = Math.round(amount * 100);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountInSmallestUnit,
        currency: currency.toLowerCase(),
        payment_method_types: ["card"],
        transfer_data: {
          destination: destinationAccountId,
        },
        metadata: {
          ...metadata,
          orderId: String(metadata.orderId),
          cookId: String(metadata.cookId),
          customerId: String(metadata.customerId),
        },
      });

      console.log(`✅ Payment intent created: ${paymentIntent.id} for order: ${metadata.orderId}`);
      
      return {
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
      };
    } catch (error) {
      console.error("Stripe createPaymentIntent error:", error);
      throw new Error(`Failed to create payment intent: ${error.message}`);
    }
  }

  /**
   * Retrieve payment intent details
   * @param {string} paymentIntentId - Payment Intent ID
   * @returns {Promise<object>}
   */
  async retrievePaymentIntent(paymentIntentId) {
    try {
      const stripe = getStripeClient();
      
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

      return {
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount / 100, // Convert back to standard currency
        currency: paymentIntent.currency,
        metadata: paymentIntent.metadata,
        created: paymentIntent.created,
      };
    } catch (error) {
      console.error("Stripe retrievePaymentIntent error:", error);
      throw new Error(`Failed to retrieve payment intent: ${error.message}`);
    }
  }

  /**
   * Construct webhook event from payload and signature
   * @param {string|Buffer} payload - Raw request body
   * @param {string} signature - Stripe signature header
   * @param {string} webhookSecret - Webhook signing secret
   * @returns {Promise<object>} Verified Stripe event
   */
  async constructWebhookEvent(payload, signature, webhookSecret) {
    try {
      const stripe = getStripeClient();
      
      const event = stripe.webhooks.constructEvent(
        payload,
        signature,
        webhookSecret
      );

      console.log(`✅ Webhook event verified: ${event.type} - ${event.id}`);
      return event;
    } catch (error) {
      console.error("Stripe webhook verification error:", error);
      throw new Error(`Webhook verification failed: ${error.message}`);
    }
  }
}

export default new PaymentService();
