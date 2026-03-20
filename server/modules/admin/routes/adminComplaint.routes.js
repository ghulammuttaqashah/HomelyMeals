import express from "express";
import {
  getAllComplaints,
  getComplaintById,
  updateComplaint,
  sendWarning,
  getWarningHistory,
} from "../controllers/adminComplaint.controller.js";
import { protect } from "../../../shared/middleware/auth.js";

const router = express.Router();

router.get("/", protect, getAllComplaints);
router.get("/warnings/:userId", protect, getWarningHistory);
router.get("/:id", protect, getComplaintById);
router.put("/:id", protect, updateComplaint);
router.post("/:id/warn", protect, sendWarning);

export default router;
