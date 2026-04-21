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
 * GLOBAL CHAT - Intelligent AI Assistant with Database Access
 * POST /api/customer/chatbot/advanced
 * 
 * Purpose: Handle ALL user queries intelligently with context awareness
 * - General conversation
 * - Meal searches with database queries
 * - Follow-up requests using previous context
 * - Recommendations
 * - Questions about food, cooks, orders
 */
export const advancedChatbot = async (req, res) => {
  try {
    console.log("💬 AI Assistant:", req.body.message);

    const { message, conversationHistory = [] } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Message is required",
      });
    }

    // Let AI analyze the query with context awareness
    const aiDecision = await analyzeQueryIntent(message, conversationHistory);
    
    console.log("🧠 AI Decision:", aiDecision);

    // Handle follow-up requests using previous context
    if (aiDecision.isFollowUp && aiDecision.previousData) {
      console.log("🔄 Processing follow-up with previous data");
      
      const response = await handleFollowUpRequest(
        message,
        aiDecision.followUpType,
        aiDecision.previousData,
        aiDecision.previousFilters
      );
      
      return res.status(200).json({
        success: true,
        response: response.text,
        data: response.data,
        hasData: response.data && response.data.length > 0,
        filters: aiDecision.previousFilters // Preserve filters for next follow-up
      });
    }

    // If AI wants to search database
    if (aiDecision.needsDatabase && aiDecision.filters) {
      const dbResults = await queryTopSellingMeals(aiDecision.filters);
      
      if (dbResults.data && dbResults.data.length > 0) {
        // Generate natural response with data
        const response = await generateResponseWithData(message, dbResults.data, aiDecision.filters);
        
        return res.status(200).json({
          success: true,
          response: response.text,
          data: dbResults.data,
          hasData: true,
          filters: aiDecision.filters // Store filters for follow-up
        });
      } else {
        // No results found - try to find nearest alternatives
        const alternatives = await findNearestAlternatives(aiDecision.filters);
        
        if (alternatives.data && alternatives.data.length > 0) {
          const response = await generateAlternativesResponse(message, alternatives.data, aiDecision.filters);
          
          return res.status(200).json({
            success: true,
            response: response.text,
            data: alternatives.data,
            hasData: true,
            filters: aiDecision.filters
          });
        }
        
        // Truly no results
        const response = await generateNoResultsResponse(message, aiDecision.filters);
        
        return res.status(200).json({
          success: true,
          response: response.text,
          data: null,
          hasData: false,
        });
      }
    }

    // General conversation (no database needed)
    const response = await generateChatResponse(message, conversationHistory);

    return res.status(200).json({
      success: true,
      response: response.text,
      data: null,
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
 * FEATURE SEARCH - Enhanced AI-powered search with context awareness
 * POST /api/customer/chatbot/feature-search
 * 
 * Purpose: Intelligent meal search with natural language understanding and follow-up support
 * Output: Natural response + meal cards when relevant
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

    // Use AI to analyze with context awareness
    const aiAnalysis = await analyzeQueryIntent(message, conversationHistory);
    
    console.log("🧠 AI Analysis:", aiAnalysis);

    // Handle follow-up requests using previous context
    if (aiAnalysis.isFollowUp && aiAnalysis.previousData) {
      console.log("🔄 Processing follow-up in feature search");
      
      const response = await handleFollowUpRequest(
        message,
        aiAnalysis.followUpType,
        aiAnalysis.previousData,
        aiAnalysis.previousFilters
      );
      
      return res.status(200).json({
        success: true,
        response: response.text,
        data: response.data,
        hasData: response.data && response.data.length > 0,
        filters: aiAnalysis.previousFilters
      });
    }

    // If not a database query, provide conversational response
    if (!aiAnalysis.needsDatabase) {
      const response = await generateChatResponse(message, conversationHistory);
      return res.status(200).json({
        success: true,
        response: response.text,
        data: null,
        hasData: false,
      });
    }

    // Query database with AI-extracted filters
    const dbResults = await queryTopSellingMeals(aiAnalysis.filters);
    
    if (!dbResults.data || dbResults.data.length === 0) {
      // Try to find alternatives
      const alternatives = await findNearestAlternatives(aiAnalysis.filters);
      
      if (alternatives.data && alternatives.data.length > 0) {
        const response = await generateAlternativesResponse(message, alternatives.data, aiAnalysis.filters);
        
        return res.status(200).json({
          success: true,
          response: response.text,
          data: alternatives.data,
          hasData: true,
          filters: aiAnalysis.filters
        });
      }
      
      // No results at all
      const noResultsMsg = await generateNoResultsResponse(message, aiAnalysis.filters);
      return res.status(200).json({
        success: true,
        response: noResultsMsg.text,
        data: null,
        hasData: false,
      });
    }

    // Generate natural response with results
    const response = await generateResponseWithData(message, dbResults.data, aiAnalysis.filters);

    return res.status(200).json({
      success: true,
      response: response.text,
      data: dbResults.data,
      hasData: true,
      filters: aiAnalysis.filters
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
 * Extract previous context from conversation history
 */
function extractPreviousContext(conversationHistory) {
  // Look for previous bot messages that might contain data context
  for (let i = conversationHistory.length - 1; i >= 0; i--) {
    const msg = conversationHistory[i];
    if (msg.sender === 'bot' && msg.data && msg.data.length > 0) {
      return {
        hasContext: true,
        previousData: msg.data,
        previousFilters: msg.filters || null
      };
    }
  }
  return { hasContext: false, previousData: null, previousFilters: null };
}

/**
 * Check if message is a follow-up request
 */
function isFollowUpRequest(message) {
  const msg = message.toLowerCase().trim();
  
  // Exclude greetings, goodbyes, and polite phrases
  const excludePhrases = [
    'bye', 'goodbye', 'thanks', 'thank you',
    'no worry', 'no problem', 'nevermind', 'never mind', 'forget it'
  ];
  
  // Check if message contains any exclude phrase
  if (excludePhrases.some(phrase => msg.includes(phrase))) {
    return false;
  }
  
  const followUpPhrases = [
    'yes', 'show', 'list', 'list here', 'list them', 'send', 'send options',
    'available', 'names', 'show me', 'tell me', 'give me', 'display',
    'best', 'cheapest', 'top', 'best one', 'cheaper', 'spicy', 'top rated',
    'cook name', 'cook', 'which cook', 'add', 'more', 'next'
  ];
  
  // "okay" alone is follow-up, but "okay bye" is not (already excluded above)
  if (msg === 'okay' || msg === 'ok') {
    return true;
  }
  
  return followUpPhrases.some(phrase => msg === phrase || msg.startsWith(phrase + ' '));
}

/**
 * Analyze user query intent using AI with context awareness
 * Decides if database query is needed and extracts filters
 */
async function analyzeQueryIntent(message, conversationHistory) {
  try {
    // Check for follow-up requests
    const previousContext = extractPreviousContext(conversationHistory);
    const isFollowUp = isFollowUpRequest(message);
    
    if (isFollowUp && previousContext.hasContext) {
      console.log("🔄 Follow-up detected, using previous context");
      
      // Analyze what kind of follow-up
      const followUpType = await analyzeFollowUpType(message, previousContext.previousData);
      
      return {
        needsDatabase: false,
        isFollowUp: true,
        followUpType: followUpType,
        previousData: previousContext.previousData,
        previousFilters: previousContext.previousFilters,
        filters: null
      };
    }
    
    // FALLBACK PATTERN MATCHER - Catch common food queries before LLM
    const fallbackResult = detectFoodQueryPattern(message);
    if (fallbackResult) {
      console.log("🎯 Pattern matcher detected food query:", fallbackResult);
      return {
        needsDatabase: true,
        isFollowUp: false,
        filters: fallbackResult.filters
      };
    }
    
    // Build context-aware prompt
    let contextInfo = "";
    if (conversationHistory.length > 0) {
      const recentMessages = conversationHistory.slice(-4).map(msg => 
        `${msg.sender}: ${msg.text}`
      ).join('\n');
      contextInfo = `\n\nRECENT CONVERSATION:\n${recentMessages}`;
    }

    const systemPrompt = `You are an intelligent query analyzer for a food delivery chatbot.

Analyze the user's query and decide:
1. Does it need database search? (meal search, food query, "what's available", etc.)
2. If yes, extract search filters

USER QUERY: "${message}"${contextInfo}

CRITICAL DISTINCTION:
- If asking about "cook", "chef", "cooks", "chefs" → needsDatabase: false (asking for cook info, not meals)
- If asking about "meal", "food", "dish", specific food names → needsDatabase: true (asking for meals)

DECISION RULES (STRICT):
- If asking about COOKS ("top rated cook", "best cook", "which cook", "good cook") → needsDatabase: false
- If mentioning ANY food item (tea, coffee, biryani, pasta, burger, pizza, etc.) → needsDatabase: true, extract mealName
- If saying "i want X", "i need X", "give me X", "show me X" where X is food → needsDatabase: true
- If asking "what should I eat", "recommend", "suggest" → needsDatabase: true  
- If asking about top rated MEALS, best MEALS, popular MEALS → needsDatabase: true
- If mentioning budget/price (e.g., "i have 200", "under 50", "below 100") → needsDatabase: true, extract maxPrice
- If general question, greeting, chitchat → needsDatabase: false

FILTER EXTRACTION (if needsDatabase: true):
- mealName: dish name or null (e.g., "biryani", "tea", "pasta", "coffee")
- timePeriod: "today", "yesterday", "week", "month", "overall" (default: "overall")
- limit: number 1-50 (default: 10)
- maxPrice: number or null (extract from "i have X", "under X", "below X", "budget X")
- minRating: number or null

EXAMPLES (LEARN FROM THESE):
"biryani" → {needsDatabase: true, filters: {mealName: "biryani", timePeriod: "overall", limit: 10}}
"i want tea" → {needsDatabase: true, filters: {mealName: "tea", timePeriod: "overall", limit: 10}}
"tea under 50" → {needsDatabase: true, filters: {mealName: "tea", timePeriod: "overall", limit: 10, maxPrice: 50}}
"tea under 50?" → {needsDatabase: true, filters: {mealName: "tea", timePeriod: "overall", limit: 10, maxPrice: 50}}
"give me coffee" → {needsDatabase: true, filters: {mealName: "coffee", timePeriod: "overall", limit: 10}}
"show me pizza" → {needsDatabase: true, filters: {mealName: "pizza", timePeriod: "overall", limit: 10}}
"i need burger" → {needsDatabase: true, filters: {mealName: "burger", timePeriod: "overall", limit: 10}}
"pasta under 200" → {needsDatabase: true, filters: {mealName: "pasta", timePeriod: "overall", limit: 10, maxPrice: 200}}
"i have 200" → {needsDatabase: true, filters: {mealName: null, timePeriod: "overall", limit: 10, maxPrice: 200}}
"under 100" → {needsDatabase: true, filters: {mealName: null, timePeriod: "overall", limit: 10, maxPrice: 100}}
"top rated cook" → {needsDatabase: false, filters: null}
"best cook" → {needsDatabase: false, filters: null}
"top rated meal" → {needsDatabase: true, filters: {mealName: null, timePeriod: "overall", limit: 10, minRating: 4}}
"hello" → {needsDatabase: false, filters: null}

Return ONLY JSON:
{
  "needsDatabase": boolean,
  "filters": {
    "mealName": "string or null",
    "timePeriod": "today|yesterday|week|month|overall",
    "limit": number,
    "maxPrice": number or null,
    "minRating": number or null
  } or null
}`;

    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
      temperature: 0.3, // Slightly increased for better pattern matching
      max_tokens: 200,
    });

    let output = response.choices[0].message.content.trim();
    
    // Clean JSON
    output = output.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    const decision = JSON.parse(output);
    
    // Validate filters if present
    if (decision.needsDatabase && decision.filters) {
      if (!decision.filters.limit || decision.filters.limit < 1) decision.filters.limit = 10;
      if (decision.filters.limit > 50) decision.filters.limit = 50;
      if (!decision.filters.timePeriod) decision.filters.timePeriod = "overall";
    }
    
    decision.isFollowUp = false;
    
    return decision;
  } catch (error) {
    console.error("Intent analysis error:", error);
    // Fallback: assume it's a general query
    return {
      needsDatabase: false,
      isFollowUp: false,
      filters: null
    };
  }
}

/**
 * Fallback pattern matcher for common food queries
 * Catches queries that LLM might miss
 */
function detectFoodQueryPattern(message) {
  const msg = message.toLowerCase().trim();
  
  // Pattern 1: "i want/need/have X" where X might be food
  const wantNeedPattern = /^(?:i\s+)?(?:want|need|have|got)\s+(.+)$/i;
  const wantNeedMatch = msg.match(wantNeedPattern);
  
  if (wantNeedMatch) {
    const query = wantNeedMatch[1].trim();
    
    // Check if it contains price info
    const pricePattern = /(\d+)/;
    const priceMatch = query.match(pricePattern);
    
    if (priceMatch) {
      const price = parseInt(priceMatch[1]);
      // "i have 200" or "i want tea 50"
      const foodWords = query.replace(/\d+/g, '').replace(/under|below|less than|rs|rupees/gi, '').trim();
      
      return {
        filters: {
          mealName: foodWords.length > 0 && foodWords.length < 20 ? foodWords : null,
          timePeriod: "overall",
          limit: 10,
          maxPrice: price,
          minRating: null
        }
      };
    } else {
      // "i want tea" - assume it's food
      return {
        filters: {
          mealName: query,
          timePeriod: "overall",
          limit: 10,
          maxPrice: null,
          minRating: null
        }
      };
    }
  }
  
  // Pattern 2: "give me/show me X"
  const giveMePattern = /^(?:give|show|get)\s+(?:me\s+)?(.+)$/i;
  const giveMeMatch = msg.match(giveMePattern);
  
  if (giveMeMatch) {
    const query = giveMeMatch[1].trim();
    return {
      filters: {
        mealName: query,
        timePeriod: "overall",
        limit: 10,
        maxPrice: null,
        minRating: null
      }
    };
  }
  
  // Pattern 3: "X under/below Y" (e.g., "tea under 50", "biryani below 200")
  const priceFilterPattern = /^(.+?)\s+(?:under|below|less than)\s+(?:rs\.?\s*)?(\d+)\??$/i;
  const priceFilterMatch = msg.match(priceFilterPattern);
  
  if (priceFilterMatch) {
    const foodName = priceFilterMatch[1].trim();
    const price = parseInt(priceFilterMatch[2]);
    
    return {
      filters: {
        mealName: foodName,
        timePeriod: "overall",
        limit: 10,
        maxPrice: price,
        minRating: null
      }
    };
  }
  
  // Pattern 4: Just a price "under 50", "below 100"
  const justPricePattern = /^(?:under|below|less than)\s+(?:rs\.?\s*)?(\d+)\??$/i;
  const justPriceMatch = msg.match(justPricePattern);
  
  if (justPriceMatch) {
    const price = parseInt(justPriceMatch[1]);
    return {
      filters: {
        mealName: null,
        timePeriod: "overall",
        limit: 10,
        maxPrice: price,
        minRating: null
      }
    };
  }
  
  // Pattern 5: Single word that might be food (but not greetings/goodbyes)
  const excludeWords = ['hi', 'hello', 'hey', 'bye', 'goodbye', 'thanks', 'thank', 'yes', 'no', 'ok', 'okay'];
  const words = msg.split(/\s+/);
  
  if (words.length === 1 && !excludeWords.includes(words[0]) && words[0].length > 2) {
    // Single word query - likely food name
    return {
      filters: {
        mealName: words[0],
        timePeriod: "overall",
        limit: 10,
        maxPrice: null,
        minRating: null
      }
    };
  }
  
  return null; // No pattern matched
}

/**
 * Analyze what type of follow-up the user wants
 */
async function analyzeFollowUpType(message, previousData) {
  const msg = message.toLowerCase().trim();
  
  // Simple pattern matching for common follow-ups
  if (msg.includes('list') || msg.includes('show') || msg === 'okay' || msg === 'yes' || msg.includes('available') || msg.includes('names')) {
    return 'list_all';
  }
  if (msg.includes('best') || msg.includes('top rated') || msg.includes('highest')) {
    return 'best';
  }
  if (msg.includes('cheap') || msg.includes('cheapest') || msg.includes('lowest price')) {
    return 'cheapest';
  }
  if (msg.includes('cook') || msg.includes('chef')) {
    return 'cook_names';
  }
  if (msg.includes('spicy') || msg.includes('hot')) {
    return 'filter_spicy';
  }
  
  return 'list_all'; // Default to listing all
}

/**
 * Handle follow-up requests using previous context
 */
async function handleFollowUpRequest(message, followUpType, previousData, previousFilters) {
  console.log(`🔄 Follow-up type: ${followUpType}, Previous data count: ${previousData.length}`);
  
  let filteredData = [...previousData];
  let responseText = "";
  
  switch (followUpType) {
    case 'list_all':
      // List all items from previous query
      responseText = generateListResponse(filteredData, previousFilters);
      break;
      
    case 'best':
      // Show best rated from previous results
      filteredData = filteredData
        .filter(m => m.averageRating > 0)
        .sort((a, b) => b.averageRating - a.averageRating)
        .slice(0, 5);
      responseText = generateBestResponse(filteredData);
      break;
      
    case 'cheapest':
      // Show cheapest from previous results
      filteredData = filteredData
        .sort((a, b) => a.price - b.price)
        .slice(0, 5);
      responseText = generateCheapestResponse(filteredData);
      break;
      
    case 'cook_names':
      // Show cook names from previous results
      responseText = generateCookNamesResponse(filteredData);
      break;
      
    default:
      responseText = generateListResponse(filteredData, previousFilters);
  }
  
  return {
    text: responseText,
    data: filteredData
  };
}

/**
 * Generate list response with actual meal names from DB
 */
function generateListResponse(meals, filters) {
  if (meals.length === 0) {
    return "I don't have any meals to show right now. Try a different search!";
  }
  
  const priceInfo = filters && filters.maxPrice ? ` under Rs. ${filters.maxPrice}` : '';
  let response = `Here are ${meals.length} meal${meals.length > 1 ? 's' : ''}${priceInfo}:\n\n`;
  
  meals.forEach((meal, index) => {
    response += `${index + 1}. ${meal.mealName} — Rs. ${meal.price}`;
    if (meal.averageRating > 0) {
      response += ` (${meal.averageRating}⭐)`;
    }
    if (meal.cookName) {
      response += ` by ${meal.cookName}`;
    }
    response += '\n';
  });
  
  return response.trim();
}

/**
 * Generate best rated response
 */
function generateBestResponse(meals) {
  if (meals.length === 0) {
    return "I couldn't find rated meals in the previous results.";
  }
  
  let response = `Here are the top-rated options:\n\n`;
  
  meals.forEach((meal, index) => {
    response += `${index + 1}. ${meal.mealName} — Rs. ${meal.price} (${meal.averageRating}⭐)`;
    if (meal.cookName) {
      response += ` by ${meal.cookName}`;
    }
    response += '\n';
  });
  
  return response.trim();
}

/**
 * Generate cheapest response
 */
function generateCheapestResponse(meals) {
  if (meals.length === 0) {
    return "I couldn't find any meals in the previous results.";
  }
  
  let response = `Here are the most affordable options:\n\n`;
  
  meals.forEach((meal, index) => {
    response += `${index + 1}. ${meal.mealName} — Rs. ${meal.price}`;
    if (meal.averageRating > 0) {
      response += ` (${meal.averageRating}⭐)`;
    }
    response += '\n';
  });
  
  return response.trim();
}

/**
 * Generate cook names response
 */
function generateCookNamesResponse(meals) {
  if (meals.length === 0) {
    return "I don't have cook information for the previous results.";
  }
  
  let response = `Here are the cooks:\n\n`;
  
  meals.forEach((meal, index) => {
    response += `${index + 1}. ${meal.mealName} — by ${meal.cookName || 'Unknown Cook'}`;
    if (meal.cookCity) {
      response += ` (${meal.cookCity})`;
    }
    response += '\n';
  });
  
  return response.trim();
}

/**
 * Find nearest alternatives when exact match not found
 * ONLY for price filters - NOT for meal name searches
 */
async function findNearestAlternatives(filters) {
  // If meal name filter failed, DO NOT show alternatives
  // User asked for specific item (coffee, tea, etc.) - don't show random meals
  if (filters.mealName) {
    console.log("🚫 Meal name search failed - NO alternatives");
    return { data: [], hasData: false };
  }
  
  // If price filter failed, try slightly higher price
  if (filters.maxPrice) {
    const relaxedFilters = {
      ...filters,
      maxPrice: Math.round(filters.maxPrice * 1.3), // 30% higher
      limit: 5
    };
    
    console.log("🔍 Trying relaxed price filter:", relaxedFilters);
    const results = await queryTopSellingMeals(relaxedFilters);
    
    if (results.data && results.data.length > 0) {
      return results;
    }
  }
  
  return { data: [], hasData: false };
}

/**
 * Generate response for alternative suggestions
 * STRICT RULE: NO LLM - Template only
 */
async function generateAlternativesResponse(query, alternatives, originalFilters) {
  let response = "";
  
  if (originalFilters.maxPrice) {
    const nearestPrice = Math.min(...alternatives.map(m => m.price));
    response = `I couldn't find meals under Rs. ${originalFilters.maxPrice}. Here are the closest options starting from Rs. ${nearestPrice}:`;
  } else {
    response = `Here are available options:`;
  }
  
  return { text: response };
}

/**
 * Generate natural response with database results
 * STRICT RULE: NO LLM - Template only
 */
async function generateResponseWithData(query, results, filters) {
  // NO LLM - Simple template with DB count only
  const count = results.length;
  const priceInfo = filters.maxPrice ? ` under Rs. ${filters.maxPrice}` : '';
  const mealInfo = filters.mealName ? ` for ${filters.mealName}` : '';
  
  return {
    text: `Here ${count === 1 ? 'is' : 'are'} ${count} meal${count > 1 ? 's' : ''}${priceInfo}${mealInfo}:`
  };
}

/**
 * Generate helpful response when no results found
 * STRICT RULE: NO LLM - Template only
 */
async function generateNoResultsResponse(query, filters) {
  let response = "";
  
  if (filters.mealName) {
    response = `I couldn't find ${filters.mealName} available right now. Try searching for a different dish.`;
  } else if (filters.maxPrice) {
    response = `I couldn't find meals under Rs. ${filters.maxPrice} right now. Try a higher budget or check back later.`;
  } else {
    response = `I couldn't find any meals matching your search right now. Try a different search.`;
  }
  
  return { text: response };
}

/**
 * Generate natural chat response for general queries
 * Handles cook queries and general questions
 */
async function generateChatResponse(message, conversationHistory) {
  const msg = message.toLowerCase();
  
  // Handle cook-related queries - redirect to Browse Cooks menu
  if (msg.includes('cook') || msg.includes('chef')) {
    if (msg.includes('top rated') || msg.includes('best') || msg.includes('good')) {
      return { text: "To see top-rated cooks, please use the '👨‍🍳 Browse Cooks' option from the main menu." };
    }
    return { text: "You can browse cooks and see their profiles using the '👨‍🍳 Browse Cooks' option from the main menu." };
  }
  
  // Handle goodbyes
  if (msg.includes('bye') || msg.includes('goodbye')) {
    return { text: "Goodbye! Feel free to come back anytime you're hungry! 😊" };
  }
  
  // Handle greetings
  if (msg === 'hello' || msg === 'hi' || msg === 'hey') {
    return { text: "Hello! 👋 I can help you find meals or browse cooks. What are you looking for?" };
  }
  
  // Handle thanks
  if (msg.includes('thank') || msg === 'thanks') {
    return { text: "You're welcome! Let me know if you need anything else! 😊" };
  }
  
  // For other queries, provide helpful response
  try {
    const systemPrompt = `You are a helpful food delivery assistant for Homely Meals.

STRICT RULES:
- NEVER mention specific meal names (no "biryani", "pasta", etc.)
- Keep responses SHORT (1-2 sentences)
- If user asks about food, tell them to search for it
- If user asks about cooks, tell them to use Browse Cooks menu

USER MESSAGE: "${message}"

Respond helpfully but WITHOUT mentioning specific meal names.`;

    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
      temperature: 0.7,
      max_tokens: 100,
    });

    return {
      text: response.choices[0].message.content.trim()
    };
  } catch (error) {
    console.error("Chat response error:", error);
    return {
      text: "I'm here to help! What would you like to search for? 😊"
    };
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
