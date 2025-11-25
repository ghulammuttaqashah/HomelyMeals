import { Cook } from "../../cook/models/cook.model.js";

/**
 * GET ALL COOKS (Admin)
 */
export const getAllCooks = async (req, res) => {
  try {
    const cooks = await Cook.find().select("-password");

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

