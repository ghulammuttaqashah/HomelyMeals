import express from "express";
import { addMeal, getMeals } from "../controllers/cookMeal.controller.js";

const router = express.Router();

// /cook/meals/add
router.post("/add", addMeal);

// /cook/meals/all
router.get("/all", getMeals);

export default router;