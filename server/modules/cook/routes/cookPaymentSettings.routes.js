import express from "express";
import { updatePaymentSettings } from "../controllers/cookStripe.controller.js";
import { protect } from "../../../shared/middleware/auth.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

// Payment settings toggle
router.patch("/", updatePaymentSettings);

export default router;
