import express from "express";
import { getAllCustomers, updateCustomerStatus } from "../controllers/customer.controller.js";


const router = express.Router();

// Admin protected routes
router.get("/", getAllCustomers);
router.patch("/:id/status", updateCustomerStatus); // ✅ new route

export default router;