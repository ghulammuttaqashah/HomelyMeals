import { Order } from "../../../shared/models/order.model.js";
import CookMeal from "../../cook/models/cookMeal.model.js";
import Review from "../../../shared/models/review.model.js";
import mongoose from "mongoose";
import { hasActiveCookSubscription } from "../../../shared/utils/subscriptionAccess.js";

/**
 * Get all meals from all cooks (for chatbot)
 * GET /api/customer/chatbot/meals/all
 */
export const getAllMealsForChatbot = async (req, res) => {
  try {
    const meals = await CookMeal.find({ availability: "Available" })
      .populate("cookId", "name address.city averageRating")
      .sort({ createdAt: -1 })
      .lean();

    // Filter meals from cooks with active subscriptions
    const mealsWithActiveSubscription = [];
    
    for (const meal of meals) {
      if (meal.cookId) {
        const hasSubscription = await hasActiveCookSubscription(meal.cookId._id);
        if (hasSubscription) {
          mealsWithActiveSubscription.push({
            _id: meal._id,
            name: meal.name,
            description: meal.description,
            price: meal.price,
            category: meal.category,
            itemImage: meal.itemImage,
            cookId: meal.cookId._id,
            cookName: meal.cookId.name,
            cookCity: meal.cookId.address?.city,
            cookRating: meal.cookId.averageRating || 0,
          });
        }
      }
    }

    return res.status(200).json({
      success: true,
      meals: mealsWithActiveSubscription,
      total: mealsWithActiveSubscription.length,
    });
  } catch (error) {
    console.error("Get all meals for chatbot error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch meals",
    });
  }
};

/**
 * Get top selling meals by time period
 * GET /api/customer/chatbot/meals/top-selling?period=today|week|month|overall&limit=5
 */
export const getTopSellingMealsByPeriod = async (req, res) => {
  try {
    const { period = "overall", limit = 5 } = req.query;
    const limitNum = parseInt(limit) || 5;

    // Calculate date range based on period
    let dateFilter = {};
    const now = new Date();

    switch (period) {
      case "today":
        const startOfDay = new Date(now.setHours(0, 0, 0, 0));
        dateFilter = { deliveredAt: { $gte: startOfDay } };
        break;
      case "week":
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - 7);
        dateFilter = { deliveredAt: { $gte: startOfWeek } };
        break;
      case "month":
        const startOfMonth = new Date(now);
        startOfMonth.setDate(now.getDate() - 30);
        dateFilter = { deliveredAt: { $gte: startOfMonth } };
        break;
      case "overall":
      default:
        dateFilter = {}; // No date filter for overall
        break;
    }

    // Aggregate delivered orders, group by meal
    const topMeals = await Order.aggregate([
      {
        $match: {
          status: "delivered",
          ...dateFilter,
        },
      },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.mealId",
          mealName: { $first: "$items.name" },
          totalQuantity: { $sum: "$items.quantity" },
          totalOrders: { $sum: 1 },
          price: { $first: "$items.price" },
          itemImage: { $first: "$items.itemImage" },
        },
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: limitNum },
    ]);

    // Enrich with cook information and ratings
    const enrichedMeals = await Promise.all(
      topMeals.map(async (item) => {
        let cookInfo = null;
        let averageRating = 0;
        let reviewCount = 0;

        if (item._id) {
          // Get meal details from CookMeal collection
          const meal = await CookMeal.findById(item._id)
            .populate("cookId", "name address.city averageRating")
            .lean();

          if (meal && meal.cookId) {
            cookInfo = {
              cookId: meal.cookId._id,
              cookName: meal.cookId.name,
              cookCity: meal.cookId.address?.city,
              cookRating: meal.cookId.averageRating || 0,
            };

            // Get meal rating
            const reviews = await Review.find({
              mealId: item._id,
              reviewType: "meal",
            }).lean();

            if (reviews.length > 0) {
              const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
              averageRating = totalRating / reviews.length;
              reviewCount = reviews.length;
            }
          }
        }

        return {
          mealId: item._id,
          mealName: item.mealName,
          price: item.price || 0,
          itemImage: item.itemImage,
          totalQuantity: item.totalQuantity,
          totalOrders: item.totalOrders,
          averageRating: Math.round(averageRating * 10) / 10,
          reviewCount,
          ...cookInfo,
        };
      })
    );

    // Filter out meals without cook info (inactive cooks)
    const validMeals = enrichedMeals.filter((meal) => meal.cookId);

    return res.status(200).json({
      success: true,
      period,
      meals: validMeals,
      total: validMeals.length,
    });
  } catch (error) {
    console.error("Get top selling meals by period error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch top selling meals",
    });
  }
};

