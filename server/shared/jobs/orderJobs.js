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
