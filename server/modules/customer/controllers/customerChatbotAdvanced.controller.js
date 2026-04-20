import { Order } from "../../../shared/models/order.model.js";
import CookMeal from "../../cook/models/cookMeal.model.js";
import Review from "../../../shared/models/review.model.js";
import { Cook } from "../../cook/models/cook.model.js";
import mongoose from "mongoose";
import { hasActiveCookSubscription } from "../../../shared/utils/subscriptionAccess.js";
import Groq from "groq-sdk";
import { GROQ_API_KEY } from "../../../shared/config/env.js";

const groq = new Groq({ apiKey: GROQ_API_KEY });

/**
 * GLOBAL CHAT - Natural conversational AI
 * POST /api/customer/chatbot/advanced
 * 
 * Purpose: General conversation, recommendations, questions
 * Output: Natural text responses ONLY (no cards, no data)
 * 
 * STRICT RULE: This endpoint NEVER returns meal cards or data.
 * For meal searches, user must use Feature Search.
 */
export const advancedChatbot = async (req, res) => {
  try {
    const { message, conversationHistory = [] } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Message is required",
      });
    }

    console.log("💬 Global Chat:", message);

    // Check if user is asking for meal search
    const isMealSearch = checkIfMealSearch(message);
    
    if (isMealSearch) {
      // Redirect to feature search
      return res.status(200).json({
        success: true,
        response: "To search for meals, please use the search feature in the 'Top Selling Meals' section above! I can help you with general questions here. 😊",
        data: null,
        hasData: false,
      });
    }

    // AI generates natural conversational response
    const response = await generateChatResponse(message, conversationHistory);

    return res.status(200).json({
      success: true,
      response: response.text,
      data: null, // Chat NEVER returns cards
      hasData: false,
    });
  } catch (error) {
    console.error("Chat error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

/**
 * FEATURE SEARCH - Structured data search
 * POST /api/customer/chatbot/feature-search
 * 
 * Purpose: Search top-selling meals with filters
 * Output: Short summary + meal cards ONLY
 */
export const featureSearchChatbot = async (req, res) => {
  try {
    const { message, conversationHistory = [] } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Message is required",
      });
    }

    console.log("🔍 Feature Search:", message);

    // Check relevance
    const isRelevant = checkSearchRelevance(message);
    
    if (!isRelevant) {
      return res.status(200).json({
        success: true,
        response: await generateSearchRedirect(message),
        data: null,
        hasData: false,
      });
    }

    // Extract filters with AI
    const filters = await extractSearchFilters(message);
    
    console.log("📊 Filters:", filters);

    // Query database
    const dbResults = await queryTopSellingMeals(filters);
    
    if (!dbResults.data || dbResults.data.length === 0) {
      // Handle no results
      const noResultsMsg = await generateNoResultsMessage(message, filters);
      return res.status(200).json({
        success: true,
        response: noResultsMsg,
        data: null,
        hasData: false,
      });
    }

    // Generate SHORT summary (1 line only)
    const summary = await generateSearchSummary(message, filters, dbResults.data);

    return res.status(200).json({
      success: true,
      response: summary,
      data: dbResults.data,
      hasData: true,
    });
  } catch (error) {
    console.error("Search error:", error);
    return res.status(500).json({
      success: false,
      message: "Search failed. Please try again.",
    });
  }
};

/**
 * Check if message is a meal search query
 * If yes, redirect to feature search
 */
function checkIfMealSearch(message) {
  const msg = message.toLowerCase();
  
  // Meal search indicators
  const searchIndicators = [
    'biryani', 'burger', 'pizza', 'pasta', 'chicken', 'rice', 'daal',
    'egg', 'sandwich', 'shawarma', 'karahi', 'tikka', 'kebab', 'pulao',
    'tea', 'coffee', 'salad', 'soup', 'curry', 'korma', 'nihari',
    'under', 'cheap', 'top', 'best', 'selling', 'popular',
    'today', 'yesterday', 'week', 'month'
  ];
  
  // Check if message contains meal search terms
  const hasMealSearch = searchIndicators.some(term => msg.includes(term));
  
  // Exclude general questions
  const isGeneralQuestion = 
    msg.includes('what should i eat') ||
    msg.includes('recommend') ||
    msg.includes('suggest') ||
    msg.includes('help me choose');
  
  return hasMealSearch && !isGeneralQuestion;
}

/**
 * Generate natural chat response
 * Style: Conversational, flexible, natural
 */
