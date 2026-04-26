import cron from "node-cron";
import { Order } from "../models/order.model.js";
import { emitToCustomer, emitToCook } from "../utils/socket.js";
import { sendPushToUser } from "../utils/push.js";
import { Customer } from "../../modules/customer/models/customer.model.js";

/**
 * Start all order-related cron jobs
 */
export const startOrderJobs = () => {
  // Run every minute
  cron.schedule("* * * * *", async () => {
    await cancelUnpaidOrders();
    await autoCancelUnresponsiveOrders();
    await autoCompleteDeliveredOrders();
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

/**
 * Auto-complete orders that have been 'out_for_delivery' for more than 30 mins
 * beyond their estimated delivery time.
 */
const autoCompleteDeliveredOrders = async () => {
  try {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

    // Find orders that are:
    // 1. Stuck in "out_for_delivery"
    // 2. estimatedDeliveryAt is 30+ minutes in the past
    // Note: If estimatedDeliveryAt is null/undefined, this logic skips them
    // to be safe, but usually it's set when status changes to 'out_for_delivery'.
    const stuckOrders = await Order.find({
      status: "out_for_delivery",
      estimatedDeliveryAt: { $lte: thirtyMinutesAgo },
    });

    if (stuckOrders.length === 0) {
      return;
    }

    console.log(`🚚 Found ${stuckOrders.length} order(s) stuck in delivery to auto-complete`);

    for (const order of stuckOrders) {
      try {
        order.status = "delivered";
        order.deliveredAt = new Date();
        await order.save();

        console.log(`✅ Auto-completed order #${order.orderNumber}`);

        // Notify customer via socket
        emitToCustomer(order.customerId.toString(), "order_status_updated", {
          orderId: order._id,
          orderNumber: order.orderNumber,
          status: "delivered",
          message: "Your order has been marked as delivered by the system.",
        });

        // Notify customer via push
        const customerForPush = await Customer.findById(order.customerId);
        if (customerForPush) {
          await sendPushToUser(customerForPush, {
            title: "Order Delivered",
            body: `Order #${order.orderNumber} has been automatically marked as delivered. Enjoy your meal!`,
            url: `/orders/${order._id}`,
          });
        }

        // Notify cook via socket
        emitToCook(order.cookId.toString(), "order_status_updated", {
          orderId: order._id,
          orderNumber: order.orderNumber,
          status: "delivered",
          message: `Order #${order.orderNumber} was auto-completed by system (30m after ETA).`,
        });

      } catch (error) {
        console.error(`❌ Error auto-completing order #${order.orderNumber}:`, error);
      }
    }
  } catch (error) {
    console.error("❌ Auto-complete delivered orders job error:", error);
  }
};
