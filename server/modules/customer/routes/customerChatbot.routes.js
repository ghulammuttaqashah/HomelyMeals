import express from "express";
import {
  getAllMealsForChatbot,
  getTopSellingMealsByPeriod,
  getTopRatedMeals,
  getUniqueMealTypes,
  getTopRatedCooks,
  getTopSellingCooks,
  getBestCooksByTopItems,
  getPersonalizedRecommendations,
} from "../controllers/customerChatbot.controller.js";
import { advancedChatbot, featureSearchChatbot } from "../controllers/customerChatbotAdvanced.controller.js";
import {
  smartFoodAdvisor,
  getHealthBasedMeals,
  compareMeals,
  getHealthTags,
} from "../controllers/customerRecommendationAdvanced.controller.js";
import { intelligentOrderAssistant } from "../controllers/customerOrderAssistant.controller.js";
import { optionalAuth, protect } from "../../../shared/middleware/auth.js";

const router = express.Router();

// Advanced AI chatbot endpoint
// Full path: /api/customer/chatbot/advanced
router.post("/advanced", advancedChatbot);

// Feature Search AI endpoint (restricted to top selling context)
// Full path: /api/customer/chatbot/feature-search
router.post("/feature-search", featureSearchChatbot);

// Get all meals (for chatbot "All Meals" option)
// Full path: /api/customer/chatbot/meals/all
router.get("/meals/all", getAllMealsForChatbot);

// Get top selling meals by period
// Full path: /api/customer/chatbot/meals/top-selling?period=today|week|month|overall&limit=5
router.get("/meals/top-selling", getTopSellingMealsByPeriod);

// Get top rated meals
// Full path: /api/customer/chatbot/meals/top-rated?limit=10
router.get("/meals/top-rated", getTopRatedMeals);

// Get unique meal types for dropdown
// Full path: /api/customer/chatbot/meals/unique-types
router.get("/meals/unique-types", getUniqueMealTypes);

// Browse Cooks endpoints
// Full path: /api/customer/chatbot/cooks/top-rated?limit=7
router.get("/cooks/top-rated", getTopRatedCooks);

// Full path: /api/customer/chatbot/cooks/top-selling?limit=7
router.get("/cooks/top-selling", getTopSellingCooks);

// Full path: /api/customer/chatbot/cooks/by-top-items?limit=3
router.get("/cooks/by-top-items", getBestCooksByTopItems);

// Get personalized recommendations
// Full path: /api/customer/chatbot/recommendations?limit=10
router.get("/recommendations", optionalAuth, getPersonalizedRecommendations);

// Advanced Recommendation System
// Smart Food Advisor - AI-driven recommendations
// Full path: /api/customer/chatbot/smart-advisor
router.post("/smart-advisor", optionalAuth, smartFoodAdvisor);

// Health-Based Meals
// Full path: /api/customer/chatbot/health-meals?tags=healthy,light&limit=10
router.get("/health-meals", getHealthBasedMeals);

// Compare Meals
// Full path: /api/customer/chatbot/compare-meals
router.post("/compare-meals", compareMeals);

// Get available health tags
// Full path: /api/customer/chatbot/health-tags
router.get("/health-tags", getHealthTags);

// Intelligent Order Assistant - Dynamic routing for orders, complaints, tracking
// Full path: /api/customer/chatbot/order-assistant
router.post("/order-assistant", protect, intelligentOrderAssistant);

export default router;

