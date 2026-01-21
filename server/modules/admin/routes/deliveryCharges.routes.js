import express from "express";
import {
  getDeliveryCharges,
  createDeliveryCharges,
  updateDeliveryCharges,
  deleteDeliveryCharges,
} from "../controllers/deliveryCharges.controller.js";

const router = express.Router();

// GET /api/admin/delivery-charges - Get delivery charges settings
router.get("/", getDeliveryCharges);

// POST /api/admin/delivery-charges - Create delivery charges settings
router.post("/", createDeliveryCharges);

// PUT /api/admin/delivery-charges - Update delivery charges settings
router.put("/", updateDeliveryCharges);

// DELETE /api/admin/delivery-charges - Delete all delivery charges settings
router.delete("/", deleteDeliveryCharges);

export default router;
