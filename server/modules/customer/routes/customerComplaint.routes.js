import express from "express";
import {
  createComplaint,
  getMyComplaints,
  getComplaintById,
  getMyWarnings,
} from "../controllers/customerComplaint.controller.js";
import { protect } from "../../../shared/middleware/auth.js";

const router = express.Router();

router.post("/", protect, createComplaint);
router.get("/", protect, getMyComplaints);
router.get("/my-warnings", protect, getMyWarnings);
router.get("/:id", protect, getComplaintById);

export default router;
