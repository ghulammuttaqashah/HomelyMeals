import { Complaint, CUSTOMER_COMPLAINT_TYPES } from "../../../shared/models/complaint.model.js";
import { Order } from "../../../shared/models/order.model.js";
import { Customer } from "../models/customer.model.js";
import { sendEmail } from "../../../shared/utils/sendEmail.js";

/**
 * Create a complaint
 * POST /api/customer/complaints
 */
export const createComplaint = async (req, res) => {
  try {
    const customerId = req.user._id;
    const { orderId, type, description, proofUrls } = req.body;

    // Validate required fields
    if (!orderId || !type || !description) {
      return res.status(400).json({ message: "Order, type, and description are required" });
    }

    // Validate complaint type
    if (!CUSTOMER_COMPLAINT_TYPES.includes(type)) {
      return res.status(400).json({
        message: "Invalid complaint type",
        validTypes: CUSTOMER_COMPLAINT_TYPES,
      });
    }

    // Validate proof images limit
    if (proofUrls && proofUrls.length > 5) {
      return res.status(400).json({ message: "Maximum 5 proof images allowed" });
    }

    // Verify order belongs to customer
    const order = await Order.findOne({ _id: orderId, customerId });
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Check for duplicate complaint
    const existing = await Complaint.findOne({ complainantId: customerId, orderId });
    if (existing) {
      return res.status(400).json({ message: "You have already filed a complaint for this order" });
    }

    // Create complaint
    const complaint = new Complaint({
      orderId,
      complainantType: "customer",
      complainantId: customerId,
      againstUserId: order.cookId,
      type,
      description: description.trim(),
      proofUrls: proofUrls
        ? proofUrls.map((url) => ({ url, uploadedAt: new Date() }))
        : [],
    });

    await complaint.save();

    // Send confirmation email
    try {
      const customer = await Customer.findById(customerId);
      if (customer?.email) {
        await sendEmail(
          customer.email,
          "Complaint Received — HomelyMeals",
          `Hi ${customer.name},\n\nYour complaint regarding order #${order.orderNumber} has been received.\n\nType: ${type}\nDescription: ${description}\n\nOur team will review your complaint and get back to you soon.\n\nThank you,\nHomelyMeals Team`
        );
      }
    } catch (emailErr) {
      console.error("Failed to send complaint confirmation email:", emailErr.message);
    }

    return res.status(201).json({
      message: "Complaint submitted successfully",
      complaint: {
        _id: complaint._id,
        orderId: complaint.orderId,
        type: complaint.type,
        status: complaint.status,
        createdAt: complaint.createdAt,
      },
    });
  } catch (error) {
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({ message: "You have already filed a complaint for this order" });
    }
    console.error("Create complaint error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * Get customer's complaints
 * GET /api/customer/complaints
 */
export const getMyComplaints = async (req, res) => {
  try {
    const customerId = req.user._id;

    const complaints = await Complaint.find({ complainantId: customerId })
      .sort({ createdAt: -1 })
      .populate("orderId", "orderNumber totalAmount status");

    return res.status(200).json({ complaints });
  } catch (error) {
    console.error("Get my complaints error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * Get single complaint details
 * GET /api/customer/complaints/:id
 */
export const getComplaintById = async (req, res) => {
  try {
    const customerId = req.user._id;
    const { id } = req.params;

    const complaint = await Complaint.findOne({ _id: id, complainantId: customerId })
      .populate("orderId", "orderNumber totalAmount status items createdAt");

    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    return res.status(200).json({ complaint });
  } catch (error) {
    console.error("Get complaint by ID error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * Get warnings issued to the customer
 * GET /api/customer/complaints/my-warnings
 */
export const getMyWarnings = async (req, res) => {
  try {
    const customerId = req.user._id;

    const warnings = await (await import("../../../shared/models/warning.model.js")).Warning
      .find({ userId: customerId, userType: "customer" })
      .sort({ createdAt: -1 })
      .populate("complaintId", "type orderId status");

    return res.status(200).json({ warnings });
  } catch (error) {
    console.error("Get my warnings error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};