/**
 * Get top rated meals
 * GET /api/customer/chatbot/meals/top-rated?limit=10
 */
export const getTopRatedMeals = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const limitNum = parseInt(limit) || 10;

    // Get all meal reviews with ratings
    const mealReviews = await Review.aggregate([
      {
        $match: {
          reviewType: "meal",
          mealId: { $ne: null },
        },
      },
      {
        $group: {
          _id: "$mealId",
          averageRating: { $avg: "$rating" },
          reviewCount: { $sum: 1 },
        },
      },
      {
        $match: {
          averageRating: { $gte: 4 }, // Only 4+ star meals
        },
      },
      { $sort: { averageRating: -1, reviewCount: -1 } },
    ]);

    // Get meal details and order counts
    const enrichedMeals = await Promise.all(
      mealReviews.map(async (review) => {
        const meal = await CookMeal.findById(review._id)
          .populate("cookId", "name address.city averageRating")
          .lean();

        if (!meal || !meal.cookId) return null;

        // Check if cook has active subscription
        const hasSubscription = await hasActiveCookSubscription(meal.cookId._id);
        if (!hasSubscription) return null;

        // Get order count for this meal
        const orderStats = await Order.aggregate([
          {
            $match: {
              status: "delivered",
              "items.mealId": review._id,
            },
          },
          { $unwind: "$items" },
          {
            $match: {
              "items.mealId": review._id,
            },
          },
          {
            $group: {
              _id: null,
              totalQuantity: { $sum: "$items.quantity" },
              totalOrders: { $sum: 1 },
            },
          },
        ]);

        const orderCount = orderStats.length > 0 ? orderStats[0].totalQuantity : 0;

        return {
          mealId: meal._id,
          mealName: meal.name,
          description: meal.description,
          price: meal.price,
          category: meal.category,
          itemImage: meal.itemImage,
          averageRating: Math.round(review.averageRating * 10) / 10,
          reviewCount: review.reviewCount,
          orderCount,
          cookId: meal.cookId._id,
          cookName: meal.cookId.name,
          cookCity: meal.cookId.address?.city,
          cookRating: meal.cookId.averageRating || 0,
        };
      })
    );

    // Filter out null values and sort
    let validMeals = enrichedMeals.filter((meal) => meal !== null);

    // Separate by rating
    const fiveStarMeals = validMeals.filter((m) => m.averageRating >= 5);
    const fourStarMeals = validMeals.filter((m) => m.averageRating >= 4 && m.averageRating < 5);

    // Sort 4-star meals by order count
    fourStarMeals.sort((a, b) => b.orderCount - a.orderCount);

    // Combine: 5-star first, then 4-star sorted by orders
    validMeals = [...fiveStarMeals, ...fourStarMeals].slice(0, limitNum);

    return res.status(200).json({
      success: true,
      meals: validMeals,
      total: validMeals.length,
    });
  } catch (error) {
    console.error("Get top rated meals error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch top rated meals",
    });
  }
};


/**
 * Get unique meal types for dropdown
 * GET /api/customer/chatbot/meals/unique-types
 */
