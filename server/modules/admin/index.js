import express from "express";
import customerRoutes from "./routes/customer.routes.js";
import cookRoutes from "./routes/cook.routes.js";
import authRoutes from "./routes/auth.routes.js";
import cookDocumentsRoutes from "./routes/cookDocuments.routes.js";
import deliveryChargesRoutes from "./routes/deliveryCharges.routes.js";
import adminOrderRoutes from "./routes/adminOrder.routes.js";
import adminComplaintRoutes from "./routes/adminComplaint.routes.js";
import adminSubscriptionRoutes from "./routes/adminSubscription.routes.js";
import reanalyzeRoutes from "./routes/reanalyzeReviews.routes.js";
import settingsRoutes from "./routes/settings.routes.js";
import { protect } from "../../shared/middleware/auth.js";

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/settings", settingsRoutes); // Move settings BEFORE the "/" catch-all route
router.use("/customers", protect, customerRoutes);
router.use("/cooks", protect, cookRoutes);
router.use("/cook-documents", protect, cookDocumentsRoutes);
router.use("/delivery-charges", protect, deliveryChargesRoutes);
router.use("/orders", adminOrderRoutes);
router.use("/complaints", protect, adminComplaintRoutes);
router.use("/utils", reanalyzeRoutes); // No auth for testing
router.use("/", protect, adminSubscriptionRoutes); // This should be LAST as it catches all remaining routes

export default router;
