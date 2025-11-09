// modules/admin/index.js
import express from "express";
import customerRoutes from "./routes/customer.routes.js"; // Admin view customers
import authRoutes from "./routes/auth.routes.js";          // Admin signin/signout

const router = express.Router();

router.use("/auth", authRoutes);       // Admin authentication routes
router.use("/customers", customerRoutes); // Admin customer management routes

export default router;
