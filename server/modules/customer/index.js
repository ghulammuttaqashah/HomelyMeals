// modules/customer/index.js
import express from "express";
import customerAuthRoutes from "./routes/customerAuth.routes.js";
import customerMealRoutes from "./routes/customerMeal.routes.js";

const router = express.Router();

router.use("/auth", customerAuthRoutes);
router.use("/meals", customerMealRoutes);

export default router;
