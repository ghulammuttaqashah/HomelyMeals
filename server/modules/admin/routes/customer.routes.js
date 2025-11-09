// modules/admin/routes/customer.routes.js
import express from "express";
import { getAllCustomers } from "../controllers/customer.controller.js";
import { protect } from "../../../shared/middleware/auth.js";

const router = express.Router();

// Admin protected route to view all customers
router.get("/", protect, getAllCustomers);

export default router;