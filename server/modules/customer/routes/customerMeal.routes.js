import express from "express";
import { 
  getAllCooksForCustomer, 
  getMealsByCookId,
  getAllMealsForCustomer 
} from "../controllers/customerMeal.controller.js";
import { optionalAuth } from "../../../shared/middleware/auth.js";

const router = express.Router();

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
