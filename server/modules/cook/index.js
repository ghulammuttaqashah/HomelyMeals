import express from "express";
import cookAuthRoutes from "./routes/cookAuth.routes.js";
import cookDocumentRoutes from "./routes/cookDocument.routes.js";
import cookMealRoutes from "./routes/cookMeal.routes.js";
import cookOrderRoutes from "./routes/cookOrder.routes.js";
import cookChatRoutes from "./routes/cookChat.routes.js";
import cookReviewRoutes from "./routes/cookReview.routes.js";
import cookSalesRoutes from "./routes/cookSales.routes.js";
import cookDashboardRoutes from "./routes/cookDashboard.routes.js";
import { protect } from "../../shared/middleware/auth.js";

const router = express.Router();

router.use("/auth", cookAuthRoutes);
router.use("/documents", protect, cookDocumentRoutes);
router.use("/meals", protect, cookMealRoutes);
router.use("/orders", cookOrderRoutes);
router.use("/chats", cookChatRoutes);
router.use("/reviews", cookReviewRoutes);
router.use("/sales", protect, cookSalesRoutes);
router.use("/dashboard", protect, cookDashboardRoutes);

export default router;
