import express from "express";
import {
  createPaymentIntent,
  confirmPayment,
} from "../controllers/customerPayment.controller.js";
import { protect } from "../../../shared/middleware/auth.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

// Payment intent creation and confirmation
router.post("/create-intent", createPaymentIntent);
router.post("/confirm", confirmPayment);

export default router;
