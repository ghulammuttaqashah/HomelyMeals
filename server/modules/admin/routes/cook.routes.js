import express from "express";
import { getAllCooks, updateCookStatus } from "../controllers/cook.controller.js";

const router = express.Router();

// GET all cooks
router.get("/", getAllCooks);

// Update cook status
router.patch("/:id/status", updateCookStatus);

export default router;