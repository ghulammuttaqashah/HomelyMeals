import express from "express";
import { getAllCustomers, updateCustomerStatus, resetCustomerWarnings } from "../controllers/customer.controller.js";

const router = express.Router();

// Admin protected routes
router.get("/", getAllCustomers);
router.patch("/:id/status", updateCustomerStatus);
router.patch("/:id/reset-warnings", resetCustomerWarnings);

export default router;