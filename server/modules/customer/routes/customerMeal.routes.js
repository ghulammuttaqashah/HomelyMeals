import express from "express";
import { getAllMealsForCustomer } from "../controllers/customerMeal.controller.js";

const router = express.Router();

// Get all meals (public endpoint - no authentication required)
// Full path: /api/customer/meals/
router.get("/", getAllMealsForCustomer);

export default router;
