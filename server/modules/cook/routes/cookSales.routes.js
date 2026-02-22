import express from "express";
import { getSalesAnalytics } from "../controllers/cookSales.controller.js";

const router = express.Router();

// GET /api/cook/sales?period=daily|weekly|monthly|yearly
router.get("/", getSalesAnalytics);

export default router;