export const getUniqueMealTypes = async (req, res) => {
  try {
    // Get ALL available meals (no filtering, no limits)
    const meals = await CookMeal.find({ availability: "Available" })
      .select("name")
      .lean();

    // Extract and normalize meal names
    const mealTypesSet = new Set();
    
    meals.forEach(meal => {
      if (meal.name) {
        // Normalize the meal name
        const normalized = normalizeMealName(meal.name);
        if (normalized) {
          mealTypesSet.add(normalized);
        }
      }
    });

    // Convert Set to sorted array with proper capitalization
    const uniqueTypes = Array.from(mealTypesSet)
      .map(type => capitalizeFirst(type))
      .sort();

    return res.status(200).json({
      success: true,
      types: uniqueTypes,
      total: uniqueTypes.length,
    });
  } catch (error) {
    console.error("Get unique meal types error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch meal types",
    });
  }
};

/**
 * Normalize meal name to extract base item type
 * Examples:
 * "Chicken Biryani" -> "biryani"
 * "Beef-Biryani" -> "biryani"
 * "Zinger Burger" -> "burger"
 * "Egg Curry" -> "egg"
 */
function normalizeMealName(name) {
  if (!name) return null;
  
  // Convert to lowercase
  let normalized = name.toLowerCase().trim();
  
  // Remove special characters and extra spaces
  normalized = normalized
    .replace(/[-_]/g, ' ')  // Replace hyphens and underscores with spaces
    .replace(/\s+/g, ' ')   // Replace multiple spaces with single space
    .trim();
  
  // Split into words
  const words = normalized.split(' ');
  
  // Extract base category (last meaningful word)
  // This works well for food items like "Chicken Biryani" -> "biryani"
  const lastWord = words[words.length - 1];
  
  // Check if last word is a known category
  const knownCategories = [
    'biryani', 'burger', 'pizza', 'pasta', 'sandwich', 'shawarma',
    'paratha', 'naan', 'roti', 'daal', 'dal', 'egg', 'chicken',
    'rice', 'karahi', 'korma', 'nihari', 'haleem', 'kebab', 'kabab',
    'tikka', 'pulao', 'samosa', 'pakora', 'roll', 'wrap', 'salad',
    'soup', 'curry', 'stew', 'fries', 'nuggets', 'wings', 'steak',
    'fish', 'shrimp', 'prawn', 'mutton', 'beef', 'goat', 'lamb',
    'paneer', 'tofu', 'vegetable', 'dessert', 'cake', 'pastry',
    'cookie', 'brownie', 'donut', 'muffin', 'pie', 'tart', 'pudding',
    'ice cream', 'smoothie', 'shake', 'juice', 'tea', 'coffee',
    'lasagna', 'spaghetti', 'macaroni', 'ravioli', 'tortilla',
    'taco', 'burrito', 'quesadilla', 'nachos', 'enchilada',
    'sushi', 'ramen', 'noodles', 'dumpling', 'spring roll',
    'fried rice', 'chow mein', 'pad thai', 'pho', 'bao',
    'croissant', 'bagel', 'toast', 'waffle', 'pancake', 'crepe'
  ];
  
  // Check if last word is a known category
  if (knownCategories.includes(lastWord)) {
    // Normalize 'dal' to 'daal'
    if (lastWord === 'dal') return 'daal';
    // Normalize 'kabab' to 'kebab'
    if (lastWord === 'kabab') return 'kebab';
    return lastWord;
  }
  
  // Check if any word in the name matches a known category
  for (const word of words) {
    if (knownCategories.includes(word)) {
      // Normalize 'dal' to 'daal'
      if (word === 'dal') return 'daal';
      // Normalize 'kabab' to 'kebab'
      if (word === 'kabab') return 'kebab';
      return word;
    }
  }
  
  // If no known category found, use the last word as category
  return lastWord;
}

/**
 * Capitalize first letter of string
 */
