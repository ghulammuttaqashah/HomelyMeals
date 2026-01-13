import express from "express";
import { addMeal, getMeals, updateMeal, deleteMeal } from "../controllers/cookMeal.controller.js";

const router = express.Router();

// /cook/meals/add
router.post("/add", addMeal);

// /cook/meals/all
router.get("/all", getMeals);

// /cook/meals/update/:mealId
router.put("/update/:mealId", updateMeal);

// /cook/meals/delete/:mealId
router.delete("/delete/:mealId", deleteMeal);

export default router;