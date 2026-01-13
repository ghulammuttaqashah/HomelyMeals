import Meal from "../../cook/models/cookMeal.model.js";
import { Cook } from "../../cook/models/cook.model.js";

/**
 * Get all meals for customers (with cook name)
 * Only shows meals from active and approved cooks
 * Only shows meals that are available (not out of stock)
 */
export const getAllMealsForCustomer = async (req, res) => {
  try {
    // Populate cook info (name and status)
    // Only fetch meals that are available
    const meals = await Meal.find({ availability: "Available" })
      .populate({
        path: "cookId",
        select: "name status verificationStatus",
      })
      .sort({ createdAt: -1 });

    // Filter out meals from suspended or non-approved cooks
    const formatted = meals
      .filter(m => {
        // Only show meals from active and approved cooks
        return m.cookId && 
               m.cookId.status === "active" && 
               m.cookId.verificationStatus === "approved";
      })
      .map(m => ({
        mealId: m._id,
        name: m.name,
        description: m.description,
        price: m.price,
        category: m.category,
        availability: m.availability,
        itemImage: m.itemImage,
        cookName: m.cookId?.name || "Unknown Cook",
        createdAt: m.createdAt,
      }));

    res.status(200).json({
      success: true,
      count: formatted.length,
      meals: formatted
    });
  } catch (error) {
    console.error("Get meals error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch meals",
    });
  }
};
