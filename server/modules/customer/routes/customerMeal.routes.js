import express from "express";
import { getAllMealsForCustomer, checkDeliveryEligibility } from "../controllers/customerMeal.controller.js";
import { protect } from "../../../shared/middleware/auth.js";

const router = express.Router();

// Get all meals (public endpoint - no authentication required)
// Full path: /api/customer/meals/
router.get("/", getAllMealsForCustomer);

// Check delivery eligibility for a meal (protected - requires authentication)
// Full path: /api/customer/meals/:mealId/check-delivery
router.post("/:mealId/check-delivery", protect, checkDeliveryEligibility);

export default router;
