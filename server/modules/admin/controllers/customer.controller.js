import { Customer } from "../../customer/models/customer.model.js";
import { Warning } from "../../../shared/models/warning.model.js";
import { sendEmail } from "../../../shared/utils/sendEmail.js";

/**
 * GET /api/admin/customers
 * Protected: Admin only
 */

export const getAllCustomers = async (req, res) => {
  try {
    const customers = await Customer.find().select("-password"); //excludes the password field
    return res.status(200).json({
      message: "Customers retrieved successfully",
      customers,
    });
  } catch (err) {
    console.error("Get Customers Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * PATCH /api/admin/customers/:id/status
 * Update customer status (active/suspended)
 * Protected: Admin only
 */
export const updateCustomerStatus = async (req, res) => {
  const { id } = req.params;
  const { status, reason } = req.body;

  try {
    // 1️⃣ Validate status value
    if (!["active", "suspended"].includes(status)) {
      return res.status(400).json({ message: "Invalid status value." });
    }

    // 2️⃣ Find customer
    const customer = await Customer.findById(id);
    if (!customer) {
      return res.status(404).json({ message: "Customer not found." });
    }

    // 3️⃣ Prevent updating to same status
    if (customer.status === status) {
      return res.status(400).json({
        message: `Customer is already ${status}. No changes applied.`,
      });
    }

    // 4️⃣ If suspending → reason is required
    if (status === "suspended" && (!reason || reason.trim() === "")) {
      return res.status(400).json({
        message: "Suspension reason is required when suspending a customer.",
      });
    }

    // 5️⃣ Update status + optional reason
    customer.status = status;
    customer.statusReason = status === "suspended" ? reason : ""; // clear reason when active
    await customer.save();

    // 6️⃣ Respond
    return res.status(200).json({
      message: `Customer ${status === "suspended" ? "suspended" : "activated"} successfully.`,
      customer: {
        id: customer._id,
        name: customer.name,
        email: customer.email,
        status: customer.status,
        statusReason: customer.statusReason,
      },
    });
  } catch (err) {
    console.error("Update Customer Status Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * PATCH /api/admin/customers/:id/reset-warnings
 * Reset warningsCount for a customer (admin only)
 */
export const resetCustomerWarnings = async (req, res) => {
  const { id } = req.params;
  const { count = 0 } = req.body;

  try {
    const newCount = Math.max(0, parseInt(count) || 0);

    const customer = await Customer.findById(id);
    if (!customer) {
      return res.status(404).json({ message: "Customer not found." });
    }

    const previousCount = customer.warningsCount;

    // Sync Warning documents to match the new count
    // Get all warnings sorted oldest-first so we keep the most recent ones
    const allWarnings = await Warning.find({ userId: id, userType: "customer" }).sort({ createdAt: 1 });

    if (newCount < allWarnings.length) {
      // Delete the oldest warnings so only `newCount` remain
      const toDelete = allWarnings.slice(0, allWarnings.length - newCount);
      await Warning.deleteMany({ _id: { $in: toDelete.map((w) => w._id) } });
    }

    customer.warningsCount = newCount;

    // Reactivate if auto-suspended due to warnings and count now below threshold
    if (
      newCount < 3 &&
      customer.status === "suspended" &&
      customer.statusReason === "Account suspended due to multiple warnings"
    ) {
      customer.status = "active";
      customer.statusReason = "";
    }

    await customer.save();

    // Notify customer by email
    try {
      if (customer.email) {
        await sendEmail(
          customer.email,
          "Warning Count Updated — HomelyMeals",
          `Hi ${customer.name},\n\nYour warning count has been updated by our admin team.\n\nPrevious warnings: ${previousCount}\nCurrent warnings: ${newCount}\n${newCount < previousCount ? "\nYour account standing has been improved. Thank you for your cooperation.\n" : ""}\nIf you have any questions, contact us at ${process.env.EMAIL_USER}.\n\nRegards,\nHomelyMeals Team`
        );
      }
    } catch (emailErr) {
      console.error("Failed to send warning reset email:", emailErr.message);
    }

    return res.status(200).json({
      message: `Warnings reset from ${previousCount} to ${newCount}.`,
      warningsCount: customer.warningsCount,
      status: customer.status,
    });
  } catch (err) {
    console.error("Reset Customer Warnings Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};