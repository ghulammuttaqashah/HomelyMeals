// modules/admin/controllers/customer.controller.js
import { Customer } from "../../customer/models/customer.model.js";

/**
 * GET /api/admin/customers
 * Protected: Admin only
 */
export const getAllCustomers = async (req, res) => {
  try {
    const customers = await Customer.find().select(
      "-password" // exclude password field
    );

    return res.status(200).json({
      message: "Customers retrieved successfully",
      customers,
    });
  } catch (err) {
    console.error("Get Customers Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
