import { Cook } from "../../cook/models/cook.model.js";
import { Warning } from "../../../shared/models/warning.model.js";
import { sendEmail } from "../../../shared/utils/sendEmail.js";

/**
 * GET ALL COOKS (Admin)
 * Only returns cooks with verificationStatus = "approved"
 */
export const getAllCooks = async (req, res) => {
  try {
    // Only show approved cooks in "Manage Cook Status"
    const cooks = await Cook.find({ verificationStatus: "approved" })
      .select("-password")
      .select("+isOnlinePaymentEnabled +stripeAccountId +stripeAccountStatus");

    return res.status(200).json({
      message: "Cooks retrieved successfully",
      cooks,
    });
  } catch (err) {
    console.error("Get Cooks Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};


/**
 * UPDATE COOK STATUS (active/suspended)
 */
export const updateCookStatus = async (req, res) => {
  const { id } = req.params;
  const { status, reason } = req.body;

  try {
    // 1️⃣ Validate status
    if (!["active", "suspended"].includes(status)) {
      return res.status(400).json({ message: "Invalid status value." });
    }

    // 2️⃣ Find cook
    const cook = await Cook.findById(id);
    if (!cook) {
      return res.status(404).json({ message: "Cook not found." });
    }

    // 3️⃣ Prevent redundant update
    if (cook.status === status) {
      return res.status(400).json({
        message: `Cook is already ${status}. No changes applied.`,
      });
    }

    // 4️⃣ Require reason when suspending
    if (status === "suspended" && (!reason || reason.trim() === "")) {
      return res.status(400).json({
        message: "Suspension reason is required.",
      });
    }

    // 5️⃣ Apply update
    cook.status = status;
    cook.statusReason = status === "suspended" ? reason : "";

    await cook.save();

    return res.status(200).json({
      message: `Cook ${status === "suspended" ? "suspended" : "activated"} successfully.`,
      cook: {
        id: cook._id,
        name: cook.name,
        email: cook.email,
        status: cook.status,
        statusReason: cook.statusReason,
      },
    });

  } catch (err) {
    console.error("Update Cook Status Error:", err);
    return res.status(500).json({ 
      message: "Server error",
      error: err.message 
    });
  }
};

/**
 * PATCH /api/admin/cooks/:id/reset-warnings
 * Reset warningsCount for a cook (admin only)
 */
export const resetCookWarnings = async (req, res) => {
  const { id } = req.params;
  const { count = 0 } = req.body;

  try {
    const newCount = Math.max(0, parseInt(count) || 0);

    const cook = await Cook.findById(id);
    if (!cook) {
      return res.status(404).json({ message: "Cook not found." });
    }

    const previousCount = cook.warningsCount;

    // Sync Warning documents to match the new count
    // Get all warnings sorted oldest-first so we keep the most recent ones
    const allWarnings = await Warning.find({ userId: id, userType: "cook" }).sort({ createdAt: 1 });

    if (newCount < allWarnings.length) {
      // Delete the oldest warnings so only `newCount` remain
      const toDelete = allWarnings.slice(0, allWarnings.length - newCount);
      await Warning.deleteMany({ _id: { $in: toDelete.map((w) => w._id) } });
    }

    cook.warningsCount = newCount;

    // Reactivate if auto-suspended due to warnings and count now below threshold
    if (
      newCount < 3 &&
      cook.status === "suspended" &&
      cook.statusReason === "Account suspended due to multiple warnings"
    ) {
      cook.status = "active";
      cook.statusReason = "";
    }

    await cook.save();

    // Notify cook by email
    try {
      if (cook.email) {
        await sendEmail(
          cook.email,
          "Warning Count Updated — HomelyMeals",
          `Hi ${cook.name},\n\nYour warning count has been updated by our admin team.\n\nPrevious warnings: ${previousCount}\nCurrent warnings: ${newCount}\n${newCount < previousCount ? "\nYour account standing has been improved. Thank you for your cooperation.\n" : ""}\nIf you have any questions, contact us at ${process.env.EMAIL_USER}.\n\nRegards,\nHomelyMeals Team`
        );
      }
    } catch (emailErr) {
      console.error("Failed to send warning reset email:", emailErr.message);
    }

    return res.status(200).json({
      message: `Warnings reset from ${previousCount} to ${newCount}.`,
      warningsCount: cook.warningsCount,
      status: cook.status,
    });
  } catch (err) {
    console.error("Reset Cook Warnings Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

