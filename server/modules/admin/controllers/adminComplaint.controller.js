import { Complaint } from "../../../shared/models/complaint.model.js";
import { Warning } from "../../../shared/models/warning.model.js";
import { Customer } from "../../customer/models/customer.model.js";
import { Cook } from "../../cook/models/cook.model.js";
import { sendEmail } from "../../../shared/utils/sendEmail.js";

/**
 * Get all complaints
 * GET /api/admin/complaints
 */
export const getAllComplaints = async (req, res) => {
  try {
    const { status, complainantType, page = 1, limit = 20 } = req.query;

    const query = {};
    if (status) query.status = status;
    if (complainantType) query.complainantType = complainantType;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [complaints, total] = await Promise.all([
      Complaint.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate("orderId", "orderNumber totalAmount status"),
      Complaint.countDocuments(query),
    ]);

    // Manually populate complainant and against user names
    const enriched = await Promise.all(
      complaints.map(async (c) => {
        const obj = c.toObject();

        // Get complainant name
        if (c.complainantType === "customer") {
          const user = await Customer.findById(c.complainantId).select("name email");
          obj.complainantName = user?.name || "Unknown";
          obj.complainantEmail = user?.email || "";
        } else {
          const user = await Cook.findById(c.complainantId).select("name email");
          obj.complainantName = user?.name || "Unknown";
          obj.complainantEmail = user?.email || "";
        }

        // Get against user name
        if (c.againstUserId) {
          // Against user is opposite type
          if (c.complainantType === "customer") {
            const user = await Cook.findById(c.againstUserId).select("name email");
            obj.againstUserName = user?.name || "Unknown";
            obj.againstUserEmail = user?.email || "";
            obj.againstUserType = "cook";
          } else {
            const user = await Customer.findById(c.againstUserId).select("name email");
            obj.againstUserName = user?.name || "Unknown";
            obj.againstUserEmail = user?.email || "";
            obj.againstUserType = "customer";
          }
        }

        return obj;
      })
    );

    return res.status(200).json({
      complaints: enriched,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Get all complaints error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * Get single complaint details
 * GET /api/admin/complaints/:id
 */
export const getComplaintById = async (req, res) => {
  try {
    const { id } = req.params;

    const complaint = await Complaint.findById(id)
      .populate("orderId", "orderNumber totalAmount status items createdAt cookId customerId");

    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    const obj = complaint.toObject();

    // Populate complainant
    if (complaint.complainantType === "customer") {
      const user = await Customer.findById(complaint.complainantId).select("name email contact warningsCount");
      obj.complainant = user;
    } else {
      const user = await Cook.findById(complaint.complainantId).select("name email contact warningsCount");
      obj.complainant = user;
    }

    // Populate against user
    if (complaint.againstUserId) {
      if (complaint.complainantType === "customer") {
        const user = await Cook.findById(complaint.againstUserId).select("name email contact warningsCount");
        obj.againstUser = user;
        obj.againstUserType = "cook";
      } else {
        const user = await Customer.findById(complaint.againstUserId).select("name email contact warningsCount");
        obj.againstUser = user;
        obj.againstUserType = "customer";
      }
    }

    // Get related complaints on same order (for conflict view)
    const relatedComplaints = await Complaint.find({
      orderId: complaint.orderId._id,
      _id: { $ne: complaint._id },
    }).select("complainantType type status createdAt");

    obj.relatedComplaints = relatedComplaints;

    // Get warning history for against user
    if (complaint.againstUserId) {
      const warnings = await Warning.find({ userId: complaint.againstUserId })
        .sort({ createdAt: -1 })
        .limit(10);
      obj.againstUserWarnings = warnings;
    }

    return res.status(200).json({ complaint: obj });
  } catch (error) {
    console.error("Get complaint by ID error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * Update complaint (status + adminResponse)
 * PUT /api/admin/complaints/:id
 */
export const updateComplaint = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminResponse } = req.body;

    const complaint = await Complaint.findById(id);
    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    const validStatuses = ["pending", "in_progress", "resolved", "rejected"];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    if (status) complaint.status = status;
    if (adminResponse !== undefined) complaint.adminResponse = adminResponse.trim();

    await complaint.save();

    // Send email to complainant about status update
    try {
      let email, name;
      if (complaint.complainantType === "customer") {
        const user = await Customer.findById(complaint.complainantId).select("name email");
        email = user?.email;
        name = user?.name;
      } else {
        const user = await Cook.findById(complaint.complainantId).select("name email");
        email = user?.email;
        name = user?.name;
      }

      const order = await import("../../../shared/models/order.model.js").then(
        (m) => m.Order.findById(complaint.orderId).select("orderNumber")
      );

      if (email) {
        await sendEmail(
          email,
          `Complaint Update — HomelyMeals`,
          `Hi ${name},\n\nYour complaint regarding order #${order?.orderNumber || "N/A"} has been updated.\n\nStatus: ${complaint.status.replace("_", " ").toUpperCase()}\n${complaint.adminResponse ? `Admin Response: ${complaint.adminResponse}\n` : ""}\nThank you,\nHomelyMeals Team`
        );
      }
    } catch (emailErr) {
      console.error("Failed to send complaint update email:", emailErr.message);
    }

    return res.status(200).json({
      message: "Complaint updated successfully",
      complaint,
    });
  } catch (error) {
    console.error("Update complaint error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * Send warning to a user (linked to a complaint)
 * POST /api/admin/complaints/:id/warn
 */
export const sendWarning = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, userType, message } = req.body;

    if (!userId || !userType || !message) {
      return res.status(400).json({ message: "userId, userType, and message are required" });
    }

    if (!["customer", "cook"].includes(userType)) {
      return res.status(400).json({ message: "userType must be customer or cook" });
    }

    // Verify complaint exists
    const complaint = await Complaint.findById(id);
    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    // Create warning
    const warning = new Warning({
      userId,
      userType,
      complaintId: id,
      message: message.trim(),
    });
    await warning.save();

    // Increment warningsCount and check for auto-suspend
    let user;
    if (userType === "customer") {
      user = await Customer.findByIdAndUpdate(
        userId,
        { $inc: { warningsCount: 1 } },
        { new: true }
      );
    } else {
      user = await Cook.findByIdAndUpdate(
        userId,
        { $inc: { warningsCount: 1 } },
        { new: true }
      );
    }

    // Auto-suspend if 3+ warnings
    if (user && user.warningsCount >= 3 && user.status !== "suspended") {
      user.status = "suspended";
      user.statusReason = "Account suspended due to multiple warnings";
      await user.save();
    }

    // Send warning email
    try {
      const order = await import("../../../shared/models/order.model.js").then(
        (m) => m.Order.findById(complaint.orderId).select("orderNumber")
      );

      if (user?.email) {
        await sendEmail(
          user.email,
          "⚠️ Warning Issued — HomelyMeals",
          `Hi ${user.name},\n\nA warning has been issued on your account regarding order #${order?.orderNumber || "N/A"}.\n\nReason: ${message}\n\nWarnings count: ${user.warningsCount}\n${user.warningsCount >= 3 ? "\n⚠️ Your account has been suspended due to multiple warnings. Please contact support.\n" : ""}\nPlease ensure compliance with our community guidelines.\n\nHomelyMeals Team`
        );
      }
    } catch (emailErr) {
      console.error("Failed to send warning email:", emailErr.message);
    }

    return res.status(201).json({
      message: "Warning sent successfully",
      warning,
      warningsCount: user?.warningsCount,
      suspended: user?.status === "suspended",
    });
  } catch (error) {
    console.error("Send warning error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * Get warning history for a user
 * GET /api/admin/complaints/warnings/:userId
 */
export const getWarningHistory = async (req, res) => {
  try {
    const { userId } = req.params;

    const warnings = await Warning.find({ userId })
      .sort({ createdAt: -1 })
      .populate("complaintId", "type orderId status");

    return res.status(200).json({ warnings });
  } catch (error) {
    console.error("Get warning history error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};