async function generateChatResponse(message, conversationHistory) {
  try {
    const systemPrompt = `You are a friendly food assistant for Homely Meals.

PERSONALITY:
- Warm and conversational
- Helpful and knowledgeable
- Natural like ChatGPT

CAPABILITIES:
- Answer questions about the service
- Give food recommendations
- Provide general help
- Have natural conversations

RULES:
- Keep responses concise (2-3 sentences)
- Be friendly and engaging
- Never mention meal cards or UI elements
- Focus on conversation, not data presentation

Respond naturally to the user's message.`;

    const context = conversationHistory.slice(-4).map(msg => 
      `${msg.sender}: ${msg.text}`
    ).join('\n');

    const messages = [
      { role: "system", content: systemPrompt }
    ];
    
    if (context) {
      messages.push({ role: "assistant", content: `Context:\n${context}` });
    }
    
    messages.push({ role: "user", content: message });

    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages,
      temperature: 0.8,
      max_tokens: 150,
    });

    return {
      text: response.choices[0].message.content.trim()
    };
  } catch (error) {
    console.error("Chat response error:", error);
    return {
      text: "I'm here to help! What would you like to know about our meals?"
    };
  }
}

/**
 * Check if query is relevant to meal search
 * Simple keyword-based check (fast)
 */
function checkSearchRelevance(message) {
  const msg = message.toLowerCase();
  
  const foodKeywords = [
    'biryani', 'burger', 'pizza', 'pasta', 'chicken', 'rice', 'daal',
    'egg', 'sandwich', 'shawarma', 'karahi', 'tikka', 'kebab', 'pulao',
    'tea', 'coffee', 'salad', 'soup', 'curry', 'korma', 'nihari',
    'today', 'yesterday', 'week', 'month', 'cheap', 'under', 'top',
    'selling', 'best', 'popular', 'food', 'meal', 'dish'
  ];
  
  const nonRelevant = ['who are you', 'hello', 'hi', 'hey', 'how are you'];
  
  const hasFood = foodKeywords.some(kw => msg.includes(kw));
  const isGreeting = nonRelevant.some(nr => msg.includes(nr));
  
  return hasFood && !isGreeting;
}

/**
 * Generate redirect message for off-topic queries
 */
async function generateSearchRedirect(message) {
  try {
    const systemPrompt = `You are a search assistant. The user asked something off-topic.

USER QUERY: "${message}"

Generate a brief, friendly redirect (1-2 sentences) that:
1. Acknowledges their message
2. Explains this is for meal search
3. Gives ONE example

Keep it SHORT and friendly.`;

    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Generate redirect" },
      ],
      temperature: 0.7,
      max_tokens: 80,
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    return "This search helps you find top-selling meals. Try 'biryani today' or 'pasta under 200'!";
  }
}

/**
 * Extract search filters using AI
 * Returns structured filter object
 */
async function extractSearchFilters(message) {
  try {
    const systemPrompt = `Extract search filters from the query.

EXTRACT:
- mealName: dish name or null
- timePeriod: today, yesterday, week, month, overall
- limit: number (default 10, max 50)
- maxPrice: number or null
- minRating: number or null

EXAMPLES:
"tea" -> {mealName: "tea", timePeriod: "overall", limit: 10}
"top 3 biryani today" -> {mealName: "biryani", timePeriod: "today", limit: 3}
"salad yesterday" -> {mealName: "salad", timePeriod: "yesterday", limit: 10}

Return ONLY JSON:
{
  "mealName": "string or null",
  "timePeriod": "today|yesterday|week|month|overall",
  "limit": number,
  "maxPrice": number or null,
  "minRating": number or null
}`;

    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
      temperature: 0.2,
      max_tokens: 150,
    });

    let output = response.choices[0].message.content.trim();
    
    // Clean JSON
    output = output.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    const filters = JSON.parse(output);
    
    // Validate
    if (!filters.limit || filters.limit < 1) filters.limit = 10;
    if (filters.limit > 50) filters.limit = 50;
    if (!filters.timePeriod) filters.timePeriod = "overall";
    
    return filters;
  } catch (error) {
    console.error("Filter extraction error:", error);
    // Fallback
    return {
      mealName: null,
      timePeriod: "overall",
      limit: 10,
      maxPrice: null,
      minRating: null
    };
  }
}

/**
 * Generate SHORT search summary (1 line only)
 * NO paragraphs, NO storytelling
 */
