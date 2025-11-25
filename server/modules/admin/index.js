import express from "express";
import customerRoutes from "./routes/customer.routes.js";
import cookRoutes from "./routes/cook.routes.js";       // ✅ added
import authRoutes from "./routes/auth.routes.js";
import { protect } from "../../shared/middleware/auth.js";
import cookDocumentsRoutes from "./routes/cookDocuments.routes.js";


const router = express.Router();

router.use("/auth", authRoutes);
router.use("/customers", protect, customerRoutes);
router.use("/cooks", protect, cookRoutes); 

router.use("/cook-documents", protect, cookDocumentsRoutes);// ✅ Admin controls cooks

export default router;
