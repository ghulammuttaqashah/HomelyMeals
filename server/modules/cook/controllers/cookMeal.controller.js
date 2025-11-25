import CookMeal from "../models/cookMeal.model.js";

// ----------------------------------------------------
// Add Meal
// ----------------------------------------------------
export const addMeal = async (req, res) => {
  try {
    const cookId = req.user._id;

    const { name, description, price, category, availability, itemImage } =
      req.body;

    const newMeal = await CookMeal.create({
      cookId,
      name,
      description,
      price,
      category,
      availability,
      itemImage,
    });

    return res.status(201).json({
      success: true,
      message: "Meal added successfully",
      meal: newMeal,
    });
  } catch (error) {
    console.error("Add meal error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// ----------------------------------------------------
// View All Meals of Logged-in Cook
// ----------------------------------------------------
export const getMeals = async (req, res) => {
  try {
    const cookId = req.user._id;

    const meals = await CookMeal.find({ cookId }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      meals,
    });
  } catch (error) {
    console.error("Fetch meals error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};