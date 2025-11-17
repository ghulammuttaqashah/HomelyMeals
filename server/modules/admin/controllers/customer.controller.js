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
    // 1️⃣ Validate input
    if (!["active", "suspended"].includes(status)) {
      return res.status(400).json({ message: "Invalid status value." });
    }

    // 2️⃣ Find customer
    const customer = await Customer.findById(id);
    if (!customer) {
      return res.status(404).json({ message: "Customer not found." });
    }

    // 3️⃣ Update status and reason
    customer.status = status;
    customer.statusReason = reason || "";
    await customer.save();

    // 4️⃣ Respond
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
