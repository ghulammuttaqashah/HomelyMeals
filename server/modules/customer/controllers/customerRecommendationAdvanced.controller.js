import { Order } from "../../../shared/models/order.model.js";
import CookMeal from "../../cook/models/cookMeal.model.js";
import Review from "../../../shared/models/review.model.js";
import { hasActiveCookSubscription } from "../../../shared/utils/subscriptionAccess.js";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/**
 * Smart Food Advisor - AI-driven meal recommendations
 * POST /api/customer/chatbot/smart-advisor
 */
export const smartFoodAdvisor = async (req, res) => {
  try {
    const { query } = req.body;
    const userId = req.user?._id;

    console.log("🧠 Smart Food Advisor Query:", query);

    // STEP 1: Use LLM to UNDERSTAND and REASON about the query
    let reasoning = null;
    
    try {
      const reasoningPrompt = `You are an intelligent nutrition and food advisor. Analyze this user query and reason about their needs.

User Query: "${query}"

Think through:
1. What is the user asking for? (health condition, preference, budget, general)
2. If it's a health condition, what dietary needs does it imply?
3. What food characteristics would be suitable? (light, protein-rich, low-oil, etc.)
4. What should be avoided?

Return a JSON object with your reasoning:
{
  "userIntent": "brief description of what user wants",
  "condition": "health condition or goal if any",
  "reasoning": "why certain foods would be suitable",
  "preferredCharacteristics": ["light", "healthy", "low-oil", "high-protein"],
  "avoidCharacteristics": ["spicy", "oily", "heavy"],
  "budgetConstraint": number or null,
  "searchKeywords": ["soup", "boiled", "grilled", "salad"] (relevant food keywords)
}

Be intelligent and adaptive. Handle typos, informal language, and vague queries.
Return ONLY valid JSON.`;

      const reasoningResponse = await groq.chat.completions.create({
        messages: [{ role: "user", content: reasoningPrompt }],
        model: "llama-3.3-70b-versatile",
        temperature: 0.4,
        max_tokens: 600,
      });

      const content = reasoningResponse.choices[0]?.message?.content?.trim();
      reasoning = JSON.parse(content);
      console.log("🧠 AI Reasoning:", reasoning);
    } catch (error) {
      console.error("LLM reasoning failed, using basic interpretation:", error);
      reasoning = basicInterpretation(query);
    }

    // STEP 2: Fetch meals from database with flexible criteria
    const mealQuery = { availability: "Available" };
    
    // Apply budget if specified
    if (reasoning.budgetConstraint) {
      mealQuery.price = { $lte: reasoning.budgetConstraint };
    }

    // Fetch broader set of meals for intelligent filtering
    let meals = [];
    
    // Try tag-based search first
    if (reasoning.preferredCharacteristics && reasoning.preferredCharacteristics.length > 0) {
      meals = await CookMeal.find({
        ...mealQuery,
        healthTags: { $in: reasoning.preferredCharacteristics }
      })
        .populate("cookId", "name address.city")
        .limit(20)
        .lean();
    }
    
    // If no tag results, try keyword-based search
    if (meals.length === 0 && reasoning.searchKeywords && reasoning.searchKeywords.length > 0) {
      const keywordPattern = reasoning.searchKeywords.join("|");
      meals = await CookMeal.find({
        ...mealQuery,
        name: { $regex: keywordPattern, $options: "i" }
      })
        .populate("cookId", "name address.city")
        .limit(20)
        .lean();
    }
    
    // If still no results, get general healthy options
    if (meals.length === 0) {
      meals = await CookMeal.find(mealQuery)
        .populate("cookId", "name address.city")
        .sort({ price: 1 }) // Prefer affordable options
        .limit(20)
        .lean();
    }

    // Remove duplicates
    const uniqueMealsMap = new Map();
    for (const meal of meals) {
      const normalizedName = meal.name.toLowerCase().trim();
      if (!uniqueMealsMap.has(normalizedName)) {
        uniqueMealsMap.set(normalizedName, meal);
      }
    }
    meals = Array.from(uniqueMealsMap.values());

    // Filter out meals with avoid characteristics
    if (reasoning.avoidCharacteristics && reasoning.avoidCharacteristics.length > 0) {
      meals = meals.filter(meal => {
        if (!meal.healthTags || meal.healthTags.length === 0) return true;
        return !meal.healthTags.some(tag => reasoning.avoidCharacteristics.includes(tag));
      });
    }

    // STEP 3: Enrich meals with ratings and orders
    const enrichedMeals = await Promise.all(
      meals.slice(0, 15).map(async (meal) => {
        if (!meal.cookId) return null;

        const hasSubscription = await hasActiveCookSubscription(meal.cookId._id);
        if (!hasSubscription) return null;

        const reviews = await Review.find({
          mealId: meal._id,
          reviewType: "meal",
        }).lean();

        let averageRating = 0;
        if (reviews.length > 0) {
          averageRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
        }

        const orderStats = await Order.aggregate([
          { $match: { status: "delivered", "items.mealId": meal._id } },
          { $unwind: "$items" },
          { $match: { "items.mealId": meal._id } },
          { $group: { _id: null, totalQuantity: { $sum: "$items.quantity" } } },
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

    let validMeals = enrichedMeals
      .filter((m) => m !== null)
      .sort((a, b) => {
        if (b.averageRating !== a.averageRating) {
          return b.averageRating - a.averageRating;
        }
        return b.totalOrders - a.totalOrders;
      });

    // STEP 4: Use AI to RANK and SELECT best matches
    if (validMeals.length > 5) {
      try {
        const rankingPrompt = `You are ranking meals for suitability.

User Query: "${query}"
User Needs: ${reasoning.userIntent}
Reasoning: ${reasoning.reasoning}

Available Meals:
${validMeals.slice(0, 10).map((m, i) => `${i + 1}. ${m.mealName} (Rs ${m.price}) - Tags: ${m.healthTags.join(", ") || "none"}`).join("\n")}

Rank these meals by suitability score (1-10) for the user's needs.
Return ONLY a JSON array of objects: [{"index": 1, "score": 9}, {"index": 3, "score": 8}, ...]
Include only meals with score >= 6. Return top 5 max.`;

        const rankingResponse = await groq.chat.completions.create({
          messages: [{ role: "user", content: rankingPrompt }],
          model: "llama-3.3-70b-versatile",
          temperature: 0.3,
          max_tokens: 200,
        });

        const rankingContent = rankingResponse.choices[0]?.message?.content?.trim();
        const rankings = JSON.parse(rankingContent);
        
        if (Array.isArray(rankings) && rankings.length > 0) {
          validMeals = rankings
            .sort((a, b) => b.score - a.score)
            .map(r => validMeals[r.index - 1])
            .filter(m => m !== undefined)
            .slice(0, 5);
        } else {
          validMeals = validMeals.slice(0, 5);
        }
      } catch (error) {
        console.error("AI ranking failed, using default sort:", error);
        validMeals = validMeals.slice(0, 5);
      }
    } else {
      validMeals = validMeals.slice(0, 5);
    }

    // STEP 5: Generate natural, helpful response
    let guidance = "";
    
    try {
      const responsePrompt = `You are a helpful nutrition assistant. Respond naturally to the user.

User Query: "${query}"
Your Understanding: ${reasoning.userIntent}
Your Reasoning: ${reasoning.reasoning}
Meals Found: ${validMeals.length}

Provide a natural, conversational response (max 70 words):
1. Show you understood their need
2. Brief reasoning why these foods fit
3. Keep it warm and helpful

Be natural, not robotic. Speak like a caring nutritionist.`;

      const guidanceResponse = await groq.chat.completions.create({
        messages: [{ role: "user", content: responsePrompt }],
        model: "llama-3.3-70b-versatile",
        temperature: 0.7,
        max_tokens: 180,
      });

      guidance = guidanceResponse.choices[0]?.message?.content?.trim();
    } catch (error) {
      console.error("Guidance generation failed:", error);
      guidance = `I understand you're looking for ${reasoning.userIntent}. Here are some suitable options for you.`;
    }

    return res.status(200).json({
      success: true,
      guidance,
      reasoning: reasoning.userIntent,
      meals: validMeals,
      total: validMeals.length,
    });
  } catch (error) {
    console.error("Smart Food Advisor error:", error);
    
    // Graceful degradation - ALWAYS return something helpful
    return res.status(200).json({
      success: true,
      guidance: "I'm here to help you find suitable meals. Let me show you some popular healthy options.",
      meals: await getFallbackRecommendations(5),
      total: 5,
    });
  }
};

/**
 * Basic interpretation fallback (when LLM fails)
 */
function basicInterpretation(query) {
  const lowerQuery = query.toLowerCase();
  
  const interpretation = {
    userIntent: "meal recommendations",
    condition: null,
    reasoning: "Based on your query",
    preferredCharacteristics: [],
    avoidCharacteristics: [],
    budgetConstraint: null,
    searchKeywords: []
  };

  // Health conditions
  if (lowerQuery.includes("cholesterol") || lowerQuery.includes("cholestrol")) {
    interpretation.condition = "cholesterol";
    interpretation.userIntent = "meals suitable for cholesterol management";
    interpretation.reasoning = "Light, low-oil meals are better for cholesterol";
    interpretation.preferredCharacteristics = ["healthy", "light", "low-calorie"];
    interpretation.avoidCharacteristics = ["oily", "heavy"];
    interpretation.searchKeywords = ["salad", "grilled", "boiled", "vegetable"];
  } else if (lowerQuery.includes("flu") || lowerQuery.includes("fever") || lowerQuery.includes("cold")) {
    interpretation.condition = "flu/fever";
    interpretation.userIntent = "light meals for recovery";
    interpretation.reasoning = "Light, easy-to-digest meals help during illness";
    interpretation.preferredCharacteristics = ["light", "healthy"];
    interpretation.avoidCharacteristics = ["spicy", "oily", "heavy"];
    interpretation.searchKeywords = ["soup", "light", "soft"];
  } else if (lowerQuery.includes("headache") || lowerQuery.includes("headach")) {
    interpretation.condition = "headache";
    interpretation.userIntent = "light meals for headache";
    interpretation.reasoning = "Light meals are easier when you have a headache";
    interpretation.preferredCharacteristics = ["light", "healthy"];
    interpretation.avoidCharacteristics = ["spicy"];
    interpretation.searchKeywords = ["light", "simple"];
  } else if (lowerQuery.includes("protein") || lowerQuery.includes("protien")) {
    interpretation.userIntent = "high-protein meals";
    interpretation.reasoning = "Protein-rich foods for strength and energy";
    interpretation.preferredCharacteristics = ["high-protein"];
    interpretation.searchKeywords = ["chicken", "egg", "meat", "fish"];
  } else if (lowerQuery.includes("healthy") || lowerQuery.includes("helthy")) {
    interpretation.userIntent = "healthy meal options";
    interpretation.reasoning = "Nutritious and balanced meals";
    interpretation.preferredCharacteristics = ["healthy", "light"];
    interpretation.searchKeywords = ["salad", "grilled", "vegetable"];
  }

  // Budget
  if (lowerQuery.includes("cheap") || lowerQuery.includes("budget") || lowerQuery.includes("under")) {
    const priceMatch = lowerQuery.match(/\d+/);
    if (priceMatch) {
      interpretation.budgetConstraint = parseInt(priceMatch[0]);
    } else {
      interpretation.budgetConstraint = 300;
    }
  }

  return interpretation;
}

/**
 * Build name pattern for tag-based search
 */
function buildNamePattern(tags) {
  const patterns = {
    "spicy": "spicy|chili|hot|pepper",
    "vegetarian": "veg|paneer|daal|salad|vegetable",
    "high-protein": "chicken|beef|mutton|egg|fish|protein",
    "healthy": "salad|grilled|steamed|boiled",
    "light": "soup|salad|yogurt|tea",
  };

  const matchedPatterns = tags
    .map(tag => patterns[tag])
    .filter(p => p);

  return matchedPatterns.length > 0 ? matchedPatterns.join("|") : null;
}

/**
 * Fallback parameter extraction using keyword matching
 */
function extractParametersFallback(query) {
  const lowerQuery = query.toLowerCase();
  
  const analysis = {
    intent: "general",
    healthCondition: null,
    budget: null,
    dietaryPreference: null,
    spicyPreference: null,
    avoidTags: [],
    preferTags: [],
    maxPrice: null,
    reasoning: "Keyword-based extraction"
  };

  // Health conditions - comprehensive detection
  const healthKeywords = {
    cholesterol: ["cholesterol", "high cholesterol", "ldl", "hdl"],
    fever: ["fever", "temperature", "high temp"],
    flu: ["flu", "influenza"],
    cold: ["cold", "cough", "runny nose"],
    headache: ["headache", "migraine", "head pain"],
    diabetes: ["diabetes", "sugar", "diabetic", "blood sugar"],
    weakness: ["weakness", "weak", "tired", "fatigue", "exhausted"],
    stomachache: ["stomach", "stomachache", "stomach pain", "tummy"],
    acidity: ["acidity", "acid", "gastric", "heartburn"],
    indigestion: ["indigestion", "bloating", "gas"],
  };

  for (const [condition, keywords] of Object.entries(healthKeywords)) {
    if (keywords.some(keyword => lowerQuery.includes(keyword))) {
      analysis.healthCondition = condition;
      analysis.intent = "health";
      break;
    }
  }

  // Spicy preference
  if (lowerQuery.includes("spicy") || lowerQuery.includes("hot")) {
    analysis.spicyPreference = "spicy";
    analysis.preferTags.push("spicy");
  } else if (lowerQuery.includes("non-spicy") || lowerQuery.includes("mild")) {
    analysis.spicyPreference = "non-spicy";
    analysis.preferTags.push("non-spicy");
  }

  // Budget
  if (lowerQuery.includes("cheap") || lowerQuery.includes("budget") || lowerQuery.includes("affordable")) {
    analysis.budget = "low";
    analysis.maxPrice = 300;
  }

  // Preferences
  if (lowerQuery.includes("protein")) analysis.preferTags.push("high-protein");
  if (lowerQuery.includes("healthy")) analysis.preferTags.push("healthy");
  if (lowerQuery.includes("light")) analysis.preferTags.push("light");
  if (lowerQuery.includes("vegetarian") || lowerQuery.includes("veg")) analysis.preferTags.push("vegetarian");
  if (lowerQuery.includes("low calorie")) analysis.preferTags.push("low-calorie");

  return analysis;
}

/**
 * Map health conditions to food rules
 */
function mapHealthConditionToRules(condition) {
  const rules = {
    // Cardiovascular
    cholesterol: {
      prefer: ["healthy", "low-calorie", "light", "vegetarian"],
      avoid: ["oily", "heavy", "spicy"],
      guidance: "For cholesterol, avoid oily and fried foods. Prefer light, low-oil, and high-fiber meals."
    },
    "high-cholesterol": {
      prefer: ["healthy", "low-calorie", "light", "vegetarian"],
      avoid: ["oily", "heavy"],
      guidance: "For high cholesterol, choose low-oil and fiber-rich meals. Avoid fried and heavy foods."
    },
    
    // Infections & Illness
    fever: {
      prefer: ["light", "healthy"],
      avoid: ["spicy", "oily", "heavy"],
      guidance: "For fever, prefer light and easy-to-digest meals. Avoid spicy and oily food."
    },
    flu: {
      prefer: ["light", "healthy"],
      avoid: ["spicy", "oily", "heavy"],
      guidance: "For flu, choose warm, light meals. Avoid spicy and heavy dishes."
    },
    cold: {
      prefer: ["light", "healthy"],
      avoid: ["oily", "heavy"],
      guidance: "For cold, opt for warm, light meals. Avoid heavy and oily dishes."
    },
    cough: {
      prefer: ["light", "healthy"],
      avoid: ["spicy", "oily"],
      guidance: "For cough, choose light meals and avoid spicy or oily food."
    },
    
    // Pain & Discomfort
    headache: {
      prefer: ["light", "healthy"],
      avoid: ["spicy", "oily"],
      guidance: "For headache, opt for light meals and stay hydrated. Avoid spicy food."
    },
    migraine: {
      prefer: ["light", "healthy"],
      avoid: ["spicy", "heavy"],
      guidance: "For migraine, choose light, simple meals. Avoid spicy and heavy foods."
    },
    stomachache: {
      prefer: ["light", "healthy"],
      avoid: ["spicy", "oily", "heavy"],
      guidance: "For stomach issues, eat light and bland meals. Avoid spicy, oily, and heavy food."
    },
    
    // Metabolic
    diabetes: {
      prefer: ["healthy", "low-calorie", "high-protein"],
      avoid: ["heavy"],
      guidance: "For diabetes, choose healthy, low-calorie options. Avoid heavy meals."
    },
    sugar: {
      prefer: ["healthy", "low-calorie", "high-protein"],
      avoid: ["heavy"],
      guidance: "For blood sugar management, prefer healthy and protein-rich meals."
    },
    
    // General Health
    "weight-loss": {
      prefer: ["healthy", "low-calorie", "light"],
      avoid: ["oily", "heavy"],
      guidance: "For weight loss, choose light and low-calorie meals. Avoid oily and heavy dishes."
    },
    weakness: {
      prefer: ["high-protein", "healthy"],
      avoid: [],
      guidance: "For weakness, choose protein-rich and nutritious meals for energy."
    },
    "energy-boost": {
      prefer: ["high-protein", "healthy"],
      avoid: [],
      guidance: "For energy, choose protein-rich and nutritious meals."
    },
    fatigue: {
      prefer: ["high-protein", "healthy"],
      avoid: ["heavy"],
      guidance: "For fatigue, opt for protein-rich meals. Avoid heavy foods."
    },
    
    // Digestive
    acidity: {
      prefer: ["light", "healthy"],
      avoid: ["spicy", "oily"],
      guidance: "For acidity, choose light and non-spicy meals. Avoid oily and spicy food."
    },
    gastric: {
      prefer: ["light", "healthy"],
      avoid: ["spicy", "oily", "heavy"],
      guidance: "For gastric issues, eat light meals. Avoid spicy, oily, and heavy food."
    },
    indigestion: {
      prefer: ["light", "healthy"],
      avoid: ["spicy", "oily", "heavy"],
      guidance: "For indigestion, choose light and simple meals. Avoid spicy and heavy food."
    },
  };

  return rules[condition?.toLowerCase()] || null;
}

/**
 * Generate fallback guidance when AI fails
 */
function generateFallbackGuidance(analysis, mealCount) {
  // If health condition detected, use condition-specific guidance
  if (analysis.healthCondition) {
    const rules = mapHealthConditionToRules(analysis.healthCondition);
    if (rules && rules.guidance) {
      return rules.guidance;
    }
  }

  if (analysis.budget === "low") {
    return "Here are some budget-friendly meal options under Rs 300.";
  }

  if (mealCount > 0) {
    return "Based on your preferences, here are some recommended meals.";
  }

  return "Let me show you some popular meal options.";
}

/**
 * Health-Based Meal Recommendations
 * GET /api/customer/chatbot/health-meals?tags=healthy,light&limit=10
 */
export const getHealthBasedMeals = async (req, res) => {
  try {
    const { tags, limit = 5 } = req.query;
    const limitNum = Math.min(parseInt(limit) || 5, 5); // MAX 5 results

    if (!tags) {
      return res.status(400).json({
        success: false,
        message: "Please provide health tags",
      });
    }

    const tagArray = tags.split(",").map(t => t.trim());

    // STEP 1: STRICT match - ALL tags must be present
    let meals = await CookMeal.find({
      availability: "Available",
      healthTags: { $all: tagArray },
    })
      .populate("cookId", "name address.city")
      .lean();

    let matchType = "strict";

    // STEP 2: If no strict match, try partial match (at least one tag)
    if (meals.length === 0) {
      matchType = "partial";
      meals = await CookMeal.find({
        availability: "Available",
        healthTags: { $in: tagArray },
      })
        .populate("cookId", "name address.city")
        .lean();
    }

    // STEP 3: If still no results, try name-based fallback
    if (meals.length === 0) {
      matchType = "fallback";
      const fallbackQuery = { availability: "Available" };
      
      // Map tags to name patterns
      const namePatterns = [];
      if (tagArray.includes("light") || tagArray.includes("low-calorie")) {
        namePatterns.push("salad|soup|yogurt|tea");
        fallbackQuery.price = { $lte: 400 };
      }
      
      if (tagArray.includes("vegan") || tagArray.includes("vegetarian")) {
        namePatterns.push("salad|vegetable|veg|paneer|daal");
      }
      
      if (tagArray.includes("high-protein")) {
        namePatterns.push("chicken|beef|mutton|egg|fish|protein");
      }

      if (tagArray.includes("spicy")) {
        namePatterns.push("spicy|chili|hot|pepper|biryani|karahi");
      }

      if (namePatterns.length > 0) {
        fallbackQuery.name = { $regex: namePatterns.join("|"), $options: "i" };
        meals = await CookMeal.find(fallbackQuery)
          .populate("cookId", "name address.city")
          .limit(15)
          .lean();
      }
    }

    // Remove duplicates by name
    const uniqueMealsMap = new Map();
    for (const meal of meals) {
      const normalizedName = meal.name.toLowerCase().trim();
      if (!uniqueMealsMap.has(normalizedName)) {
        uniqueMealsMap.set(normalizedName, meal);
      }
    }
    meals = Array.from(uniqueMealsMap.values());

    // STEP 4: Enrich with ratings and orders
    const enrichedMeals = await Promise.all(
      meals.map(async (meal) => {
        if (!meal.cookId) return null;

        const hasSubscription = await hasActiveCookSubscription(meal.cookId._id);
        if (!hasSubscription) return null;

        const reviews = await Review.find({
          mealId: meal._id,
          reviewType: "meal",
        }).lean();

        let averageRating = 0;
        if (reviews.length > 0) {
          averageRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
        }

        const orderStats = await Order.aggregate([
          { $match: { status: "delivered", "items.mealId": meal._id } },
          { $unwind: "$items" },
          { $match: { "items.mealId": meal._id } },
          { $group: { _id: null, totalQuantity: { $sum: "$items.quantity" } } },
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
          nutritionInfo: meal.nutritionInfo || {},
          averageRating: Math.round(averageRating * 10) / 10,
          reviewCount: reviews.length,
          totalOrders,
          cookId: meal.cookId._id,
          cookName: meal.cookId.name,
          cookCity: meal.cookId.address?.city,
        };
      })
    );

    // Filter, sort, and LIMIT to 3-5 results
    const validMeals = enrichedMeals
      .filter((m) => m !== null)
      .sort((a, b) => {
        if (b.averageRating !== a.averageRating) {
          return b.averageRating - a.averageRating;
        }
        return b.totalOrders - a.totalOrders;
      })
      .slice(0, limitNum);

    // Generate appropriate message
    let message = null;
    if (validMeals.length === 0) {
      const tagString = tagArray.join(", ");
      message = `No strongly matching meals found for '${tagString}' 😔`;
    } else if (matchType === "fallback") {
      message = "Couldn't find exact match, here are closest options";
    } else if (matchType === "partial") {
      message = "Here are meals matching some of your preferences";
    }

    return res.status(200).json({
      success: true,
      meals: validMeals,
      total: validMeals.length,
      tags: tagArray,
      matchType,
      message,
    });
  } catch (error) {
    console.error("Health-based meals error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch health-based meals",
    });
  }
};

/**
 * Compare Meals
 * POST /api/customer/chatbot/compare-meals
 */
export const compareMeals = async (req, res) => {
  try {
    const { mealIds } = req.body;

    if (!mealIds || !Array.isArray(mealIds) || mealIds.length < 2 || mealIds.length > 3) {
      return res.status(400).json({
        success: false,
        message: "Please provide 2-3 unique meal IDs to compare",
      });
    }

    // Remove duplicate IDs
    const uniqueMealIds = [...new Set(mealIds)];
    
    if (uniqueMealIds.length < 2) {
      return res.status(400).json({
        success: false,
        message: "Please select different meals to compare",
      });
    }

    // Fetch meals
    const meals = await CookMeal.find({ _id: { $in: uniqueMealIds } })
      .populate("cookId", "name address.city")
      .lean();

    if (meals.length < 2) {
      return res.status(400).json({
        success: false,
        message: "Could not find all selected meals",
      });
    }

    // Enrich with full details
    const comparisonData = await Promise.all(
      meals.map(async (meal) => {
        const reviews = await Review.find({
          mealId: meal._id,
          reviewType: "meal",
        }).lean();

        let averageRating = 0;
        let sentiment = { positive: 0, negative: 0, neutral: 0 };
        
        if (reviews.length > 0) {
          averageRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
          
          reviews.forEach(r => {
            if (r.rating >= 4) sentiment.positive++;
            else if (r.rating <= 2) sentiment.negative++;
            else sentiment.neutral++;
          });
        }

        const orderStats = await Order.aggregate([
          { $match: { status: "delivered", "items.mealId": meal._id } },
          { $unwind: "$items" },
          { $match: { "items.mealId": meal._id } },
          { $group: { _id: null, totalQuantity: { $sum: "$items.quantity" } } },
        ]);

        const totalOrders = orderStats.length > 0 ? orderStats[0].totalQuantity : 0;
        const totalReviews = reviews.length;
        const positivePercent = totalReviews > 0 ? Math.round((sentiment.positive / totalReviews) * 100) : 0;

        return {
          mealId: meal._id,
          mealName: meal.name,
          description: meal.description,
          price: meal.price,
          category: meal.category,
          itemImage: meal.itemImage,
          healthTags: meal.healthTags || [],
          nutritionInfo: meal.nutritionInfo || {},
          averageRating: Math.round(averageRating * 10) / 10,
          reviewCount: reviews.length,
          totalOrders,
          cookId: meal.cookId?._id,
          cookName: meal.cookId?.name,
          cookCity: meal.cookId?.address?.city,
          sentiment: {
            positive: sentiment.positive,
            negative: sentiment.negative,
            neutral: sentiment.neutral,
            positivePercent,
          },
        };
      })
    );

    // Find best in each category
    const cheapest = comparisonData.reduce((min, m) => m.price < min.price ? m : min);
    const highestRated = comparisonData.reduce((max, m) => m.averageRating > max.averageRating ? m : max);
    const mostPopular = comparisonData.reduce((max, m) => m.totalOrders > max.totalOrders ? m : max);

    // Generate structured comparison summary
    let summary = `Comparison:\n`;
    summary += `💰 Cheapest: ${cheapest.mealName} (Rs ${cheapest.price})\n`;
    summary += `⭐ Highest Rated: ${highestRated.mealName} (${highestRated.averageRating}★)\n`;
    summary += `🔥 Most Popular: ${mostPopular.mealName} (${mostPopular.totalOrders} orders)`;

    return res.status(200).json({
      success: true,
      meals: comparisonData,
      summary,
      highlights: {
        cheapest: cheapest.mealId,
        highestRated: highestRated.mealId,
        mostPopular: mostPopular.mealId,
      },
      total: comparisonData.length,
    });
  } catch (error) {
    console.error("Compare meals error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to compare meals",
    });
  }
};

/**
 * Get available health tags
 * GET /api/customer/chatbot/health-tags
 */
export const getHealthTags = async (req, res) => {
  try {
    const tags = [
      { value: "healthy", label: "🥗 Healthy", description: "Nutritious and balanced" },
      { value: "light", label: "🍃 Light", description: "Easy to digest" },
      { value: "oily", label: "🍟 Oily", description: "Rich and fried" },
      { value: "spicy", label: "🌶️ Spicy", description: "Hot and spicy" },
      { value: "high-protein", label: "💪 High Protein", description: "Protein-rich meals" },
      { value: "low-calorie", label: "📉 Low Calorie", description: "Diet-friendly" },
      { value: "vegetarian", label: "🥬 Vegetarian", description: "No meat" },
      { value: "vegan", label: "🌱 Vegan", description: "Plant-based only" },
      { value: "heavy", label: "🍖 Heavy", description: "Filling and rich" },
    ];

    return res.status(200).json({
      success: true,
      tags,
    });
  } catch (error) {
    console.error("Get health tags error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch health tags",
    });
  }
};

/**
 * Get fallback recommendations (popular meals)
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
