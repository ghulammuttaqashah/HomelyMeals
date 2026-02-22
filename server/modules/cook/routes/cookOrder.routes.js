import express from "express";
import {
  getOrders,
  getOrderById,
  updateOrderStatus,
  verifyPayment,
  addDeliveryNote,
  respondToCancellationRequest,
} from "../controllers/cookOrder.controller.js";
import { protect } from "../../../shared/middleware/auth.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

// Get cook's orders with filters
router.get("/", getOrders);

// Get single order details
router.get("/:id", getOrderById);

// Update order status (preparing, out_for_delivery, delivered)
router.patch("/:id/status", updateOrderStatus);

// Verify payment proof
router.patch("/:id/verify-payment", verifyPayment);

// Add delivery note
router.patch("/:id/delivery-note", addDeliveryNote);

// Respond to cancellation request (accept/reject)
router.patch("/:id/cancellation-response", respondToCancellationRequest);

export default router;
