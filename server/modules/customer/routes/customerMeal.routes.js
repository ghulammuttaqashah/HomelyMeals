import express from "express";
import {
  getAllCooksForCustomer,
  getMealsByCookId,
  getAllMealsForCustomer,
  getCookDeliveryInfo,
  getDeliverySettings,
  getTopSellingMeals,
} from "../controllers/customerMeal.controller.js";
import { optionalAuth } from "../../../shared/middleware/auth.js";

const router = express.Router();

// Get delivery settings (public - for frontend calculation)
// Full path: /api/customer/meals/delivery-settings
router.get("/delivery-settings", getDeliverySettings);

// Get cook delivery info (public - for frontend calculation)
// Full path: /api/customer/meals/cook/:cookId/delivery-info
router.get("/cook/:cookId/delivery-info", getCookDeliveryInfo);

// Get top selling meals for a cook (public endpoint)
// Full path: /api/customer/meals/cook/:cookId/top-selling
router.get("/cook/:cookId/top-selling", getTopSellingMeals);

// Get all cooks (uses optional auth to filter by customer's city if logged in)
// Supports ?search=keyword to filter cooks by their meals
// Full path: /api/customer/meals/cooks
router.get("/cooks", optionalAuth, getAllCooksForCustomer);

// Get meals by cook ID (public endpoint)
// Full path: /api/customer/meals/cook/:cookId
router.get("/cook/:cookId", getMealsByCookId);

// Get all meals (public endpoint - kept for backward compatibility)
// Full path: /api/customer/meals/
router.get("/", getAllMealsForCustomer);

export default router;
