import { Order } from "../../../shared/models/order.model.js";
import { calculateEstimatedDeliveryTime } from "../../../shared/utils/distance.js";
import { emitToCustomer } from "../../../shared/utils/socket.js";
import { sendPushToUser } from "../../../shared/utils/push.js";
import { Customer } from "../../customer/models/customer.model.js";

/**
 * Get cook's orders
 * GET /api/cook/orders
 */
export const getOrders = async (req, res) => {
  try {
    const cookId = req.user._id;
    const { status, page = 1, limit = 10 } = req.query;

    const query = { cookId };

    if (status) {
      if (status === "active") {
        query.status = { $in: ["confirmed", "preparing", "out_for_delivery"] };
      } else if (status === "completed") {
        query.status = "delivered";
      } else if (status === "cancelled") {
        query.status = "cancelled";
      } else {
        query.status = status;
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [orders, total] = await Promise.all([
      Order.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate("customerId", "name contact"),
      Order.countDocuments(query),
    ]);

    // Get active orders count for badge
    const activeCount = await Order.countDocuments({ 
      cookId, 
      status: { $in: ["confirmed", "preparing", "out_for_delivery"] } 
    });

    return res.status(200).json({
      orders: orders.map((order) => ({
        _id: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        items: order.items,
        subtotal: order.subtotal,
        deliveryCharges: order.deliveryCharges,
        totalAmount: order.totalAmount,
        distance: order.distance,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        customer: order.customerId ? {
          name: order.customerId.name,
          contact: order.customerId.contact,
        } : null,
        cancellationRequest: order.cancellationRequest,
        itemsCount: order.items?.length || 0,
        createdAt: order.createdAt,
      })),
      activeCount,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Get cook orders error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * Get single order details
 * GET /api/cook/orders/:id
 */
export const getOrderById = async (req, res) => {
  try {
    const cookId = req.user._id;
    const { id } = req.params;

    const order = await Order.findOne({ _id: id, cookId })
      .populate("customerId", "name contact email");

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }



    return res.status(200).json({
      order: {
        _id: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        items: order.items,
        subtotal: order.subtotal,
        deliveryCharges: order.deliveryCharges,
        totalAmount: order.totalAmount,
        deliveryAddress: order.deliveryAddress,
        distance: order.distance,
        estimatedTime: order.estimatedTime,
        deliveryNote: order.deliveryNote,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        paymentProof: order.paymentProof,
        paymentRejectionReason: order.paymentRejectionReason,
        paymentRejectionCount: order.paymentRejectionCount,
        rejectionReason: order.rejectionReason,
        cancellationReason: order.cancellationReason,
        cancelledBy: order.cancelledBy,
        cancellationRequest: order.cancellationRequest,
        customer: order.customerId ? {
          _id: order.customerId._id,
          name: order.customerId.name,
          contact: order.customerId.contact,
          email: order.customerId.email,
        } : null,
        paymentDeadline: order.paymentDeadline,
        confirmedAt: order.confirmedAt,
        preparingAt: order.preparingAt,
        outForDeliveryAt: order.outForDeliveryAt,
        estimatedDeliveryAt: order.estimatedDeliveryAt,
        deliveredAt: order.deliveredAt,
        createdAt: order.createdAt,
      },
    });
  } catch (error) {
    console.error("Get cook order by ID error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * Update order status
 * PUT /api/cook/orders/:id/status
 */
export const updateOrderStatus = async (req, res) => {
  try {
    const cookId = req.user._id;
    const { id } = req.params;
    const { status, deliveryNote } = req.body;

    const validTransitions = {
      confirmed: ["preparing"],
      preparing: ["out_for_delivery"],
      out_for_delivery: ["delivered"],
    };

    const order = await Order.findOne({ _id: id, cookId });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Check valid transition
    if (!validTransitions[order.status]?.includes(status)) {
      return res.status(400).json({
        message: `Cannot change status from '${order.status}' to '${status}'`,
      });
    }

    // For preparing: check payment is verified or paid (for online payments)
    if (status === "preparing" && order.paymentMethod !== "cod") {
      if (order.paymentStatus !== "verified" && order.paymentStatus !== "paid") {
        return res.status(400).json({
          message: "Cannot start preparing until payment is verified or paid",
        });
      }
    }

    order.status = status;

    if (status === "preparing") {
      order.preparingAt = new Date();
    } else if (status === "out_for_delivery") {
      order.outForDeliveryAt = new Date();
      order.estimatedDeliveryAt = new Date(
        Date.now() + calculateEstimatedDeliveryTime(order.distance) * 60 * 1000
      );
      if (deliveryNote) {
        order.deliveryNote = deliveryNote;
      }
    } else if (status === "delivered") {
      order.deliveredAt = new Date();
      // For COD orders, mark payment as paid
      if (order.paymentMethod === "cod") {
        order.paymentStatus = "paid";
      }
    }

    await order.save();

    // Notify customer
    const statusMessages = {
      preparing: "Your order is being prepared!",
      out_for_delivery: `Your order is out for delivery! Estimated arrival: ${order.estimatedTime} minutes`,
      delivered: "Your order has been delivered! Thank you for ordering.",
    };

    emitToCustomer(order.customerId.toString(), "order_status_updated", {
      orderId: order._id,
      orderNumber: order.orderNumber,
      status: order.status,
      estimatedDeliveryAt: order.estimatedDeliveryAt,
      deliveryNote: order.deliveryNote,
      message: statusMessages[status],
    });

    const customerForPush = await Customer.findById(order.customerId);
    await sendPushToUser(customerForPush, {
      title: "Order Update",
      body: statusMessages[status],
      url: `/orders/${order._id}`,
    });

    return res.status(200).json({
      message: "Order status updated",
      order: {
        _id: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        estimatedDeliveryAt: order.estimatedDeliveryAt,
      },
    });
  } catch (error) {
    console.error("Update order status error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * Verify or reject payment proof
 * POST /api/cook/orders/:id/verify-payment
 */
export const verifyPayment = async (req, res) => {
  try {
    const cookId = req.user._id;
    const { id } = req.params;
    const { action, reason } = req.body; // action: "verify" or "reject"

    if (!["verify", "reject"].includes(action)) {
      return res.status(400).json({ message: "Invalid action. Use 'verify' or 'reject'" });
    }

    const order = await Order.findOne({ _id: id, cookId });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.paymentStatus !== "verification_pending") {
      return res.status(400).json({ message: "No payment proof to verify" });
    }

    if (action === "verify") {
      order.paymentStatus = "verified";
      await order.save();

      emitToCustomer(order.customerId.toString(), "payment_verified", {
        orderId: order._id,
        orderNumber: order.orderNumber,
        message: "Your payment has been verified!",
      });

      const customerForPush = await Customer.findById(order.customerId);
      await sendPushToUser(customerForPush, {
        title: "Payment Verified",
        body: `Payment for order #${order.orderNumber} successfully verified.`,
        url: `/orders/${order._id}`,
      });

      return res.status(200).json({
        message: "Payment verified successfully",
        order: {
          _id: order._id,
          orderNumber: order.orderNumber,
          paymentStatus: order.paymentStatus,
        },
      });
    } else {
      // Reject payment
      if (!reason) {
        return res.status(400).json({ message: "Rejection reason is required" });
      }

      order.paymentStatus = "rejected";
      order.paymentRejectionReason = reason;
      order.paymentRejectionCount += 1;
      order.paymentProof = undefined; // Clear proof so customer can re-upload
      order.paymentStatus = "unpaid";
      
      emitToCustomer(order.customerId.toString(), "payment_rejected", {
        orderId: order._id,
        orderNumber: order.orderNumber,
        reason,
        attemptsLeft: 3 - order.paymentRejectionCount,
        message: `Payment proof rejected: ${reason}. Please re-upload.`,
      });

      const customerForPush = await Customer.findById(order.customerId);
      await sendPushToUser(customerForPush, {
        title: "Payment Rejected",
        body: `Payment proof for order #${order.orderNumber} issue: ${reason}.`,
        url: `/orders/${order._id}`,
      });

      await order.save();

      return res.status(200).json({
        message: "Payment rejected",
        order: {
          _id: order._id,
          orderNumber: order.orderNumber,
          paymentStatus: order.paymentStatus,
          paymentRejectionCount: order.paymentRejectionCount,
        },
      });
    }
  } catch (error) {
    console.error("Verify payment error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * Add delivery note
 * PUT /api/cook/orders/:id/delivery-note
 */
export const addDeliveryNote = async (req, res) => {
  try {
    const cookId = req.user._id;
    const { id } = req.params;
    const { note } = req.body;

    const order = await Order.findOne({ _id: id, cookId });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.status !== "out_for_delivery") {
      return res.status(400).json({ message: "Can only add note when order is out for delivery" });
    }

    order.deliveryNote = note;
    await order.save();

    emitToCustomer(order.customerId.toString(), "delivery_note_updated", {
      orderId: order._id,
      orderNumber: order.orderNumber,
      deliveryNote: note,
      message: `Cook added a delivery note: ${note}`,
    });

    return res.status(200).json({
      message: "Delivery note added",
      order: {
        _id: order._id,
        orderNumber: order.orderNumber,
        deliveryNote: order.deliveryNote,
      },
    });
  } catch (error) {
    console.error("Add delivery note error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * Respond to cancellation request from customer
 * PATCH /api/cook/orders/:id/cancellation-response
 */
export const respondToCancellationRequest = async (req, res) => {
  try {
    const cookId = req.user._id;
    const { id } = req.params;
    const { action, response: cookResponse } = req.body; // action: "accept" or "reject"

    if (!["accept", "reject"].includes(action)) {
      return res.status(400).json({ message: "Invalid action. Use 'accept' or 'reject'" });
    }

    const order = await Order.findOne({ _id: id, cookId });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (!order.cancellationRequest || order.cancellationRequest.status !== "pending") {
      return res.status(400).json({ message: "No pending cancellation request for this order" });
    }

    if (action === "accept") {
      // Accept cancellation - cancel the order
      order.cancellationRequest.status = "accepted";
      order.cancellationRequest.respondedAt = new Date();
      order.cancellationRequest.cookResponse = cookResponse || "";
      order.status = "cancelled";
      order.cancelledBy = "customer";
      order.cancellationReason = order.cancellationRequest.reason;
      order.cancelledAt = new Date();
      await order.save();

      emitToCustomer(order.customerId.toString(), "cancellation_accepted", {
        orderId: order._id,
        orderNumber: order.orderNumber,
        message: `Your cancellation request for order #${order.orderNumber} has been accepted`,
      });

      const customerForPush = await Customer.findById(order.customerId);
      await sendPushToUser(customerForPush, {
        title: "Cancellation Accepted",
        body: `Your cancellation request for order #${order.orderNumber} has been accepted`,
        url: `/orders/${order._id}`,
      });

      return res.status(200).json({
        message: "Cancellation request accepted. Order has been cancelled.",
        order: {
          _id: order._id,
          orderNumber: order.orderNumber,
          status: order.status,
          cancellationRequest: order.cancellationRequest,
        },
      });
    } else {
      // Reject cancellation
      order.cancellationRequest.status = "rejected";
      order.cancellationRequest.respondedAt = new Date();
      order.cancellationRequest.cookResponse = cookResponse || "";
      await order.save();

      emitToCustomer(order.customerId.toString(), "cancellation_rejected", {
        orderId: order._id,
        orderNumber: order.orderNumber,
        reason: cookResponse,
        message: `Your cancellation request for order #${order.orderNumber} was declined by the cook`,
      });

      const customerForPush = await Customer.findById(order.customerId);
      await sendPushToUser(customerForPush, {
        title: "Cancellation Declined",
        body: `Your cancellation request for order #${order.orderNumber} was declined`,
        url: `/orders/${order._id}`,
      });

      return res.status(200).json({
        message: "Cancellation request rejected",
        order: {
          _id: order._id,
          orderNumber: order.orderNumber,
          cancellationRequest: order.cancellationRequest,
        },
      });
    }
  } catch (error) {
    console.error("Respond to cancellation request error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * Cancel order explicitly by cook
 * PATCH /api/cook/orders/:id/cancel
 */
export const cancelOrderByCook = async (req, res) => {
  try {
    const cookId = req.user._id;
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({ message: "Cancellation reason is required" });
    }

    const order = await Order.findOne({ _id: id, cookId });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Online payment orders cannot be cancelled
    if (order.paymentMethod !== "cod") {
      return res.status(400).json({
        message: "Online payment orders cannot be cancelled. Please contact support.",
      });
    }

    if (["delivered", "cancelled"].includes(order.status)) {
      return res.status(400).json({
        message: "Order cannot be cancelled in current status",
        currentStatus: order.status,
      });
    }

    if (order.cancellationRequest?.status === "pending") {
      order.cancellationRequest.status = "accepted";
      order.cancellationRequest.respondedAt = new Date();
      order.cancellationRequest.cookResponse = reason.trim();
    }

    order.status = "cancelled";
    order.cancelledBy = "cook";
    order.cancellationReason = reason.trim();
    order.cancelledAt = new Date();
    await order.save();

    emitToCustomer(order.customerId.toString(), "order_cancelled", {
      orderId: order._id,
      orderNumber: order.orderNumber,
      reason: reason.trim(),
      cancelledBy: "cook",
      message: `Your order #${order.orderNumber} was cancelled by the cook: ${reason.trim()}`,
    });

    const customerForPush = await Customer.findById(order.customerId);
    await sendPushToUser(customerForPush, {
      title: "Order Cancelled",
      body: `Your order #${order.orderNumber} was cancelled by the cook: ${reason.trim()}`,
      url: `/orders/${order._id}`,
    });

    return res.status(200).json({
      message: "Order cancelled successfully",
      order: {
        _id: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        cancelledBy: order.cancelledBy,
        cancellationReason: order.cancellationReason,
        cancelledAt: order.cancelledAt,
      },
    });
  } catch (error) {
    console.error("Cook cancel order error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};
