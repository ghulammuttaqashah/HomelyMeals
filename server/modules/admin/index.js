import express from "express";
import customerRoutes from "./routes/customer.routes.js";
import cookRoutes from "./routes/cook.routes.js";
import authRoutes from "./routes/auth.routes.js";
import cookDocumentsRoutes from "./routes/cookDocuments.routes.js";
import deliveryChargesRoutes from "./routes/deliveryCharges.routes.js";
import adminOrderRoutes from "./routes/adminOrder.routes.js";
import adminComplaintRoutes from "./routes/adminComplaint.routes.js";
import { protect } from "../../shared/middleware/auth.js";

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/customers", protect, customerRoutes);
router.use("/cooks", protect, cookRoutes);
router.use("/cook-documents", protect, cookDocumentsRoutes);
router.use("/delivery-charges", protect, deliveryChargesRoutes);
router.use("/orders", adminOrderRoutes);
router.use("/complaints", protect, adminComplaintRoutes);

export default router;
