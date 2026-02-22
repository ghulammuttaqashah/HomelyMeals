import express from "express";
import { getDashboardStats } from "../controllers/cookDashboard.controller.js";

const router = express.Router();

// GET /api/cook/dashboard/stats
router.get("/stats", getDashboardStats);

export default router;
