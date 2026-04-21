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
    
    console.log("🧠 AI Decision:", JSON.stringify(aiDecision, null, 2));

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
      console.log("📊 Querying database with filters:", aiDecision.filters);
      const dbResults = await queryTopSellingMeals(aiDecision.filters);
      
      console.log(`✅ Database returned ${dbResults.data?.length || 0} results`);
      
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
        console.log("⚠️ No results found, trying alternatives");
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
        console.log("❌ No results and no alternatives");
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
    console.log("💭 Using general conversation response");
    const response = await generateChatResponse(message, conversationHistory);

    return res.status(200).json({
      success: true,
      response: response.text,
      data: null,
      hasData: false,
      showButtons: response.showButtons || false,
      buttons: response.buttons || null
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
    'no worry', 'no problem', 'nevermind', 'never mind', 'forget it',
    'see you', 'later', 'good night', 'goodnight'
  ];
  
  // Check if message contains any exclude phrase
  if (excludePhrases.some(phrase => msg.includes(phrase))) {
    return false;
  }
  
  // If message contains food names or prices, it's a NEW query, not follow-up
  const foodKeywords = [
    'tea', 'coffee', 'biryani', 'burger', 'pizza', 'pasta', 'rice', 'chicken',
    'karahi', 'korma', 'haleem', 'nihari', 'pulao', 'kebab', 'tikka', 'roll',
    'sandwich', 'salad', 'soup', 'curry', 'daal', 'naan', 'roti', 'paratha',
    'beef', 'mutton', 'fish', 'egg', 'vegetable', 'fruit'
  ];
  
  const hasFoodKeyword = foodKeywords.some(food => msg.includes(food));
  const hasPrice = /\d+/.test(msg) || msg.includes('under') || msg.includes('below') || msg.includes('cheap');
  
  // If message has food name OR price, it's a NEW search, not follow-up
  if (hasFoodKeyword || hasPrice) {
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
  
  // Only match if it's EXACTLY a follow-up phrase (not part of a larger query)
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
    
    // FALLBACK PARSER: Simple regex patterns for common queries
    // This runs BEFORE AI to catch obvious database queries
    const fallbackResult = parseQueryWithRegex(message);
    if (fallbackResult) {
      console.log("✅ Regex fallback parser matched:", fallbackResult);
      return fallbackResult;
    }
    
    // Check for cook-related queries (don't use AI for these)
    const msg = message.toLowerCase().trim();
    if (msg.includes('cook') && (msg.includes('top') || msg.includes('best') || msg.includes('rated'))) {
      console.log("👨‍🍳 Cook query detected - not a meal search");
      return {
        needsDatabase: false,
        isFollowUp: false,
        filters: null
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

Analyze the user's query using natural language understanding (NOT keyword matching).

USER QUERY: "${message}"${contextInfo}

CRITICAL RULES:
1. ANY mention of food items (tea, coffee, biryani, burger, pasta, soup, etc.) → needsDatabase: true
2. ANY mention of price/budget (under X, below X, cheap, i have X) → needsDatabase: true
3. Phrases like "is there", "do you have", "any", "available" → needsDatabase: true
4. Health/recommendation queries (what should I eat for flu, best for cold, etc.) → needsDatabase: false (handled by smart advisor)
5. Goodbyes (bye, goodbye, see you, later) → needsDatabase: false
6. Greetings (hey, hello, hi) → needsDatabase: false
7. Cook queries (top rated cook, best cook) → needsDatabase: false (handled separately)
8. ONLY return needsDatabase: true for DIRECT meal searches

FILTER EXTRACTION (if needsDatabase: true):
- mealName: Extract dish name ONLY, remove ALL filler words (need, want, for, with, about, is there, are there, do you have, any, find me, me, my, meal, meals, food)
- If only generic words remain (meal, food), set mealName to null (search all meals)
- timePeriod: Extract from "today", "yesterday", "this week", etc. (default: "overall")
- limit: Extract from "top 5", "best 3", etc. (default: 10)
- maxPrice: Extract from "under X", "below X", "undr X", "X budget", "i have X", "cheap" (default: null)
- minRating: Extract from "top rated", "best", "highly rated" (default: null, or 4 if mentioned)

EXAMPLES - Natural language understanding:
"find me meal under 200" → {needsDatabase: true, filters: {mealName: null, maxPrice: 200}}
"briyani undr 200" → {needsDatabase: true, filters: {mealName: "biryani", maxPrice: 200}}
"is there any pasta" → {needsDatabase: true, filters: {mealName: "pasta"}}
"tea under 50" → {needsDatabase: true, filters: {mealName: "tea", maxPrice: 50}}
"is there biryani under 100" → {needsDatabase: true, filters: {mealName: "biryani", maxPrice: 100}}
"need tea under 50?" → {needsDatabase: true, filters: {mealName: "tea", maxPrice: 50}}
"best biryani?" → {needsDatabase: true, filters: {mealName: "biryani", minRating: 4}}
"need tea" → {needsDatabase: true, filters: {mealName: "tea"}}
"coffee" → {needsDatabase: true, filters: {mealName: "coffee"}}
"soup" → {needsDatabase: true, filters: {mealName: "soup"}}
"i have 200" → {needsDatabase: true, filters: {maxPrice: 200}}
"300" → {needsDatabase: true, filters: {maxPrice: 300}}
"under 150" → {needsDatabase: true, filters: {maxPrice: 150}}
"what should i eat" → {needsDatabase: true, filters: {mealName: null}}
"top rated cook" → {needsDatabase: false, filters: null}
"i have flu best meals for me" → {needsDatabase: false, filters: null}
"what best for flu" → {needsDatabase: false, filters: null}
"okay bye" → {needsDatabase: false, filters: null}
"hey" → {needsDatabase: false, filters: null}

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
      temperature: 0.1, // Lower temperature for more consistent parsing
      max_tokens: 200,
    });

    let output = response.choices[0].message.content.trim();
    
    console.log("🤖 AI Raw Response:", output);
    
    // Clean JSON
    output = output.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    const decision = JSON.parse(output);
    
    console.log("🧠 AI Parsed Decision:", JSON.stringify(decision, null, 2));
    
    // Validate filters if present
    if (decision.needsDatabase && decision.filters) {
      if (!decision.filters.limit || decision.filters.limit < 1) decision.filters.limit = 10;
      if (decision.filters.limit > 50) decision.filters.limit = 50;
      if (!decision.filters.timePeriod) decision.filters.timePeriod = "overall";
    }
    
    decision.isFollowUp = false;
    
    return decision;
  } catch (error) {
    console.error("❌ Intent analysis error:", error.message || error);
    
    // ENHANCED FALLBACK: Try regex parser again
    const fallbackResult = parseQueryWithRegex(message);
    if (fallbackResult) {
      console.log("✅ Using regex fallback after AI error");
      return fallbackResult;
    }
    
    // Last resort: assume it's a general query
    console.log("⚠️ Falling back to general conversation");
    return {
      needsDatabase: false,
      isFollowUp: false,
      filters: null
    };
  }
}