function capitalizeFirst(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Get top rated cooks
 * GET /api/customer/chatbot/cooks/top-rated?limit=7
 */
export const getTopRatedCooks = async (req, res) => {
  try {
    const { limit = 7 } = req.query;
    const limitNum = parseInt(limit) || 7;

    // Get all cook reviews
    const cookReviews = await Review.aggregate([
      {
        $match: {
          reviewType: "cook",
          cookId: { $ne: null },
        },
      },
      {
        $group: {
          _id: "$cookId",
          averageRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 },
        },
      },
      { $sort: { averageRating: -1 } },
    ]);

    // Enrich with cook details and order counts
    const enrichedCooks = await Promise.all(
      cookReviews.map(async (review) => {
        const { Cook } = await import("../../cook/models/cook.model.js");
        const cook = await Cook.findById(review._id)
          .select("name email profileImage address")
          .lean();

        if (!cook) return null;

        // Check active subscription
        const hasSubscription = await hasActiveCookSubscription(review._id);
        if (!hasSubscription) return null;

        // Get total orders for this cook
        const orderStats = await Order.aggregate([
          {
            $match: {
              status: "delivered",
              cookId: review._id,
            },
          },
          {
            $group: {
              _id: null,
              totalOrders: { $sum: 1 },
            },
          },
        ]);

        const totalOrders = orderStats.length > 0 ? orderStats[0].totalOrders : 0;

        return {
          cookId: cook._id,
          cookName: cook.name,
          profileImage: cook.profileImage,
          city: cook.address?.city,
          averageRating: Math.round(review.averageRating * 10) / 10,
          totalReviews: review.totalReviews,
          totalOrders,
        };
      })
    );

    // Filter out nulls and sort by rating DESC, then by totalOrders DESC (tie breaker)
    let validCooks = enrichedCooks
      .filter((cook) => cook !== null)
      .sort((a, b) => {
        // First sort by rating
        if (b.averageRating !== a.averageRating) {
          return b.averageRating - a.averageRating;
        }
        // If ratings are equal, sort by total orders
        return b.totalOrders - a.totalOrders;
      })
      .slice(0, limitNum);

    return res.status(200).json({
      success: true,
      cooks: validCooks,
      total: validCooks.length,
    });
  } catch (error) {
    console.error("Get top rated cooks error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch top rated cooks",
    });
  }
};

/**
 * Get top selling cooks
 * GET /api/customer/chatbot/cooks/top-selling?limit=7
 */
export const getTopSellingCooks = async (req, res) => {
  try {
    const { limit = 7 } = req.query;
    const limitNum = parseInt(limit) || 7;

    // Aggregate orders by cook
    const cookOrders = await Order.aggregate([
      {
        $match: {
          status: "delivered",
        },
      },
      {
        $group: {
          _id: "$cookId",
          totalOrders: { $sum: 1 },
        },
      },
      { $sort: { totalOrders: -1 } },
      { $limit: limitNum * 2 }, // Get more to filter by subscription
    ]);

    // Enrich with cook details
    const enrichedCooks = await Promise.all(
      cookOrders.map(async (order) => {
        const { Cook } = await import("../../cook/models/cook.model.js");
        const cook = await Cook.findById(order._id)
          .select("name email profileImage address")
          .lean();

        if (!cook) return null;

        // Check active subscription
        const hasSubscription = await hasActiveCookSubscription(order._id);
        if (!hasSubscription) return null;

        // Get cook rating
        const reviews = await Review.find({
          cookId: order._id,
          reviewType: "cook",
        }).lean();

        let averageRating = 0;
        if (reviews.length > 0) {
          averageRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
        }

        // Get top selling dish for this cook
        const topDish = await Order.aggregate([
          {
            $match: {
              status: "delivered",
              cookId: order._id,
            },
          },
          { $unwind: "$items" },
          {
            $group: {
              _id: "$items.name",
              totalQuantity: { $sum: "$items.quantity" },
            },
          },
          { $sort: { totalQuantity: -1 } },
          { $limit: 1 },
        ]);

        const topSellingDish = topDish.length > 0 ? topDish[0]._id : "N/A";

        return {
          cookId: cook._id,
          cookName: cook.name,
          profileImage: cook.profileImage,
          city: cook.address?.city,
          totalOrders: order.totalOrders,
          topSellingDish,
          averageRating: Math.round(averageRating * 10) / 10,
          totalReviews: reviews.length,
        };
      })
    );

    // Filter out nulls and limit
    const validCooks = enrichedCooks
      .filter((cook) => cook !== null)
      .slice(0, limitNum);

    return res.status(200).json({
      success: true,
      cooks: validCooks,
      total: validCooks.length,
    });
  } catch (error) {
    console.error("Get top selling cooks error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch top selling cooks",
    });
  }
};

