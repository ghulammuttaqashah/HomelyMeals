// modules/customer/index.js
import express from "express";
import customerAuthRoutes from "./routes/customerAuth.routes.js";
import customerMealRoutes from "./routes/customerMeal.routes.js";
import customerOrderRoutes from "./routes/customerOrder.routes.js";
import customerChatRoutes from "./routes/customerChat.routes.js";
import customerReviewRoutes from "./routes/customerReview.routes.js";
import customerComplaintRoutes from "./routes/customerComplaint.routes.js";
import customerPaymentRoutes from "./routes/customerPayment.routes.js";
import customerAnalyticsRoutes from "./routes/customerAnalytics.routes.js";
import chatbotRoutes from "./routes/chatbot.routes.js";
import customerChatbotRoutes from "./routes/customerChatbot.routes.js";

const router = express.Router();

router.use("/auth", customerAuthRoutes);
router.use("/meals", customerMealRoutes);
router.use("/orders", customerOrderRoutes);
router.use("/chats", customerChatRoutes);
router.use("/reviews", customerReviewRoutes);
router.use("/complaints", customerComplaintRoutes);
router.use("/payments", customerPaymentRoutes);
router.use("/analytics", customerAnalyticsRoutes);
router.use("/chatbot", chatbotRoutes);
router.use("/chatbot", customerChatbotRoutes);

export default router;
