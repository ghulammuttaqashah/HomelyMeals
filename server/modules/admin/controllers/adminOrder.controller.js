import { Order } from "../../../shared/models/order.model.js";
import { emitToCustomer, emitToCook } from "../../../shared/utils/socket.js";

/**
 * Get all orders with filters
 * GET /api/admin/orders
 */
export const getOrders = async (req, res) => {
  try {
    const { 
      status, 
      paymentStatus,
      cancelledBy,
      cookId,
      customerId,
      startDate,
      endDate,
      page = 1, 
      limit = 20 
    } = req.query;

    const query = {};

    if (status) {
      query.status = status;
    }

    if (paymentStatus) {
      query.paymentStatus = paymentStatus;
    }

    if (cookId) {
      query.cookId = cookId;
    }

    if (customerId) {
      query.customerId = customerId;
    }

    // Filter by cancelledBy (for auto-cancelled orders)
    if (cancelledBy) {
      query.cancelledBy = cancelledBy;
      // Ensure we only get cancelled orders when filtering by cancelledBy
      if (!status || status !== 'cancelled') {
        query.status = 'cancelled';
      }
    }

    // Date range filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [orders, total] = await Promise.all([
      Order.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate("customerId", "name email contact")
        .populate("cookId", "name email contact"),
      Order.countDocuments(query),
    ]);

    // Get counts for dashboard
    const [
      activeCount,
      deliveredCount,
    ] = await Promise.all([
      Order.countDocuments({ status: { $in: ["confirmed", "preparing", "out_for_delivery"] } }),
      Order.countDocuments({ status: "delivered" }),
    ]);

    return res.status(200).json({
      orders: orders.map((order) => ({
        _id: order._id,
        orderNumber: order.orderNumber,
        customer: order.customerId ? {
          _id: order.customerId._id,
          name: order.customerId.name,
          email: order.customerId.email,
          contact: order.customerId.contact,
        } : null,
        cook: order.cookId ? {
          _id: order.cookId._id,
          name: order.cookId.name,
          email: order.cookId.email,
          contact: order.cookId.contact,
        } : null,
        itemsCount: order.items.length,
        totalAmount: order.totalAmount,
        status: order.status,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        createdAt: order.createdAt,
      })),
      counts: {
        active: activeCount,
        delivered: deliveredCount,
      },
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Admin get orders error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * Get single order details
 * GET /api/admin/orders/:id
 */
export const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id)
      .populate("customerId", "name email contact address")
      .populate("cookId", "name email contact address paymentAccounts");

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }



    return res.status(200).json({
      order: {
        _id: order._id,
        orderNumber: order.orderNumber,
        customer: order.customerId ? {
          _id: order.customerId._id,
          name: order.customerId.name,
          email: order.customerId.email,
          contact: order.customerId.contact,
          address: order.customerId.address,
        } : null,
        cook: order.cookId ? {
          _id: order.cookId._id,
          name: order.cookId.name,
          email: order.cookId.email,
          contact: order.cookId.contact,
          address: order.cookId.address,
          paymentAccounts: order.cookId.paymentAccounts?.filter(acc => acc.isActive),
        } : null,
        items: order.items,
        subtotal: order.subtotal,
        deliveryCharges: order.deliveryCharges,
        totalAmount: order.totalAmount,
        deliveryAddress: order.deliveryAddress,
        distance: order.distance,
        estimatedTime: order.estimatedTime,
        deliveryNote: order.deliveryNote,
        status: order.status,
        statusHistory: order.statusHistory,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        paymentProofUrl: order.paymentProof,
        paymentDeadline: order.paymentDeadline,
        paymentRejections: order.paymentRejections,
        cookNote: order.cookNote,
        rejectionReason: order.rejectionReason,
        cancellationReason: order.cancellationReason,
        cancelledBy: order.cancelledBy,
        customerDeliveryResponse: order.customerDeliveryResponse,
        cookDeliveryConfirmed: order.cookDeliveryConfirmed,
        expiresAt: order.expiresAt,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      },
    });
  } catch (error) {
    console.error("Admin get order by ID error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * Cancel order (admin override)
 * PATCH /api/admin/orders/:id/cancel
 */
export const cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const adminId = req.user.id;

    if (!reason) {
      return res.status(400).json({ message: "Cancellation reason is required" });
    }

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (["delivered", "cancelled"].includes(order.status)) {
      return res.status(400).json({ message: "Order cannot be cancelled" });
    }

    order.status = "cancelled";
    order.cancelledBy = "admin";
    order.cancellationReason = `Cancelled by admin: ${reason}`;
    order.cancelledAt = new Date();

    await order.save();

    // Notify customer and cook
    emitToCustomer(order.customerId, "orderUpdate", {
      orderId: order._id,
      status: order.status,
      message: `Your order has been cancelled by admin: ${reason}`,
    });

    emitToCook(order.cookId, "orderUpdate", {
      orderId: order._id,
      status: order.status,
      message: `Order has been cancelled by admin: ${reason}`,
    });

    return res.status(200).json({
      message: "Order cancelled successfully",
      order: {
        _id: order._id,
        status: order.status,
      },
    });
  } catch (error) {
    console.error("Admin cancel order error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * Override payment status
 * PATCH /api/admin/orders/:id/payment-status
 */
export const updatePaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentStatus, note } = req.body;
    const adminId = req.user.id;

    const validStatuses = ["unpaid", "verification_pending", "verified", "rejected", "paid"];
    if (!validStatuses.includes(paymentStatus)) {
      return res.status(400).json({ 
        message: "Invalid payment status. Valid values: unpaid, verification_pending, verified, rejected, paid" 
      });
    }

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    order.paymentStatus = paymentStatus;

    await order.save();

    // Notify customer and cook
    emitToCustomer(order.customerId, "orderUpdate", {
      orderId: order._id,
      paymentStatus: order.paymentStatus,
      message: `Payment status updated to ${paymentStatus}`,
    });

    emitToCook(order.cookId, "orderUpdate", {
      orderId: order._id,
      paymentStatus: order.paymentStatus,
      message: `Payment status updated to ${paymentStatus}`,
    });

    return res.status(200).json({
      message: "Payment status updated successfully",
      order: {
        _id: order._id,
        paymentStatus: order.paymentStatus,
      },
    });
  } catch (error) {
    console.error("Admin update payment status error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * Get order statistics
 * GET /api/admin/orders/statistics
 */
export const getOrderStatistics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    const matchStage = Object.keys(dateFilter).length > 0 
      ? { createdAt: dateFilter } 
      : {};

    const [
      totalOrders,
      statusCounts,
      paymentMethodCounts,
      revenueStats,
    ] = await Promise.all([
      Order.countDocuments(matchStage),
      Order.aggregate([
        { $match: matchStage },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      Order.aggregate([
        { $match: matchStage },
        { $group: { _id: "$paymentMethod", count: { $sum: 1 } } },
      ]),
      Order.aggregate([
        { $match: { ...matchStage, status: "delivered" } },
        { 
          $group: { 
            _id: null, 
            totalRevenue: { $sum: "$totalAmount" },
            totalDeliveryFees: { $sum: "$deliveryFee" },
            avgOrderValue: { $avg: "$totalAmount" },
          } 
        },
      ]),
    ]);

    // Format status counts
    const statusBreakdown = {};
    statusCounts.forEach((item) => {
      statusBreakdown[item._id] = item.count;
    });

    // Format payment method counts
    const paymentBreakdown = {};
    paymentMethodCounts.forEach((item) => {
      paymentBreakdown[item._id] = item.count;
    });

    const revenue = revenueStats[0] || {
      totalRevenue: 0,
      totalDeliveryFees: 0,
      avgOrderValue: 0,
    };

    return res.status(200).json({
      totalOrders,
      statusBreakdown,
      paymentBreakdown,
      revenue: {
        total: revenue.totalRevenue,
        deliveryFees: revenue.totalDeliveryFees,
        averageOrderValue: Math.round(revenue.avgOrderValue || 0),
      },
    });
  } catch (error) {
    console.error("Admin get order statistics error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};
