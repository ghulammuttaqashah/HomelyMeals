import express from "express";
import cookAuthRoutes from "./routes/cookAuth.routes.js";
import cookDocumentRoutes from "./routes/cookDocument.routes.js";
import { protect } from "../../shared/middleware/auth.js";
import cookMealRoutes from "./routes/cookMeal.routes.js";

const router = express.Router();

router.use("/auth", cookAuthRoutes);
router.use("/documents",protect,cookDocumentRoutes);

router.use("/meals", protect, cookMealRoutes);


export default router;
