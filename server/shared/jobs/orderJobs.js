import cron from "node-cron";
import { Order } from "../models/order.model.js";
import { emitToCustomer, emitToCook } from "../utils/socket.js";

/**
 * Start all order-related cron jobs
 */
export const startOrderJobs = () => {
  // Run every minute
  cron.schedule("* * * * *", async () => {
    await cancelUnpaidOrders();
    await autoCancelUnresponsiveOrders();
  });

  console.log("📅 Order cron jobs started");
};

/**
 * Cancel orders where payment wasn't submitted within deadline (10 min after confirmation)
 */
const cancelUnpaidOrders = async () => {
  try {
    const now = new Date();
    
    const unpaidOrders = await Order.find({
      status: "confirmed",
      paymentMethod: { $ne: "cod" },
      paymentStatus: "unpaid",
      paymentDeadline: { $lte: now },
    });

    for (const order of unpaidOrders) {
      order.status = "cancelled";
      order.cancelledBy = "system";
      order.cancellationReason = "Payment not submitted within time limit";
      order.cancelledAt = now;
      await order.save();

      // Notify customer
      emitToCustomer(order.customerId.toString(), "order_cancelled", {
        orderId: order._id,
        orderNumber: order.orderNumber,
        message: "Your order was cancelled because payment was not submitted in time.",
      });

      // Notify cook
      emitToCook(order.cookId.toString(), "order_cancelled", {
        orderId: order._id,
        orderNumber: order.orderNumber,
        message: "Order cancelled - customer did not submit payment in time.",
      });

      console.log(`💰 Order ${order.orderNumber} cancelled - payment timeout`);
    }
  } catch (error) {
    console.error("Error cancelling unpaid orders:", error);
  }
};

/**
 * Auto-cancel COD orders where cook didn't respond within 5 minutes
 * Only applies to COD orders in "confirmed" status
 */
const autoCancelUnresponsiveOrders = async () => {
  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    // Find COD orders that are:
    // 1. Still in "confirmed" status
    // 2. Payment method is COD
    // 3. Confirmed more than 5 minutes ago
    const expiredOrders = await Order.find({
      status: "confirmed",
      paymentMethod: "cod",
      confirmedAt: { $lte: fiveMinutesAgo },
    });

    if (expiredOrders.length === 0) {
      return;
    }

    console.log(`⏰ Found ${expiredOrders.length} unresponsive COD order(s) to auto-cancel`);

    for (const order of expiredOrders) {
      try {
        order.status = "cancelled";
        order.cancelledBy = "system";
        order.cancellationReason = "Cook did not respond within 5 minutes";
        order.cancelledAt = new Date();
        await order.save();

        console.log(`✅ Auto-cancelled order #${order.orderNumber}`);

        // Notify customer with toast-friendly message
        emitToCustomer(order.customerId.toString(), "order_auto_cancelled", {
          orderId: order._id,
          orderNumber: order.orderNumber,
          reason: "Cook did not respond within 5 minutes",
          message: `Order #${order.orderNumber} was automatically cancelled - cook did not respond in time.`,
        });

        // Notify cook with toast-friendly message
        emitToCook(order.cookId.toString(), "order_auto_cancelled", {
          orderId: order._id,
          orderNumber: order.orderNumber,
          reason: "Did not respond within 5 minutes",
          message: `Order #${order.orderNumber} was automatically cancelled due to no response.`,
        });
      } catch (error) {
        console.error(`❌ Error auto-cancelling order #${order.orderNumber}:`, error);
      }
    }
  } catch (error) {
    console.error("❌ Auto-cancel unresponsive orders job error:", error);
  }
};