/**
 * Get best cooks for top selling items
 * GET /api/customer/chatbot/cooks/by-top-items?limit=3
 */
export const getBestCooksByTopItems = async (req, res) => {
  try {
    const { limit = 3 } = req.query;
    const limitNum = parseInt(limit) || 3;

    // Get top 5 selling items overall
    const topItems = await Order.aggregate([
      {
        $match: {
          status: "delivered",
        },
      },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.mealId",
          mealName: { $first: "$items.name" },
          totalQuantity: { $sum: "$items.quantity" },
        },
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 5 },
    ]);

    // For each top item, get best cooks
    const itemsWithCooks = await Promise.all(
      topItems.map(async (item) => {
        // Get cooks selling this item with order counts
        const cookStats = await Order.aggregate([
          {
            $match: {
              status: "delivered",
              "items.mealId": item._id,
            },
          },
          { $unwind: "$items" },
          {
            $match: {
              "items.mealId": item._id,
            },
          },
          {
            $group: {
              _id: "$cookId",
              itemOrders: { $sum: "$items.quantity" },
            },
          },
          { $sort: { itemOrders: -1 } },
          { $limit: limitNum * 2 },
        ]);

        // Enrich with cook details
        const cooks = await Promise.all(
          cookStats.map(async (stat) => {
            const { Cook } = await import("../../cook/models/cook.model.js");
            const cook = await Cook.findById(stat._id)
              .select("name profileImage address")
              .lean();

            if (!cook) return null;

            // Check subscription
            const hasSubscription = await hasActiveCookSubscription(stat._id);
            if (!hasSubscription) return null;

            // Get cook rating
            const reviews = await Review.find({
              cookId: stat._id,
              reviewType: "cook",
            }).lean();

            let averageRating = 0;
            if (reviews.length > 0) {
              averageRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
            }

            return {
              cookId: cook._id,
              cookName: cook.name,
              profileImage: cook.profileImage,
              city: cook.address?.city,
              itemOrders: stat.itemOrders,
              averageRating: Math.round(averageRating * 10) / 10,
              totalReviews: reviews.length,
            };
          })
        );

        // Filter nulls and sort by orders then rating
        const validCooks = cooks
          .filter((c) => c !== null)
          .sort((a, b) => {
            if (b.itemOrders !== a.itemOrders) {
              return b.itemOrders - a.itemOrders;
            }
            return b.averageRating - a.averageRating;
          })
          .slice(0, limitNum);

        return {
          mealName: item.mealName,
          totalQuantity: item.totalQuantity,
          cooks: validCooks,
        };
      })
    );

    // Filter out items with no cooks
    const validItems = itemsWithCooks.filter((item) => item.cooks.length > 0);

    return res.status(200).json({
      success: true,
      items: validItems,
      total: validItems.length,
    });
  } catch (error) {
    console.error("Get best cooks by top items error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch cooks by top items",
    });
  }
};

/**
 * Get personalized recommendations for user
 * GET /api/customer/chatbot/recommendations?limit=10
 */
export const getPersonalizedRecommendations = async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    const limitNum = Math.min(parseInt(limit) || 5, 5); // MAX 5 results
    const userId = req.user?._id; // Get from auth middleware

    console.log("🧠 Getting recommendations for user:", userId);

    let recommendations = [];

    if (userId) {
      // User is logged in - personalized recommendations
      recommendations = await getPersonalizedMeals(userId, limitNum);
    }

    // If no personalized results or user not logged in, use fallback
    if (recommendations.length === 0) {
      console.log("📊 Using fallback recommendations");
      recommendations = await getFallbackRecommendations(limitNum);
    }

    return res.status(200).json({
      success: true,
      meals: recommendations,
      total: recommendations.length,
      personalized: userId && recommendations.length > 0,
    });
  } catch (error) {
    console.error("Get recommendations error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch recommendations",
    });
  }
};

/**
 * Get personalized meals based on user order history
 */
