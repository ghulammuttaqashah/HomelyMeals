import { Customer } from "../../customer/models/customer.model.js";

/**
 * GET /api/admin/customers
 * Protected: Admin only
 */

export const getAllCustomers = async (req, res) => {
  try {
    const customers = await Customer.find().select("-password");
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