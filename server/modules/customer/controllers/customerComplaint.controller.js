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

    const complaint = await Complaint.findOne({ 
      _id: id, 
      $or: [{ complainantId: customerId }, { againstUserId: customerId }]
    }).populate("orderId", "orderNumber totalAmount status items createdAt");

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

/**
 * Get complaints filed against the customer
 * GET /api/customer/complaints/against-me
 */
export const getComplaintsAgainstMe = async (req, res) => {
  try {
    const customerId = req.user._id;

    const complaints = await Complaint.find({ againstUserId: customerId, complainantType: "cook" })
      .sort({ createdAt: -1 })
      .populate("orderId", "orderNumber totalAmount status");

    return res.status(200).json({ complaints });
  } catch (error) {
    console.error("Get complaints against me error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * Submit a reply to a complaint thread
 * POST /api/customer/complaints/:id/reply
 */
export const submitReply = async (req, res) => {
  try {
    const customerId = req.user._id;
    const { id } = req.params;
    const { text, proofUrls } = req.body;

    if (!text || !text.trim() || text.trim().length < 10) {
      return res.status(400).json({ message: "Reply text is required (minimum 10 characters)" });
    }

    if (proofUrls && proofUrls.length > 5) {
      return res.status(400).json({ message: "Maximum 5 proof images allowed" });
    }

    const complaint = await Complaint.findById(id);
    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    // Verify this customer is either the complainant or the accused
    const isComplainant = String(complaint.complainantId) === String(customerId);
    const isAccused = String(complaint.againstUserId) === String(customerId);
    if (!isComplainant && !isAccused) {
      return res.status(403).json({ message: "You are not authorized to reply to this complaint" });
    }

    // Check complaint is still open
    if (["resolved", "rejected"].includes(complaint.status)) {
      return res.status(400).json({ message: "This complaint has been closed. No further replies allowed." });
    }

    const customer = await Customer.findById(customerId).select("name");

    // Push reply
    complaint.responses.push({
      senderId: customerId,
      senderRole: "customer",
      senderName: customer?.name || "Customer",
      text: text.trim(),
      proofUrls: proofUrls
        ? proofUrls.map((url) => ({ url, uploadedAt: new Date() }))
        : [],
    });

    await complaint.save();

    // Email admin about new reply
    try {
      const order = await Order.findById(complaint.orderId).select("orderNumber");
      await sendEmail(
        process.env.EMAIL_USER,
        "New Complaint Reply — Review Required",
        `Customer "${customer?.name || "Unknown"}" has posted a new reply on complaint for order #${order?.orderNumber || "N/A"}.\n\nReply:\n${text.trim()}\n${proofUrls?.length ? `\nProof images: ${proofUrls.length} attached` : ""}\n\nPlease log in to the admin panel to review.\n\nHomelyMeals System`
      );
    } catch (emailErr) {
      console.error("Failed to send reply notification to admin:", emailErr.message);
    }

    return res.status(201).json({
      message: "Your reply has been submitted successfully.",
      complaint,
    });
  } catch (error) {
    console.error("Submit reply error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};
