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

// ----------------------------------------------------
// Update Meal
// ----------------------------------------------------
export const updateMeal = async (req, res) => {
  try {
    const cookId = req.user._id;
    const { mealId } = req.params;
    const { name, description, price, category, availability, itemImage } = req.body;

    // Find meal and verify ownership
    const meal = await CookMeal.findById(mealId);

    if (!meal) {
      return res.status(404).json({ success: false, message: "Meal not found" });
    }

    // Check if the meal belongs to the logged-in cook
    if (meal.cookId.toString() !== cookId.toString()) {
      return res.status(403).json({ success: false, message: "Unauthorized to edit this meal" });
    }

    // Update meal fields
    meal.name = name || meal.name;
    meal.description = description !== undefined ? description : meal.description;
    meal.price = price || meal.price;
    meal.category = category || meal.category;
    meal.availability = availability || meal.availability;
    meal.itemImage = itemImage || meal.itemImage;

    await meal.save();

    return res.status(200).json({
      success: true,
      message: "Meal updated successfully",
      meal,
    });
  } catch (error) {
    console.error("Edit meal error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// ----------------------------------------------------
// Delete Meal
// ----------------------------------------------------
export const deleteMeal = async (req, res) => {
  try {
    const cookId = req.user._id;
    const { mealId } = req.params;

    // Find meal and verify ownership
    const meal = await CookMeal.findById(mealId);

    if (!meal) {
      return res.status(404).json({ success: false, message: "Meal not found" });
    }

    // Check if the meal belongs to the logged-in cook
    if (meal.cookId.toString() !== cookId.toString()) {
      return res.status(403).json({ success: false, message: "Unauthorized to delete this meal" });
    }

    await CookMeal.findByIdAndDelete(mealId);

    return res.status(200).json({
      success: true,
      message: "Meal deleted successfully",
    });
  } catch (error) {
    console.error("Delete meal error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};