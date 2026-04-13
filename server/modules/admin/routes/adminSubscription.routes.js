import express from "express";
import {
  createPlan,
  updatePlan,
  deletePlan,
  getPlans,
  getSubscriptions,
  getSubscriptionRevenue,
} from "../controllers/adminSubscription.controller.js";

const router = express.Router();

router.post("/plans", createPlan);
router.put("/plans/:id", updatePlan);
router.delete("/plans/:id", deletePlan);
router.get("/plans", getPlans);
router.get("/subscriptions/revenue", getSubscriptionRevenue);
router.get("/subscriptions", getSubscriptions);

export default router;