async function generateSearchSummary(query, filters, results) {
  try {
    const systemPrompt = `Generate a SHORT 1-line summary for search results.

QUERY: "${query}"
RESULTS: ${results.length} meals found
TOP MEAL: ${results[0].mealName} (${results[0].totalQuantity} orders)

RULES:
- MAXIMUM 1 sentence
- NO paragraphs
- NO explanations
- Just state what was found
- Use emoji sparingly (max 1)

EXAMPLES:
"Found 3 biryani options 👇"
"Here are 5 top sellers from today 🔥"
"Got 1 great match for tea 👇"

Generate ONLY the summary text.`;

    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Generate summary" },
      ],
      temperature: 0.6,
      max_tokens: 50,
    });

    let summary = response.choices[0].message.content.trim();
    
    // Ensure it's short (fallback if AI generates too much)
    if (summary.length > 100) {
      summary = `Found ${results.length} ${filters.mealName || "meal"}${results.length > 1 ? 's' : ''} 👇`;
    }
    
    return summary;
  } catch (error) {
    console.error("Summary generation error:", error);
    return `Found ${results.length} result${results.length > 1 ? 's' : ''} 👇`;
  }
}

/**
 * Generate no results message
 */
async function generateNoResultsMessage(query, filters) {
  try {
    const systemPrompt = `Generate a brief "no results" message.

QUERY: "${query}"
FILTERS: ${JSON.stringify(filters)}

RULES:
- Keep it SHORT (1-2 sentences)
- Be helpful
- Suggest trying different search

Generate ONLY the message.`;

    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Generate message" },
      ],
      temperature: 0.7,
      max_tokens: 80,
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    return `No ${filters.mealName || "meals"} found. Try a different search!`;
  }
}

/**
 * Query database for top selling meals
 * Pure data layer - no response generation
 */
async function queryTopSellingMeals(filters) {
  const { mealName, timePeriod, limit, maxPrice, minRating } = filters;
  
  console.log("📊 Querying DB:", filters);
  
  // Calculate date range
  let dateFilter = {};
  const now = new Date();
  
  switch (timePeriod) {
    case "yesterday":
      const startOfYesterday = new Date(now);
      startOfYesterday.setDate(now.getDate() - 1);
      startOfYesterday.setHours(0, 0, 0, 0);
      const endOfYesterday = new Date(now);
      endOfYesterday.setDate(now.getDate() - 1);
      endOfYesterday.setHours(23, 59, 59, 999);
      dateFilter = { 
        deliveredAt: { 
          $gte: startOfYesterday,
          $lte: endOfYesterday
        } 
      };
      break;
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
    default:
      dateFilter = {};
  }
  
  // Build match query
  const matchQuery = {
    status: "delivered",
    ...dateFilter,
  };
  
  if (mealName) {
    matchQuery["items.name"] = { $regex: mealName, $options: "i" };
  }
  
  if (maxPrice) {
    matchQuery["items.price"] = { $lte: maxPrice };
  }
  
  // Aggregate top selling
  const topMeals = await Order.aggregate([
    { $match: matchQuery },
    { $unwind: "$items" },
    ...(mealName ? [{ $match: { "items.name": { $regex: mealName, $options: "i" } } }] : []),
    ...(maxPrice ? [{ $match: { "items.price": { $lte: maxPrice } } }] : []),
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
    { $limit: limit },
  ]);
  
  console.log(`✅ Found ${topMeals.length} meals`);
  
  if (topMeals.length === 0) {
    // Try fallback with broader time period
    if (timePeriod === "yesterday" || timePeriod === "today") {
      return await queryTopSellingMeals({ ...filters, timePeriod: "week" });
    } else if (timePeriod === "week") {
      return await queryTopSellingMeals({ ...filters, timePeriod: "month" });
    } else if (timePeriod === "month") {
      return await queryTopSellingMeals({ ...filters, timePeriod: "overall" });
    }
    
    return { data: [], hasData: false };
  }
  
  // Enrich with cook info and ratings
  const enrichedMeals = await Promise.all(
    topMeals.map(async (item) => {
      const meal = await CookMeal.findById(item._id)
        .populate("cookId", "name address.city")
        .lean();
      
      if (!meal || !meal.cookId) return null;
      
      const reviews = await Review.find({
        mealId: item._id,
        reviewType: "meal",
      }).lean();
      
      let averageRating = 0;
      if (reviews.length > 0) {
        averageRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
      }
      
      // Apply rating filter
      if (minRating && averageRating < minRating) {
        return null;
      }
      
      return {
        mealId: item._id,
        mealName: item.mealName,
        price: item.price,
        itemImage: item.itemImage,
        totalQuantity: item.totalQuantity,
        totalOrders: item.totalOrders,
        averageRating: Math.round(averageRating * 10) / 10,
        reviewCount: reviews.length,
        cookId: meal.cookId._id,
        cookName: meal.cookId.name,
        cookCity: meal.cookId.address?.city,
      };
    })
  );
  
  const validMeals = enrichedMeals.filter(m => m !== null).slice(0, limit);
  
  console.log(`✅ Returning ${validMeals.length} enriched meals`);
  
  return {
    data: validMeals,
    hasData: validMeals.length > 0
  };
}
