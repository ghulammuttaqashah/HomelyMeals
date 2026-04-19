import express from "express";
import { getAllCooks, updateCookStatus, resetCookWarnings } from "../controllers/cook.controller.js";

const router = express.Router();

// GET all cooks
router.get("/", getAllCooks);

// Update cook status
router.patch("/:id/status", updateCookStatus);

// Reset cook warnings
router.patch("/:id/reset-warnings", resetCookWarnings);

export default router;