import Meal from "../../cook/models/cookMeal.model.js";
import { Cook } from "../../cook/models/cook.model.js";
import { isWithinDeliveryRange } from "../../../shared/utils/distanceCalculator.js";

/**
 * Get all meals for customers (with cook name)
 * Only shows meals from active, approved, and open cooks
 * Only shows meals that are available (not out of stock)
 */
export const getAllMealsForCustomer = async (req, res) => {
  try {
    // Populate cook info (name and status)
    // Only fetch meals that are available
    const meals = await Meal.find({ availability: "Available" })
      .populate({
        path: "cookId",
        select: "name status verificationStatus serviceStatus location maxDeliveryDistance",
      })
      .sort({ createdAt: -1 });

    // Filter out meals from suspended, non-approved, or closed cooks
    const formatted = meals
      .filter(m => {
        // Only show meals from active, approved, and open cooks
        return m.cookId && 
               m.cookId.status === "active" && 
               m.cookId.verificationStatus === "approved" &&
               m.cookId.serviceStatus === "open";
      })
      .map(m => ({
        mealId: m._id,
        name: m.name,
        description: m.description,
        price: m.price,
        category: m.category,
        availability: m.availability,
        itemImage: m.itemImage,
        cookId: m.cookId?._id,
        cookName: m.cookId?.name || "Unknown Cook",
        cookLocation: m.cookId?.location || null,
        maxDeliveryDistance: m.cookId?.maxDeliveryDistance || 5,
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

/**
 * Check if customer is within delivery range for a specific meal/cook
 */
export const checkDeliveryEligibility = async (req, res) => {
  try {
    const { mealId } = req.params;
    const { latitude, longitude } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: "Please share your location to check delivery availability",
      });
    }

    // Find the meal and populate cook info
    const meal = await Meal.findById(mealId).populate({
      path: "cookId",
      select: "name location maxDeliveryDistance status verificationStatus serviceStatus",
    });

    if (!meal) {
      return res.status(404).json({
        success: false,
        message: "Meal not found",
      });
    }

    if (!meal.cookId) {
      return res.status(404).json({
        success: false,
        message: "Cook information not available",
      });
    }

    // Check if cook is available
    if (meal.cookId.status !== "active" || 
        meal.cookId.verificationStatus !== "approved" ||
        meal.cookId.serviceStatus !== "open") {
      return res.status(400).json({
        success: false,
        message: "This cook is currently not accepting orders",
      });
    }

    // Check if cook has set their location (stored in address.location)
    if (!meal.cookId.address?.location?.latitude || !meal.cookId.address?.location?.longitude) {
      return res.status(400).json({
        success: false,
        message: "Cook has not set their delivery location yet",
      });
    }

    // Calculate distance and check eligibility
    const customerLocation = {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
    };

    const result = isWithinDeliveryRange(
      meal.cookId.address.location,
      customerLocation,
      meal.cookId.maxDeliveryDistance
    );

    if (result.error) {
      return res.status(400).json({
        success: false,
        message: result.error,
      });
    }

    if (!result.withinRange) {
      return res.status(400).json({
        success: false,
        eligible: false,
        distance: result.distance,
        maxAllowed: result.maxAllowed,
        message: `Sorry, you have exceeded the delivery distance limit for this cook. You are ${result.distance} km away, but the maximum delivery distance is ${result.maxAllowed} km.`,
      });
    }

    return res.status(200).json({
      success: true,
      eligible: true,
      distance: result.distance,
      maxAllowed: result.maxAllowed,
      message: `Great! You are within the delivery range (${result.distance} km away).`,
      cookName: meal.cookId.name,
    });
  } catch (error) {
    console.error("Check delivery eligibility error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to check delivery eligibility",
    });
  }
};

