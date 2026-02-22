import express from "express";
import {
  placeOrder,
  getOrders,
  getOrderById,
  requestCancellation,
  uploadPaymentProof,
  calculateDeliveryInfo,
} from "../controllers/customerOrder.controller.js";
import { protect } from "../../../shared/middleware/auth.js";

const router = express.Router();

// All routes are protected
router.use(protect);

// Calculate delivery info (for checkout preview)
router.post("/calculate-delivery", calculateDeliveryInfo);

// Place a new order
router.post("/", placeOrder);

// Get all orders
router.get("/", getOrders);

// Get single order
router.get("/:id", getOrderById);

// Request cancellation (cook must approve)
router.post("/:id/request-cancellation", requestCancellation);

// Upload payment proof
router.post("/:id/payment-proof", uploadPaymentProof);

export default router;
