import Meal from "../../cook/models/cookMeal.model.js";
import { Cook } from "../../cook/models/cook.model.js";
import { Customer } from "../models/customer.model.js";

/**
 * Get all active cooks for customers
 * Only shows cooks who are: active, approved, and kitchen open
 * Filters by customer's city if logged in
 * Supports search by meal name/description
 */
export const getAllCooksForCustomer = async (req, res) => {
  try {
    const { search, city: queryCity } = req.query;
    let customerCity = null;
    let customerAddresses = [];

    // If user is logged in, get their default address city
    if (req.user?._id) {
      const customer = await Customer.findById(req.user._id).select("addresses");
      if (customer && customer.addresses?.length > 0) {
        customerAddresses = customer.addresses;
        // Get default address or first address
        const defaultAddress = customer.addresses.find(addr => addr.isDefault) || customer.addresses[0];
        customerCity = defaultAddress?.city;
      }
    }

    // Use query city if provided (for address switching), otherwise use customer's city
    const filterCity = queryCity || customerCity;

    // Build cook query
    const cookQuery = {
      status: "active",
      verificationStatus: "approved",
      serviceStatus: "open",
    };

    // If we have a city to filter by, add it to query (case-insensitive)
    if (filterCity) {
      cookQuery["address.city"] = { $regex: new RegExp(`^${filterCity}$`, "i") };
    }

    // Find all matching cooks
    const cooks = await Cook.find(cookQuery).select("_id name address");

    // Get meal counts for each cook and filter by search if provided
    const cooksWithMeals = await Promise.all(
      cooks.map(async (cook) => {
        // Build meal query
        const mealQuery = {
          cookId: cook._id,
          availability: "Available",
        };

        // If search is provided, filter meals by name or description
        if (search) {
          mealQuery.$or = [
            { name: { $regex: search, $options: "i" } },
            { description: { $regex: search, $options: "i" } },
          ];
        }

        const mealCount = await Meal.countDocuments(mealQuery);

        return {
          cookId: cook._id,
          name: cook.name,
          city: cook.address?.city || "Sukkur",
          mealCount,
        };
      })
    );

    // Filter out cooks with no meals (or no matching meals if search)
    const filtered = cooksWithMeals.filter((c) => c.mealCount > 0);

    res.status(200).json({
      success: true,
      count: filtered.length,
      cooks: filtered,
      customerCity: filterCity || null,
      serviceAvailable: filtered.length > 0,
      addresses: customerAddresses.map(addr => ({
        _id: addr._id,
        label: addr.label,
        city: addr.city,
        isDefault: addr.isDefault,
      })),
    });
  } catch (error) {
    console.error("Get cooks error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch cooks",
    });
  }
};

/**
 * Get meals by cook ID for customers
 * Only shows available meals from active, approved, open cooks
 */
export const getMealsByCookId = async (req, res) => {
  try {
    const { cookId } = req.params;

    // Verify cook is active, approved, and open
    const cook = await Cook.findOne({
      _id: cookId,
      status: "active",
      verificationStatus: "approved",
      serviceStatus: "open",
    }).select("name address");

    if (!cook) {
      return res.status(404).json({
        success: false,
        message: "Cook not found or currently unavailable",
      });
    }

    // Get all available meals from this cook
    const meals = await Meal.find({
      cookId,
      availability: "Available",
    }).sort({ createdAt: -1 });

    const formatted = meals.map((m) => ({
      mealId: m._id,
      name: m.name,
      description: m.description,
      price: m.price,
      category: m.category,
      availability: m.availability,
      itemImage: m.itemImage,
      createdAt: m.createdAt,
    }));

    res.status(200).json({
      success: true,
      cook: {
        cookId: cook._id,
        name: cook.name,
        city: cook.address?.city || "Sukkur",
      },
      count: formatted.length,
      meals: formatted,
    });
  } catch (error) {
    console.error("Get cook meals error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch meals",
    });
  }
};

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
        select: "name status verificationStatus serviceStatus",
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