async function getPersonalizedMeals(userId, limit) {
  try {
    // STEP 1: Analyze user's order history
    const userOrders = await Order.find({
      customerId: userId,
      status: "delivered",
    })
      .select("items")
      .lean();

    if (userOrders.length === 0) {
      return [];
    }

    // STEP 2: Extract meal categories and count preferences
    const categoryCount = {};
    const orderedMealIds = new Set();
    const orderedMealNames = new Set();

    for (const order of userOrders) {
      for (const item of order.items) {
        orderedMealIds.add(item.mealId.toString());
        orderedMealNames.add(item.name.toLowerCase().trim());
        
        // Extract category from meal name
        const category = extractCategory(item.name);
        if (category) {
          categoryCount[category] = (categoryCount[category] || 0) + 1;
        }
      }
    }

    console.log("📊 User preferences:", categoryCount);

    // STEP 3: Find most preferred category
    let preferredCategory = null;
    let maxCount = 0;
    for (const [category, count] of Object.entries(categoryCount)) {
      if (count > maxCount) {
        maxCount = count;
        preferredCategory = category;
      }
    }

    console.log("🎯 Preferred category:", preferredCategory);

    if (!preferredCategory) {
      return [];
    }

    // STEP 4: Find meals from preferred category (DISTINCT by name)
    const categoryMeals = await CookMeal.find({
      name: { $regex: preferredCategory, $options: "i" },
      availability: "Available",
    })
      .populate("cookId", "name address.city")
      .lean();

    // STEP 5: Remove duplicates by meal name (case-insensitive)
    const uniqueMealsMap = new Map();
    for (const meal of categoryMeals) {
      const normalizedName = meal.name.toLowerCase().trim();
      
      // Skip already ordered meals
      if (orderedMealNames.has(normalizedName)) {
        continue;
      }
      
      // Keep only first occurrence of each unique name
      if (!uniqueMealsMap.has(normalizedName)) {
        uniqueMealsMap.set(normalizedName, meal);
      }
    }

    const uniqueMeals = Array.from(uniqueMealsMap.values());

    // STEP 6: Enrich with ratings and order counts
    const enrichedMeals = await Promise.all(
      uniqueMeals.map(async (meal) => {
        if (!meal.cookId) return null;

        // Check subscription
        const hasSubscription = await hasActiveCookSubscription(meal.cookId._id);
        if (!hasSubscription) return null;

        // Get rating
        const reviews = await Review.find({
          mealId: meal._id,
          reviewType: "meal",
        }).lean();

        let averageRating = 0;
        if (reviews.length > 0) {
          averageRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
        }

        // Get order count
        const orderStats = await Order.aggregate([
          {
            $match: {
              status: "delivered",
              "items.mealId": meal._id,
            },
          },
          { $unwind: "$items" },
          {
            $match: {
              "items.mealId": meal._id,
            },
          },
          {
            $group: {
              _id: null,
              totalQuantity: { $sum: "$items.quantity" },
            },
          },
        ]);

        const totalOrders = orderStats.length > 0 ? orderStats[0].totalQuantity : 0;

        return {
          mealId: meal._id,
          mealName: meal.name,
          description: meal.description,
          price: meal.price,
          category: meal.category,
          itemImage: meal.itemImage,
          healthTags: meal.healthTags || [],
          averageRating: Math.round(averageRating * 10) / 10,
          reviewCount: reviews.length,
          totalOrders,
          cookId: meal.cookId._id,
          cookName: meal.cookId.name,
          cookCity: meal.cookId.address?.city,
        };
      })
    );

    // STEP 7: Filter, sort, and limit
    const validMeals = enrichedMeals
      .filter((m) => m !== null)
      .sort((a, b) => {
        // Sort by rating DESC, then orders DESC
        if (b.averageRating !== a.averageRating) {
          return b.averageRating - a.averageRating;
        }
        return b.totalOrders - a.totalOrders;
      })
      .slice(0, limit);

    return validMeals;
  } catch (error) {
    console.error("Personalized meals error:", error);
    return [];
  }
}

/**
 * Get fallback recommendations for new users
 */
