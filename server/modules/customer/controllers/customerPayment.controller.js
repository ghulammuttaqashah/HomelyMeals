import { Order } from "../../../shared/models/order.model.js";
import { Cook } from "../../cook/models/cook.model.js";
import paymentService from "../services/payment.service.js";

/**
 * Create payment intent for order
 * POST /api/customer/payments/create-intent
 */
export const createPaymentIntent = async (req, res) => {
  try {
    const customerId = req.user._id;
    const { orderId, cookId, amount } = req.body;

    // Validate required fields
    if (!orderId || !cookId || !amount) {
      return res.status(400).json({ 
        message: "orderId, cookId, and amount are required" 
      });
    }

    // Validate amount
    if (typeof amount !== "number" || amount <= 0) {
      return res.status(400).json({ 
        message: "Amount must be a positive number" 
      });
    }

    // Verify order exists and belongs to customer
    const order = await Order.findOne({ _id: orderId, customerId });
    if (!order) {
      return res.status(404).json({ 
        message: "Order not found or does not belong to you" 
      });
    }

    // Check if payment intent already exists
    if (order.paymentIntentId) {
      return res.status(400).json({
        message: "Payment already initiated for this order",
        existingIntentId: order.paymentIntentId,
      });
    }

    // Verify cook exists and has online payments enabled
    const cook = await Cook.findById(cookId);
    if (!cook) {
      return res.status(404).json({ message: "Cook not found" });
    }

    if (!cook.isOnlinePaymentEnabled) {
      return res.status(400).json({
        message: "This cook does not accept online payments",
        action: "use_cod",
      });
    }

    if (!cook.stripeAccountId) {
      return res.status(400).json({
        message: "Cook has not completed payment setup",
        action: "use_cod",
      });
    }

    if (cook.stripeAccountStatus !== "active") {
      return res.status(400).json({
        message: "Cook's payment account is not active",
        action: "use_cod",
      });
    }

    // Create payment intent with destination charges
    const { paymentIntentId, clientSecret } = await paymentService.createPaymentIntent(
      amount,
      "pkr",
      cook.stripeAccountId,
      {
        orderId: String(orderId),
        cookId: String(cookId),
        customerId: String(customerId),
        orderNumber: order.orderNumber,
      }
    );

    // Update order with payment intent ID
    order.paymentIntentId = paymentIntentId;
    order.paymentMethod = "card";
    await order.save();

    return res.status(200).json({
      success: true,
      clientSecret,
      paymentIntentId,
      message: "Payment intent created successfully",
    });
  } catch (error) {
    console.error("Create payment intent error:", error);
    return res.status(500).json({ 
      success: false,
      message: "Failed to create payment intent",
      error: error.message 
    });
  }
};

/**
 * Confirm payment after successful Stripe payment
 * POST /api/customer/payments/confirm
 */
export const confirmPayment = async (req, res) => {
  try {
    const customerId = req.user._id;
    const { orderId, paymentIntentId } = req.body;

    // Validate required fields
    if (!orderId || !paymentIntentId) {
      return res.status(400).json({ 
        message: "orderId and paymentIntentId are required" 
      });
    }

    // Verify order exists and belongs to customer
    const order = await Order.findOne({ _id: orderId, customerId });
    if (!order) {
      return res.status(404).json({ 
        message: "Order not found or does not belong to you" 
      });
    }

    // Verify payment intent matches order
    if (order.paymentIntentId !== paymentIntentId) {
      return res.status(400).json({
        message: "Payment intent does not match order",
      });
    }

    // Retrieve payment intent from Stripe to verify status
    const paymentIntent = await paymentService.retrievePaymentIntent(paymentIntentId);

    if (paymentIntent.status !== "succeeded") {
      return res.status(400).json({
        message: "Payment has not been completed",
        paymentStatus: paymentIntent.status,
      });
    }

    // Update order payment status
    order.paymentStatus = "paid";
    order.paymentCompletedAt = new Date();
    await order.save();

    return res.status(200).json({
      success: true,
      message: "Payment confirmed successfully",
      order: {
        _id: order._id,
        orderNumber: order.orderNumber,
        paymentStatus: order.paymentStatus,
        paymentCompletedAt: order.paymentCompletedAt,
      },
    });
  } catch (error) {
    console.error("Confirm payment error:", error);
    return res.status(500).json({ 
      success: false,
      message: "Failed to confirm payment",
      error: error.message 
    });
  }
};
