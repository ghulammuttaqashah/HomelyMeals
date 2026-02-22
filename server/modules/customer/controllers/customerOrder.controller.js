import { Order } from "../../../shared/models/order.model.js";
import { Cook } from "../../cook/models/cook.model.js";
import CookMeal from "../../cook/models/cookMeal.model.js";
import { calculateDistance, isWithinDeliveryRange, calculateEstimatedDeliveryTime } from "../../../shared/utils/distance.js";
import { calculateDeliveryCharges } from "../../../shared/utils/deliveryCharges.js";
import { emitToCook, emitToCustomer, emitToAdmins } from "../../../shared/utils/socket.js";

/**
 * Place a new order
 * POST /api/customer/orders
 */
export const placeOrder = async (req, res) => {
  try {
    const customerId = req.user._id;
    const { cookId, items, deliveryAddress, paymentMethod } = req.body;

    // Validate required fields
    if (!cookId || !items || !items.length || !deliveryAddress || !paymentMethod) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Validate delivery address has coordinates
    if (!deliveryAddress.latitude || !deliveryAddress.longitude) {
      return res.status(400).json({ message: "Delivery address must have coordinates" });
    }

    // Get cook details
    const cook = await Cook.findById(cookId);
    if (!cook) {
      return res.status(404).json({ message: "Cook not found" });
    }

    // Check cook status
    if (cook.status !== "active") {
      return res.status(400).json({ message: "Cook is not available" });
    }

    if (cook.verificationStatus !== "approved") {
      return res.status(400).json({ message: "Cook is not verified" });
    }

    if (cook.serviceStatus !== "open") {
      return res.status(400).json({ message: "Cook's kitchen is currently closed" });
    }

    // Check cook has coordinates
    if (!cook.address?.location?.latitude || !cook.address?.location?.longitude) {
      return res.status(400).json({ message: "Cook location not available" });
    }

    // Calculate distance
    const cookCoords = {
      latitude: cook.address.location.latitude,
      longitude: cook.address.location.longitude,
    };
    const customerCoords = {
      latitude: deliveryAddress.latitude,
      longitude: deliveryAddress.longitude,
    };

    const { distance, duration } = await calculateDistance(cookCoords, customerCoords);

    // Check if within delivery range
    if (!isWithinDeliveryRange(distance, cook.maxDeliveryDistance)) {
      return res.status(400).json({
        message: `Delivery not available. Distance (${distance} km) exceeds cook's delivery range (${cook.maxDeliveryDistance} km)`,
        distance,
        maxRange: cook.maxDeliveryDistance,
      });
    }

    // Validate and calculate item totals
    let subtotal = 0;
    const orderItems = [];

    for (const item of items) {
      const meal = await CookMeal.findOne({ _id: item.mealId, cookId });
      if (!meal) {
        return res.status(404).json({ message: `Meal not found: ${item.mealId}` });
      }

      if (meal.availability !== "Available") {
        return res.status(400).json({ message: `Meal not available: ${meal.name}` });
      }

      const itemTotal = meal.price * item.quantity;
      subtotal += itemTotal;

      orderItems.push({
        mealId: meal._id,
        name: meal.name,
        price: meal.price,
        quantity: item.quantity,
        itemImage: meal.itemImage,
      });
    }

    // Calculate delivery charges
    const deliveryCharges = await calculateDeliveryCharges(distance);
    const totalAmount = subtotal + deliveryCharges;

    // Calculate estimated delivery time
    const estimatedTime = calculateEstimatedDeliveryTime(distance);

    // Set payment deadline for online payments (10 minutes)
    const paymentDeadline = paymentMethod !== "cod" 
      ? new Date(Date.now() + 10 * 60 * 1000) 
      : null;

    // Create order - automatically confirmed
    const order = new Order({
      customerId,
      cookId,
      items: orderItems,
      subtotal,
      deliveryCharges,
      totalAmount,
      deliveryAddress,
      distance,
      estimatedTime,
      paymentMethod,
      status: "confirmed",
      confirmedAt: new Date(),
      paymentDeadline,
    });

    await order.save();

    // Emit to cook about new order
    const cookIdStr = cookId.toString();
    console.log(`📤 Emitting new_order to cook: ${cookIdStr}`);
    emitToCook(cookIdStr, "new_order", {
      orderId: order._id.toString(),
      orderNumber: order.orderNumber,
      items: orderItems,
      totalAmount,
      paymentMethod,
      message: "You have a new order!",
    });

    return res.status(201).json({
      message: "Order placed successfully",
      order: {
        _id: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        items: order.items,
        subtotal: order.subtotal,
        deliveryCharges: order.deliveryCharges,
        totalAmount: order.totalAmount,
        distance: order.distance,
        estimatedTime: order.estimatedTime,
        paymentMethod: order.paymentMethod,
        paymentDeadline: order.paymentDeadline,
      },
    });
  } catch (error) {
    console.error("Place order error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * Get customer's orders
 * GET /api/customer/orders
 */
export const getOrders = async (req, res) => {
  try {
    const customerId = req.user._id;
    const { status, page = 1, limit = 10 } = req.query;

    const query = { customerId };

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
        .populate("cookId", "name contact address.city"),
      Order.countDocuments(query),
    ]);

    return res.status(200).json({
      orders: orders.map((order) => ({
        _id: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        items: order.items,
        subtotal: order.subtotal,
        deliveryCharges: order.deliveryCharges,
        totalAmount: order.totalAmount,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        cancelledBy: order.cancelledBy,
        cancellationReason: order.cancellationReason,
        cancellationRequest: order.cancellationRequest,
        rejectionReason: order.rejectionReason,
        cook: order.cookId ? {
          _id: order.cookId._id,
          name: order.cookId.name,
          contact: order.cookId.contact,
          city: order.cookId.address?.city,
        } : null,
        itemsCount: order.items?.length || 0,
        createdAt: order.createdAt,
      })),
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Get orders error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * Get single order details
 * GET /api/customer/orders/:id
 */
export const getOrderById = async (req, res) => {
  try {
    const customerId = req.user._id;
    const { id } = req.params;

    const order = await Order.findOne({ _id: id, customerId })
      .populate("cookId", "name contact address");

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
        rejectionReason: order.rejectionReason,
        cancellationReason: order.cancellationReason,
        cancelledBy: order.cancelledBy,
        cancellationRequest: order.cancellationRequest,
        customerDeliveryResponse: order.customerDeliveryResponse,
        cook: order.cookId ? {
          _id: order.cookId._id,
          name: order.cookId.name,
          contact: order.cookId.contact,
          city: order.cookId.address?.city,
        } : null,
        confirmedAt: order.confirmedAt,
        preparingAt: order.preparingAt,
        outForDeliveryAt: order.outForDeliveryAt,
        estimatedDeliveryAt: order.estimatedDeliveryAt,
        deliveredAt: order.deliveredAt,
        createdAt: order.createdAt,
      },
    });
  } catch (error) {
    console.error("Get order by ID error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * Cancel an order
 * POST /api/customer/orders/:id/cancel
 */
export const requestCancellation = async (req, res) => {
  try {
    const customerId = req.user._id;
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({ message: "Please provide a reason for cancellation" });
    }

    const order = await Order.findOne({ _id: id, customerId });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Cannot request cancellation for delivered or already cancelled orders
    if (["delivered", "cancelled"].includes(order.status)) {
      return res.status(400).json({
        message: "Cannot request cancellation for this order",
        currentStatus: order.status,
      });
    }

    // Check if there's already a pending cancellation request
    if (order.cancellationRequest?.status === "pending") {
      return res.status(400).json({
        message: "A cancellation request is already pending for this order",
      });
    }

    order.cancellationRequest = {
      status: "pending",
      reason: reason.trim(),
      requestedAt: new Date(),
    };
    await order.save();

    // Notify cook about cancellation request
    emitToCook(order.cookId.toString(), "cancellation_request", {
      orderId: order._id,
      orderNumber: order.orderNumber,
      reason: reason.trim(),
      message: `Customer requested to cancel order #${order.orderNumber}`,
    });

    return res.status(200).json({
      message: "Cancellation request sent to cook",
      order: {
        _id: order._id,
        orderNumber: order.orderNumber,
        cancellationRequest: order.cancellationRequest,
      },
    });
  } catch (error) {
    console.error("Request cancellation error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * Upload payment proof
 * POST /api/customer/orders/:id/payment-proof
 */
export const uploadPaymentProof = async (req, res) => {
  try {
    const customerId = req.user._id;
    const { id } = req.params;
    const { paymentProofUrl } = req.body;

    if (!paymentProofUrl) {
      return res.status(400).json({ message: "Payment proof URL is required" });
    }

    const order = await Order.findOne({ _id: id, customerId });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Validate order state
    if (order.status !== "confirmed") {
      return res.status(400).json({ message: "Order must be confirmed before uploading payment proof" });
    }

    if (order.paymentMethod === "cod") {
      return res.status(400).json({ message: "Payment proof not required for COD orders" });
    }

    if (order.paymentStatus === "verified") {
      return res.status(400).json({ message: "Payment already verified" });
    }

    // Check payment deadline
    if (order.paymentDeadline && new Date() > order.paymentDeadline) {
      return res.status(400).json({ message: "Payment deadline has passed" });
    }

    order.paymentProof = paymentProofUrl;
    order.paymentStatus = "verification_pending";
    order.paymentRejectionReason = undefined;
    await order.save();

    // Notify cook
    emitToCook(order.cookId.toString(), "payment_proof_uploaded", {
      orderId: order._id,
      orderNumber: order.orderNumber,
      message: "Customer has uploaded payment proof for verification",
    });

    return res.status(200).json({
      message: "Payment proof uploaded successfully",
      order: {
        _id: order._id,
        orderNumber: order.orderNumber,
        paymentStatus: order.paymentStatus,
      },
    });
  } catch (error) {
    console.error("Upload payment proof error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * Calculate delivery info (distance, charges) - for checkout preview
 * POST /api/customer/orders/calculate-delivery
 */
export const calculateDeliveryInfo = async (req, res) => {
  try {
    const { cookId, deliveryAddress } = req.body;

    if (!cookId || !deliveryAddress?.latitude || !deliveryAddress?.longitude) {
      return res.status(400).json({ message: "Cook ID and delivery coordinates required" });
    }

    const cook = await Cook.findById(cookId);
    if (!cook) {
      return res.status(404).json({ message: "Cook not found" });
    }

    if (!cook.address?.location?.latitude || !cook.address?.location?.longitude) {
      return res.status(400).json({ message: "Cook location not available" });
    }

    const cookCoords = {
      latitude: cook.address.location.latitude,
      longitude: cook.address.location.longitude,
    };
    const customerCoords = {
      latitude: deliveryAddress.latitude,
      longitude: deliveryAddress.longitude,
    };

    const { distance, duration } = await calculateDistance(cookCoords, customerCoords);
    const deliveryCharges = await calculateDeliveryCharges(distance);
    const estimatedTime = calculateEstimatedDeliveryTime(distance);
    const isWithinRange = isWithinDeliveryRange(distance, cook.maxDeliveryDistance);

    return res.status(200).json({
      distance,
      duration,
      deliveryCharges,
      estimatedTime,
      isWithinRange,
      maxDeliveryDistance: cook.maxDeliveryDistance,
    });
  } catch (error) {
    console.error("Calculate delivery info error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};
