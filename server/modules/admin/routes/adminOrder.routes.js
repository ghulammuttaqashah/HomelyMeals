import express from "express";
import {
  getOrders,
  getOrderById,
  cancelOrder,
  updatePaymentStatus,
  getOrderStatistics,
} from "../controllers/adminOrder.controller.js";
import { protect } from "../../../shared/middleware/auth.js";

const router = express.Router();

// All routes require admin authentication
router.use(protect);

// Get order statistics (put before /:id to avoid route conflict)
router.get("/statistics", getOrderStatistics);

// Get all orders with filters
router.get("/", getOrders);

// Get single order details
router.get("/:id", getOrderById);

// Cancel order (admin override)
router.patch("/:id/cancel", cancelOrder);

// Update payment status (admin override)
router.patch("/:id/payment-status", updatePaymentStatus);

export default router;