async function getFallbackRecommendations(limit) {
  try {
    // Mix of top-rated and top-selling meals
    const halfLimit = Math.ceil(limit / 2);

    // Get top-rated meals
    const topRatedReviews = await Review.aggregate([
      {
        $match: {
          reviewType: "meal",
          mealId: { $ne: null },
          rating: { $gte: 4 },
        },
      },
      {
        $group: {
          _id: "$mealId",
          averageRating: { $avg: "$rating" },
          reviewCount: { $sum: 1 },
        },
      },
      { $sort: { averageRating: -1, reviewCount: -1 } },
      { $limit: halfLimit },
    ]);

    // Get top-selling meals
    const topSelling = await Order.aggregate([
      {
        $match: {
          status: "delivered",
        },
      },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.mealId",
          totalQuantity: { $sum: "$items.quantity" },
        },
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: halfLimit },
    ]);

    // Combine and remove duplicates
    const mealIds = [
      ...topRatedReviews.map((r) => r._id),
      ...topSelling.map((s) => s._id),
    ];

    const uniqueMealIds = [...new Set(mealIds.map(id => id.toString()))].map(id => mealIds.find(m => m.toString() === id));

    const enrichedMeals = await Promise.all(
      uniqueMealIds.map(async (mealId) => {
        const meal = await CookMeal.findById(mealId)
          .populate("cookId", "name address.city")
          .lean();

        if (!meal || !meal.cookId) return null;

        // Check subscription
        const hasSubscription = await hasActiveCookSubscription(meal.cookId._id);
        if (!hasSubscription) return null;

        // Get rating
        const reviews = await Review.find({
          mealId: meal._id,
          reviewType: "meal",
        }).lean();

        let averageRating = 0;
        if (reviews.length > 0) {
          averageRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
        }

        // Get order count
        const orderStats = await Order.aggregate([
          {
            $match: {
              status: "delivered",
              "items.mealId": meal._id,
            },
          },
          { $unwind: "$items" },
          {
            $match: {
              "items.mealId": meal._id,
            },
          },
          {
            $group: {
              _id: null,
              totalQuantity: { $sum: "$items.quantity" },
            },
          },
        ]);

        const totalOrders = orderStats.length > 0 ? orderStats[0].totalQuantity : 0;

        return {
          mealId: meal._id,
          mealName: meal.name,
          description: meal.description,
          price: meal.price,
          category: meal.category,
          itemImage: meal.itemImage,
          healthTags: meal.healthTags || [],
          averageRating: Math.round(averageRating * 10) / 10,
          reviewCount: reviews.length,
          totalOrders,
          cookId: meal.cookId._id,
          cookName: meal.cookId.name,
          cookCity: meal.cookId.address?.city,
        };
      })
    );

    // Remove duplicates by name and filter nulls
    const uniqueMealsMap = new Map();
    for (const meal of enrichedMeals) {
      if (meal) {
        const normalizedName = meal.mealName.toLowerCase().trim();
        if (!uniqueMealsMap.has(normalizedName)) {
          uniqueMealsMap.set(normalizedName, meal);
        }
      }
    }

    // Filter and sort
    const validMeals = Array.from(uniqueMealsMap.values())
      .sort((a, b) => {
        // Sort by rating DESC, then orders DESC
        if (b.averageRating !== a.averageRating) {
          return b.averageRating - a.averageRating;
        }
        return b.totalOrders - a.totalOrders;
      })
      .slice(0, limit);

    return validMeals;
  } catch (error) {
    console.error("Fallback recommendations error:", error);
    return [];
  }
}

/**
 * Extract category from meal name
 */
function extractCategory(mealName) {
  if (!mealName) return null;

  const name = mealName.toLowerCase();
  
  const categories = [
    "biryani", "burger", "pizza", "pasta", "chicken", "rice", "daal",
    "egg", "sandwich", "shawarma", "karahi", "tikka", "kebab", "pulao",
    "tea", "coffee", "salad", "soup", "curry", "korma", "nihari",
    "haleem", "samosa", "pakora", "paratha", "naan", "roti"
  ];

  for (const category of categories) {
    if (name.includes(category)) {
      return category;
    }
  }

  return null;
}