/**
 * Regex-based fallback parser for simple, obvious queries
 * Catches patterns like "X under Y", "i have X", "cheap X", etc.
 */
function parseQueryWithRegex(message) {
  const msg = message.toLowerCase().trim();
  
  // Remove question marks and clean up
  const cleanMsg = msg.replace(/\?/g, '').trim();
  
  // Pattern 1: "X under Y" or "X below Y" (e.g., "tea under 50", "biryani below 200", "is there biryani under 100")
  const pricePattern1 = /(.+?)\s+(under|below|undr|less than|max)\s+(\d+)/i;
  const match1 = cleanMsg.match(pricePattern1);
  if (match1) {
    let mealName = match1[1]
      .replace(/please|kindly|can i get|show me|find me|find|need|want|looking for|search for|is there|are there|do you have|any|give me/gi, '')
      .trim();
    
    // Clean up meal name - remove filler words and articles
    mealName = mealName.replace(/\b(a|an|the|some|me|my)\b/gi, '').trim();
    
    // If meal name is just "meal" or empty, set to null (search all meals)
    if (!mealName || mealName === 'meal' || mealName === 'meals' || mealName === 'food') {
      mealName = null;
    }
    
    const maxPrice = parseInt(match1[3]);
    
    return {
      needsDatabase: true,
      isFollowUp: false,
      filters: {
        mealName: mealName,
        maxPrice: maxPrice,
        timePeriod: "overall",
        limit: 10,
        minRating: null
      }
    };
  }
  
  // Pattern 2: "under Y" or "i have Y" (e.g., "under 50", "i have 200", just "300")
  const pricePattern2 = /^(under|below|i have|budget|max)?\s*(\d+)$/i;
  const match2 = cleanMsg.match(pricePattern2);
  if (match2) {
    const maxPrice = parseInt(match2[2]);
    
    return {
      needsDatabase: true,
      isFollowUp: false,
      filters: {
        mealName: null,
        maxPrice: maxPrice,
        timePeriod: "overall",
        limit: 10,
        minRating: null
      }
    };
  }
  
  // Pattern 3: "cheap X" or "best X" (e.g., "cheap biryani", "best burger")
  // Must come BEFORE single food item check
  const qualifierPattern = /^(cheap|best|top|good|popular)\s+([a-z\s]+)$/i;
  const match3 = cleanMsg.match(qualifierPattern);
  if (match3) {
    const qualifier = match3[1].toLowerCase();
    let mealName = match3[2].trim();
    
    // Clean up meal name
    mealName = mealName.replace(/\b(a|an|the|some|any|food|meal|dish)\b/gi, '').trim();
    
    return {
      needsDatabase: true,
      isFollowUp: false,
      filters: {
        mealName: mealName || null,
        maxPrice: qualifier === 'cheap' ? 200 : null,
        timePeriod: "overall",
        limit: 10,
        minRating: (qualifier === 'best' || qualifier === 'top') ? 4 : null
      }
    };
  }
  
  // Pattern 4: Single food item (e.g., "tea", "coffee", "biryani", "is there any pasta", "list")
  const foodKeywords = [
    'tea', 'coffee', 'biryani', 'burger', 'pizza', 'pasta', 'rice', 'chicken',
    'karahi', 'korma', 'haleem', 'nihari', 'pulao', 'kebab', 'tikka', 'roll',
    'sandwich', 'salad', 'soup', 'curry', 'daal', 'naan', 'roti', 'paratha',
    'beef', 'mutton', 'fish', 'egg', 'vegetable', 'fruit', 'broth'
  ];
  
  const words = cleanMsg.split(/\s+/);
  
  // Check if it's JUST a food word (or with "need"/"want"/"is there any")
  const foundFood = foodKeywords.find(food => words.includes(food));
  
  if (foundFood && words.length <= 5) {
    // Make sure it's not a complex query
    const complexWords = ['what', 'how', 'why', 'when', 'where', 'which'];
    const hasComplexWord = words.some(w => complexWords.includes(w));
    
    if (!hasComplexWord) {
      // Extract price if mentioned
      const priceMatch = cleanMsg.match(/(\d+)/);
      const maxPrice = priceMatch ? parseInt(priceMatch[1]) : null;
      
      return {
        needsDatabase: true,
        isFollowUp: false,
        filters: {
          mealName: foundFood,
          maxPrice: maxPrice,
          timePeriod: "overall",
          limit: 10,
          minRating: null
        }
      };
    }
  }
  
  // Pattern 5: "list" or "please list" after health advice (search for soup)
  if ((cleanMsg === 'list' || cleanMsg === 'please list' || cleanMsg === 'list that are available') && 
      cleanMsg.length < 30) {
    return {
      needsDatabase: true,
      isFollowUp: false,
      filters: {
        mealName: 'soup', // Default to soup for health-related lists
        maxPrice: null,
        timePeriod: "overall",
        limit: 10,
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
  
  // Clean up meal name - remove question marks and extra words
  let mealInfo = '';
  if (filters.mealName) {
    const cleanMealName = filters.mealName
      .replace(/\?/g, '')
      .replace(/\b(for|with|about|is there|are there|do you have|any)\b/gi, '')
      .trim();
    
    if (cleanMealName) {
      mealInfo = ` for ${cleanMealName}`;
    }
  }
  
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
 * Generate intelligent chat response using LLM reasoning
 * TRUE AI ASSISTANT - Not robotic, not menu-based
 */
async function generateChatResponse(message, conversationHistory) {
  try {
    const msg = message.toLowerCase().trim();
    
    // Handle goodbyes directly (no AI needed)
    const goodbyePhrases = ['bye', 'goodbye', 'see you', 'later', 'good night', 'goodnight'];
    if (goodbyePhrases.some(phrase => msg.includes(phrase))) {
      const goodbyes = [
        "Goodbye! Come back anytime you're hungry! 👋",
        "See you later! Enjoy your meal! 😊",
        "Take care! Happy eating! 🍽️",
        "Bye! Feel free to return anytime! 👋"
      ];
      return { text: goodbyes[Math.floor(Math.random() * goodbyes.length)] };
    }
    
    // Handle simple greetings directly
    const greetings = ['hey', 'hello', 'hi', 'sup', 'yo'];
    if (greetings.includes(msg)) {
      return { text: "Hey! 👋 I can help you find meals, cooks, or answer questions. What are you looking for?" };
    }
    
    // Handle navigation queries - show buttons with helpful message
    const navigationQueries = {
      cook: {
        keywords: ['cook', 'chef', 'seller'],
        message: "I can help you find great cooks! Here are your options:",
        buttons: [
          { label: '⭐ Top Rated Cooks', action: 'top_rated_cooks' },
          { label: '🔥 Top Selling Cooks', action: 'top_selling_cooks' },
          { label: '🍽️ Best Cooks by Items', action: 'cooks_by_items' },
          { label: '🏠 Main Menu', action: 'main_menu' }
        ]
      },
      order: {
        keywords: ['order', 'track', 'delivery', 'status'],
        message: "Need help with orders? Here's what I can do:",
        buttons: [
          { label: '📦 Track Order', action: 'track_order' },
          { label: '📝 Order History', action: 'view_order_history' },
          { label: '🏠 Main Menu', action: 'main_menu' }
        ]
      },
      complaint: {
        keywords: ['complaint', 'complain', 'issue', 'problem', 'report'],
        message: "I'm sorry to hear you're having an issue. Let me help:",
        buttons: [
          { label: '📝 File Complaint', action: 'file_complaint' },
          { label: '🏠 Main Menu', action: 'main_menu' }
        ]
      },
      recommendation: {
        keywords: ['recommend', 'suggestion', 'suggest', 'what should i eat', 'what to eat'],
        message: "I can give you personalized recommendations! Choose an option:",
        buttons: [
          { label: '🎯 Personalized Meals', action: 'personalized_meals' },
          { label: '🧠 Smart Food Advisor', action: 'smart_advisor' },
          { label: '❤️ Health-Based Meals', action: 'health_meals' },
          { label: '🏠 Main Menu', action: 'main_menu' }
        ]
      },
      browse: {
        keywords: ['browse', 'show meals', 'all meals', 'menu', 'catalog'],
        message: "Let me help you browse meals:",
        buttons: [
          { label: '🍽️ All Meals', action: 'all_meals' },
          { label: '🔥 Top Selling Meals', action: 'top_selling_menu' },
          { label: '🏠 Main Menu', action: 'main_menu' }
        ]
      }
    };
    
    // Check if query matches any navigation category
    for (const [category, config] of Object.entries(navigationQueries)) {
      const hasKeyword = config.keywords.some(keyword => msg.includes(keyword));
      if (hasKeyword) {
        return {
          text: config.message,
          showButtons: true,
          buttons: config.buttons
        };
      }
    }
    
    // Handle health queries directly (no AI needed for common cases)
    const healthKeywords = ['flu', 'fever', 'cold', 'sick', 'cough', 'headache', 'stomach', 'pain'];
    const hasHealthKeyword = healthKeywords.some(keyword => msg.includes(keyword));
    
    if (hasHealthKeyword) {
      const healthAdvice = {
        'flu': "For flu, try warm soups, ginger tea, chicken broth, and foods rich in vitamin C like citrus fruits. Stay hydrated! 🍵",
        'fever': "For fever, eat light foods like soups, broths, fruits, and drink plenty of fluids. Avoid heavy or spicy meals. 🥣",
        'cold': "For cold, have warm soups, ginger tea, honey, and vitamin C-rich foods. Stay warm and hydrated! ☕",
        'sick': "When sick, stick to light, easy-to-digest foods like soups, broths, rice, and fruits. Rest and hydrate! 🍲",
        'cough': "For cough, try warm liquids like tea with honey, soups, and avoid cold or fried foods. 🍯",
        'headache': "For headache, stay hydrated, eat regular meals, and avoid caffeine. Try ginger tea or light snacks. 💧",
        'stomach': "For stomach issues, eat bland foods like rice, bananas, toast, and avoid spicy or oily foods. 🍚",
        'pain': "For pain, eat anti-inflammatory foods like ginger, turmeric, and stay hydrated. Consult a doctor if severe. 🌿"
      };
      
      // Find matching health condition
      for (const [condition, advice] of Object.entries(healthAdvice)) {
        if (msg.includes(condition)) {
          return { text: advice };
        }
      }
      
      // Generic health advice
      return { text: "When not feeling well, focus on light, nutritious foods like soups, fruits, and plenty of fluids. Take care! 💚" };
    }
    
    // Build conversation context
    const context = conversationHistory.slice(-6).map(msg => 
      `${msg.sender}: ${msg.text}`
    ).join('\n');

    const systemPrompt = `You are an intelligent food delivery assistant for Homely Meals - a platform connecting customers with home cooks.

CORE CAPABILITIES:
- Answer questions naturally like ChatGPT
- Provide food knowledge (nutrition, cooking, ingredients, health advice)
- Help with orders, tracking, complaints
- Give recommendations and suggestions
- Explain how the service works
- Be conversational and helpful

PERSONALITY:
- Smart and knowledgeable
- Friendly but not overly cheerful
- Direct and helpful
- Natural conversational style
- NOT robotic or template-based

RESPONSE RULES:
1. Answer the actual question asked
2. Be concise but complete (2-4 sentences)
3. For health queries (flu, cold, fever), give food advice directly
4. For meal searches, acknowledge and suggest using search
5. For general knowledge (protein, healthy food, etc.), answer directly
6. For orders/tracking, offer to help
7. Use emojis sparingly (max 1-2)
8. Don't always end with questions
9. Don't spam menu options
10. NEVER say "I'm here to help" as a generic response - always answer the specific question
11. For unclear queries like "who is there", respond naturally and ask for clarification

HEALTH ADVICE EXAMPLES:
- "what best for flu" → "For flu, try warm soups, ginger tea, chicken broth, and foods rich in vitamin C like citrus fruits. Stay hydrated!"
- "food for gym" → "For gym nutrition, focus on high-protein meals like chicken, eggs, lentils, and complex carbs like brown rice."
- "i have flu best meals" → "For flu, I recommend warm soups, ginger tea, and vitamin C-rich foods. Would you like me to search for soup options?"

UNCLEAR QUERIES:
- "who is there" → "I'm your Homely Meals assistant! I can help you find meals, browse cooks, track orders, or answer questions. What would you like to do?"
- "what" → "I'm here to help with meals and orders! You can ask me to find food, browse cooks, or get recommendations."

CONVERSATION CONTEXT:
${context || 'No previous conversation'}

USER MESSAGE: "${message}"

Respond naturally and intelligently to what the user actually asked. Be specific and helpful, not generic.`;

    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message }
      ],
      temperature: 0.7,
      max_tokens: 300,
    });

    return {
      text: response.choices[0].message.content.trim()
    };
  } catch (error) {
    console.error("❌ Chat response error:", error.message || error);
    
    // Rate limit fallback - try to give helpful response based on query
    if (error.status === 429 || error.code === 'rate_limit_exceeded') {
      const msg = message.toLowerCase().trim();
      
      // Provide contextual fallbacks
      if (msg.includes('who') || msg.includes('what') || msg.includes('how')) {
        return { text: "I'm your Homely Meals assistant! 🤖 I can help you find meals, browse cooks, track orders, or answer questions. What would you like to do?" };
      }
      
      return { text: "I'm experiencing high demand right now. Try asking about meals, cooks, or orders!" };
    }
    
    // Check if it's a simple number (price query)
    const numberMatch = message.match(/^\d+$/);
    if (numberMatch) {
      return { text: `Looking for meals under Rs. ${numberMatch[0]}? Let me search for you!` };
    }
    
    // Check for common unclear queries
    const msg = message.toLowerCase().trim();
    if (msg.includes('who') || msg === 'what' || msg === 'huh' || msg === 'hmm') {
      return { text: "I'm your Homely Meals assistant! 🤖 I can help you find meals, browse cooks, track orders, or answer questions. What would you like to do?" };
    }
    
    // Generic error fallback - but still try to be helpful
    return { text: "I'm having trouble understanding. Could you rephrase? For example: 'tea under 50' or 'best biryani'" };
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
