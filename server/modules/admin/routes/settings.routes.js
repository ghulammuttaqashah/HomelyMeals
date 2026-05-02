// modules/admin/routes/settings.routes.js
import express from "express";
import { 
  getDefaultProfileImage, 
  updateDefaultProfileImage, 
  deleteDefaultProfileImage,
  getAllSettings 
} from "../controllers/settings.controller.js";
import { protect } from "../../../shared/middleware/auth.js";

const router = express.Router();

// Get default profile image (public - cooks need to access this)
router.get("/default-profile-image", getDefaultProfileImage);

// Admin-only routes
router.put("/default-profile-image", protect, updateDefaultProfileImage);
router.delete("/default-profile-image", protect, deleteDefaultProfileImage);
router.get("/all", protect, getAllSettings);

export default router;
