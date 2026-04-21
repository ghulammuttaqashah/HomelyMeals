// shared/services/chatbot.service.js
import Groq from 'groq-sdk';
import { GROQ_API_KEY } from '../config/env.js';
import CookMeal from '../../modules/cook/models/cookMeal.model.js';
import { Order } from '../models/order.model.js';
import Review from '../models/review.model.js';
import { hasActiveCookSubscription } from '../utils/subscriptionAccess.js';

const groq = new Groq({ apiKey: GROQ_API_KEY });

// Log Groq initialization
console.log('🚀 Groq SDK Initialized');
console.log('📦 API Key Status:', GROQ_API_KEY ? 'LOADED' : 'MISSING');
if (GROQ_API_KEY) {
    console.log('🔑 API Key (first 10 chars):', GROQ_API_KEY.substring(0, 10) + '...');
    console.log('🔑 API Key Length:', GROQ_API_KEY.length);
}

/**
 * Fetch REAL meals from database based on entities
 * NO FAKE DATA - ONLY DATABASE RESULTS
 */
const fetchRealMeals = async (entities) => {
    try {
        const { food, price, preference } = entities;
        
        console.log('🔍 Fetching meals with filters:', { food, price, preference });
        
        // Build query
        const query = { availability: 'Available' };
        
        // Add food filter if specified
        if (food) {
            query.name = { $regex: food, $options: 'i' };
        }
        
        // Add price filter if specified
        if (price) {
            query.price = { $lte: price };
        }
        
        // Fetch meals from database
        let meals = await CookMeal.find(query)
            .populate('cookId', 'name address.city averageRating')
            .sort({ createdAt: -1 })
            .limit(50)
            .lean();
        
        console.log(`📊 Found ${meals.length} meals in database`);
        
        // Filter by active subscription
        const mealsWithSubscription = [];
        for (const meal of meals) {
            if (meal.cookId) {
                const hasSubscription = await hasActiveCookSubscription(meal.cookId._id);
                if (hasSubscription) {
                    mealsWithSubscription.push(meal);
                }
            }
        }
        
        console.log(`✅ ${mealsWithSubscription.length} meals from subscribed cooks`);
        
        // Enrich with ratings and order counts
        const enrichedMeals = await Promise.all(
            mealsWithSubscription.map(async (meal) => {
                // Get reviews
                const reviews = await Review.find({
                    mealId: meal._id,
                    reviewType: 'meal'
                }).lean();
                
                let averageRating = 0;
                if (reviews.length > 0) {
                    averageRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
                }
                
                // Get order count
                const orderStats = await Order.aggregate([
                    {
                        $match: {
                            status: 'delivered',
                            'items.mealId': meal._id
                        }
                    },
                    { $unwind: '$items' },
                    {
                        $match: {
                            'items.mealId': meal._id
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            totalQuantity: { $sum: '$items.quantity' }
                        }
                    }
                ]);
                
                const totalOrders = orderStats.length > 0 ? orderStats[0].totalQuantity : 0;
                
                return {
                    _id: meal._id,
                    name: meal.name,
                    description: meal.description,
                    price: meal.price,
                    category: meal.category,
                    itemImage: meal.itemImage,
                    cookId: meal.cookId._id,
                    cookName: meal.cookId.name,
                    cookCity: meal.cookId.address?.city,
                    averageRating: Math.round(averageRating * 10) / 10,
                    reviewCount: reviews.length,
                    totalOrders
                };
            })
        );
        
        // Apply preference-based sorting
        let sortedMeals = enrichedMeals;
        
        if (preference === 'cheap') {
            sortedMeals.sort((a, b) => a.price - b.price);
        } else if (preference === 'tasty' || preference === 'popular') {
            sortedMeals.sort((a, b) => {
                if (b.averageRating !== a.averageRating) {
                    return b.averageRating - a.averageRating;
                }
                return b.totalOrders - a.totalOrders;
            });
        } else if (preference === 'healthy') {
            // Filter for healthy keywords
            sortedMeals = sortedMeals.filter(m => {
                const name = m.name.toLowerCase();
                return name.includes('salad') || name.includes('grilled') || 
                       name.includes('steamed') || name.includes('vegetable') ||
                       name.includes('soup') || name.includes('boiled');
            });
        }
        
        // Remove duplicates by name (case-insensitive)
        const uniqueMeals = [];
        const seenNames = new Set();
        
        for (const meal of sortedMeals) {
            const normalizedName = meal.name.toLowerCase().trim();
            if (!seenNames.has(normalizedName)) {
                seenNames.add(normalizedName);
                uniqueMeals.push(meal);
            }
        }
        
        // Limit to top 5 results
        const finalMeals = uniqueMeals.slice(0, 5);
        
        console.log(`🎯 Returning ${finalMeals.length} unique meals`);
        
        return finalMeals;
        
    } catch (error) {
        console.error('❌ Error fetching real meals:', error);
        return [];
    }
};

/**
 * Generate response text with meal count
 */
const generateMealResponseText = (entities, meals) => {
    const { food, price, preference } = entities;
    
    let parts = [];
    if (food) parts.push(food);
    if (preference) parts.push(preference);
    if (price) parts.push(`under Rs ${price}`);
    
    const query = parts.length > 0 ? parts.join(', ') : 'meals';
    
    if (meals.length === 0) {
        return `I couldn't find any ${query} right now. Try adjusting your search!`;
    }
    
    return `Found ${meals.length} ${query} for you! Here are the best options:`;
};

/**
 * Generate text when no meals found
 */
const generateNoMealsText = (entities) => {
    const { food, price, preference } = entities;
    
    let message = 'No meals found';
    
    if (food && price) {
        message = `No ${food} found under Rs ${price}. Try increasing your budget or search for other items!`;
    } else if (food) {
        message = `No ${food} available right now. Try searching for other dishes!`;
    } else if (price) {
        message = `No meals found under Rs ${price}. Try increasing your budget!`;
    } else if (preference === 'healthy') {
        message = 'No healthy meals available right now. Check back soon!';
    }
    
    return message;
};

/**
 * Rule-based intent classifier (fallback if AI fails)
 */
const classifyIntentRuleBased = (message, conversationHistory = []) => {
    const msg = message.toLowerCase().trim();
    
    // Check for follow-up queries
    const isFollowUp = msg.length < 20 && (
        msg.includes('?') || 
        msg.match(/^\d+/) || // starts with number
        msg.includes('less') ||
        msg.includes('more') ||
        msg.includes('cheaper') ||
        msg.includes('what about')
    );
    
    // If it's a follow-up and we have history, check previous intent
    if (isFollowUp && conversationHistory.length > 0) {
        // Look for the last recommendation in history
        for (let i = conversationHistory.length - 1; i >= 0; i--) {
            const prevMsg = conversationHistory[i];
            if (prevMsg.sender === 'bot' && prevMsg.text && 
                (prevMsg.text.includes('Looking for') || prevMsg.text.includes('meal'))) {
                return 'recommendation';
            }
        }
    }
    
    // Greeting
    if (msg.includes('hi') || msg.includes('hello') || msg.includes('hey') || 
        msg.includes('good morning') || msg.includes('good afternoon')) {
        return 'greeting';
    }
    
    // About bot
    if (msg.includes('who') || msg.includes('what are you') || 
        msg.includes('who are you') || msg.includes('your name')) {
        return 'about_bot';
    }
    
    // Order status
    if (msg.includes('order') || msg.includes('track') || 
        msg.includes('delivery') || msg.includes('where is')) {
        return 'order_status';
    }
    
    // Complaint
    if (msg.includes('bad') || msg.includes('worst') || msg.includes('terrible') ||
        msg.includes('late') || msg.includes('problem') || msg.includes('complaint')) {
        return 'complaint';
    }
    
    // Explore cooks
    if (msg.includes('cook') || msg.includes('chef') || msg.includes('explore cook')) {
        return 'explore_cooks';
    }
    
    // Food analytics
    if (msg.includes('analytic') || msg.includes('statistic') || msg.includes('insight')) {
        return 'food_analytics';
    }
    
    // Budget meals
    if (msg.includes('budget') || msg.includes('under 200') || msg.includes('under 300')) {
        return 'budget_meals';
    }
    
    // Recommendation (food-related)
    const foodKeywords = ['biryani', 'pizza', 'burger', 'chicken', 'rice', 'pasta', 
                         'noodles', 'sandwich', 'meal', 'food', 'dish', 'eat', 'hungry'];
    if (foodKeywords.some(keyword => msg.includes(keyword))) {
        return 'recommendation';
    }
    
    // Help
    if (msg.includes('help') || msg.includes('how')) {
        return 'help';
    }
    
    return 'fallback';
};

/**
 * Extract entities using rules (fallback if AI fails)
 */
const extractEntitiesRuleBased = (message, conversationHistory = []) => {
    const msg = message.toLowerCase().trim();
    
    // Extract food
    let food = null;
    const foodItems = {
        'biryani': ['biryani', 'biriyani'],
        'pizza': ['pizza'],
        'burger': ['burger'],
        'chicken': ['chicken'],
        'rice': ['rice'],
        'pasta': ['pasta'],
        'noodles': ['noodles'],
        'sandwich': ['sandwich']
    };
    
    for (const [item, variations] of Object.entries(foodItems)) {
        if (variations.some(v => msg.includes(v))) {
            food = item;
            break;
        }
    }
    
    // If no food found and it's a follow-up, try to get from history
    if (!food && conversationHistory.length > 0) {
        for (let i = conversationHistory.length - 1; i >= 0; i--) {
            const prevMsg = conversationHistory[i];
            if (prevMsg.sender === 'user') {
                const prevText = prevMsg.text.toLowerCase();
                for (const [item, variations] of Object.entries(foodItems)) {
                    if (variations.some(v => prevText.includes(v))) {
                        food = item;
                        break;
                    }
                }
                if (food) break;
            }
        }
    }
    
    // Extract price
    const priceMatch = msg.match(/\d+/);
    const price = priceMatch ? parseInt(priceMatch[0]) : null;
    
    // Extract preference
    let preference = null;
    if (msg.includes('cheap') || msg.includes('sasta') || msg.includes('budget') || msg.includes('cheaper')) {
        preference = 'cheap';
    } else if (msg.includes('spicy') || msg.includes('hot')) {
        preference = 'spicy';
    } else if (msg.includes('tasty') || msg.includes('delicious') || msg.includes('best')) {
        preference = 'tasty';
    } else if (msg.includes('popular') || msg.includes('famous')) {
        preference = 'popular';
    } else if (msg.includes('healthy') || msg.includes('diet')) {
        preference = 'healthy';
    } else if (msg.includes('desi') || msg.includes('traditional')) {
        preference = 'desi';
    }
    
    return { food, price, preference };
};

/**
 * Generate response text based on intent
 */
const generateResponseText = (intent, entities, meals = []) => {
    const { food, price, preference } = entities;
    
    switch (intent) {
        case 'greeting':
            return 'Hi 👋 I\'m your Homely Meals Assistant. How can I help you today?';
        case 'about_bot':
            return 'I\'m your Homely Meals Assistant 🤖. I help you find meals, track orders, and solve issues quickly!';
        case 'order_status':
            return 'I can help you track your order 📦';
        case 'complaint':
            return 'I\'m really sorry 😔. Let me help you resolve this issue.';
        case 'explore_cooks':
            return 'Let me show you our talented cooks and their specialties! 👨‍🍳';
        case 'food_analytics':
            return 'Check out detailed analytics and insights about our meals! 📊';
        case 'budget_meals':
            return 'Looking for budget-friendly meals? I\'ll show you great options! 💰';
        case 'recommendation':
            if (meals && meals.length > 0) {
                return generateMealResponseText(entities, meals);
            }
            
            let parts = [];
            if (food) parts.push(food);
            if (preference) parts.push(preference);
            if (price) parts.push(`under Rs ${price}`);
            
            if (parts.length > 0) {
                return `Looking for ${parts.join(', ')}? Let me find the best options for you!`;
            }
            return 'I can help you find delicious meals! What are you looking for?';
        case 'help':
            return 'I can help you with finding meals, tracking orders, or filing complaints. What do you need?';
        default:
            return 'I\'m here to help! You can ask me about meals, track orders, or file complaints. 😊';
    }
};

/**
 * Get suggested actions based on intent
 */
const getSuggestedActions = (intent) => {
    switch (intent) {
        case 'greeting':
            return ['view_meals', 'track_order', 'file_complaint'];
        case 'about_bot':
            return ['view_meals', 'track_order'];
        case 'order_status':
            return ['track_order'];
        case 'complaint':
            return ['file_complaint', 'contact_support'];
        case 'explore_cooks':
            return ['explore_cooks'];
        case 'food_analytics':
            return ['food_analytics'];
        case 'budget_meals':
            return ['budget_200', 'budget_300'];
        case 'recommendation':
            return ['view_recommendations'];
        case 'help':
            return ['view_meals', 'track_order', 'file_complaint'];
        default:
            return ['view_meals', 'track_order', 'file_complaint'];
    }
};

const SYSTEM_PROMPT = `You are a JSON-only response bot for Homely Meals food ordering app.

CRITICAL INSTRUCTION: You MUST return ONLY valid JSON in your response. No other text, no explanations, no markdown. Just pure JSON.

START YOUR RESPONSE WITH { AND END WITH }

CONVERSATION CONTEXT & INCOMPLETE QUERIES (VERY IMPORTANT):
The user may ask incomplete or follow-up questions. You MUST use previous conversation context to understand them.

EXAMPLES OF INCOMPLETE QUERIES:
- "less than 200?" → User is referring to previous food query, just updating price
- "cheaper?" → User wants to reduce the price from previous query
- "what about pizza?" → User is switching food item but keeping other preferences
- "o really?" → Conversational acknowledgment, respond helpfully
- "yes" or "ok" → User agreeing, ask what they'd like to do next
- "200?" → Just a price, use previous food item

CRITICAL RULES FOR FOLLOW-UPS:
1. If previous message included food (e.g., "biryani"), REUSE IT in follow-up
2. If price is mentioned in follow-up, UPDATE the previous price filter
3. NEVER treat short queries as fallback if context exists
4. Maintain conversational continuity
5. Infer missing information from conversation history
6. Always respond meaningfully using context

JSON FORMAT (REQUIRED):
{
  "intent": "MUST be one of: greeting, about_bot, order_status, complaint, recommendation, explore_cooks, food_analytics, budget_meals, help, fallback",
  "text": "friendly response message",
  "food": "food name or null (REUSE from previous if not mentioned)",
  "price": "number or null",
  "preference": "cheap, spicy, tasty, popular, healthy, desi, or null",
  "sentiment": "positive, negative, or neutral",
  "suggestedActions": ["array of actions"]
}

INTENT CLASSIFICATION (MANDATORY):
- User says "hi", "hello", "hey" → intent = "greeting"
- User says "who", "who are you", "what are you" → intent = "about_bot"
- User mentions food OR price with context → intent = "recommendation"
- User mentions "order", "track", "delivery", "where is" → intent = "order_status"
- User says "bad", "worst", "late", "problem", "complaint", "terrible" → intent = "complaint"
- User says "cooks", "chefs", "explore cooks", "view cooks" → intent = "explore_cooks"
- User says "analytics", "food analytics", "meal analytics", "statistics" → intent = "food_analytics"
- User says "budget", "cheap meals", "under 200", "under 300" → intent = "budget_meals"
- User says "help", "how to", "guide" → intent = "help"
- ONLY use "fallback" if message is completely unclear AND no context exists

FOLLOW-UP QUERY HANDLING (CRITICAL):
When user asks incomplete query:
1. Look at previous messages in conversation
2. Extract food item from previous user query
3. Extract any previous price or preference
4. Combine with new information from current query
5. Generate response acknowledging the update

ENTITY EXTRACTION (MANDATORY):
- Extract food name if mentioned: biryani, pizza, burger, chicken, rice, pasta, noodles, sandwich, etc.
- If NO food in current message, check previous messages and REUSE it
- Extract price if number mentioned: "250" → price = 250, "less than 200" → price = 200, "200?" → price = 200, "under 300" → price = 300
- Extract preference: "cheap"/"sasta"/"cheaper"/"budget" → "cheap", "spicy"/"hot" → "spicy", "tasty"/"delicious" → "tasty", "healthy" → "healthy", "desi"/"traditional" → "desi", "popular"/"famous" → "popular"

EXAMPLES (COPY THIS FORMAT):

Conversation 1:
User: "biryani under 250"
Output: {"intent":"recommendation","text":"Looking for biryani under Rs 250? Let me find the best options!","food":"biryani","price":250,"preference":"cheap","sentiment":"neutral","suggestedActions":["view_recommendations"]}

User: "less than 200?"
Output: {"intent":"recommendation","text":"Looking for biryani under Rs 200? Let me update the search!","food":"biryani","price":200,"preference":"cheap","sentiment":"neutral","suggestedActions":["view_recommendations"]}

Conversation 2:
User: "biryani under 250"
Output: {"intent":"recommendation","text":"Looking for biryani under Rs 250? Let me find the best options!","food":"biryani","price":250,"preference":"cheap","sentiment":"neutral","suggestedActions":["view_recommendations"]}

User: "cheaper?"
Output: {"intent":"recommendation","text":"Looking for more affordable biryani options? Let me find cheaper choices!","food":"biryani","price":200,"preference":"cheap","sentiment":"neutral","suggestedActions":["view_recommendations"]}

Conversation 3:
User: "pizza"
Output: {"intent":"recommendation","text":"Looking for pizza? Let me find great options!","food":"pizza","price":null,"preference":null,"sentiment":"neutral","suggestedActions":["view_recommendations"]}

User: "200?"
Output: {"intent":"recommendation","text":"Looking for pizza under Rs 200? Let me find the best options!","food":"pizza","price":200,"preference":"cheap","sentiment":"neutral","suggestedActions":["view_recommendations"]}

Conversation 4:
User: "biryani under 250"
Output: {"intent":"recommendation","text":"Looking for biryani under Rs 250? Let me find the best options!","food":"biryani","price":250,"preference":"cheap","sentiment":"neutral","suggestedActions":["view_recommendations"]}

User: "o really?"
Output: {"intent":"help","text":"Yes! Would you like me to show you the meals or help with something else?","food":null,"price":null,"preference":null,"sentiment":"neutral","suggestedActions":["view_meals","track_order","file_complaint"]}

Single queries:
User: "who?"
Output: {"intent":"about_bot","text":"I'm your Homely Meals Assistant 🤖. I help you find meals, track orders, and solve issues!","food":null,"price":null,"preference":null,"sentiment":"neutral","suggestedActions":["view_meals","track_order"]}

User: "hello"
Output: {"intent":"greeting","text":"Hi 👋 How can I help you today?","food":null,"price":null,"preference":null,"sentiment":"neutral","suggestedActions":["view_meals","track_order","file_complaint"]}

User: "food was bad"
Output: {"intent":"complaint","text":"I'm really sorry 😔. Let me help you resolve this.","food":null,"price":null,"preference":null,"sentiment":"negative","suggestedActions":["file_complaint","contact_support"]}

User: "track my order"
Output: {"intent":"order_status","text":"I can help you track your order 📦","food":null,"price":null,"preference":null,"sentiment":"neutral","suggestedActions":["track_order"]}

User: "cheap pizza"
Output: {"intent":"recommendation","text":"Looking for affordable pizza? I'll find great options!","food":"pizza","price":null,"preference":"cheap","sentiment":"neutral","suggestedActions":["view_recommendations"]}

User: "explore cooks"
Output: {"intent":"explore_cooks","text":"Let me show you our talented cooks and their specialties!","food":null,"price":null,"preference":null,"sentiment":"neutral","suggestedActions":["explore_cooks"]}

User: "budget meals"
Output: {"intent":"budget_meals","text":"Looking for budget-friendly meals? I'll show you great options!","food":null,"price":null,"preference":"cheap","sentiment":"neutral","suggestedActions":["budget_200","budget_300"]}

User: "food analytics"
Output: {"intent":"food_analytics","text":"Check out detailed analytics and insights about our meals!","food":null,"price":null,"preference":null,"sentiment":"neutral","suggestedActions":["food_analytics"]}

REMEMBER: ALWAYS use conversation context. NEVER treat follow-ups as fallback. REUSE previous food/preferences when not explicitly changed.

RETURN ONLY JSON. NO OTHER TEXT.`;

/**
 * Process user message using AI
 * @param {string} userMessage - User's message
 * @param {Array} conversationHistory - Previous messages for context
 * @returns {Promise<Object>} AI response with text, intent, entities, meals, and actions
 */
export const processMessage = async (userMessage, conversationHistory = []) => {
    try {
        if (!userMessage || userMessage.trim().length === 0) {
            return {
                text: 'Please type a message 😊',
                intent: 'fallback',
                entities: {
                    food: null,
                    price: null,
                    preference: null
                },
                sentiment: 'neutral',
                meals: [],
                suggestedActions: ['view_meals', 'track_order']
            };
        }

        console.log('Processing message:', userMessage);
        
        // Check if Groq API key is available
        if (!GROQ_API_KEY) {
            console.warn('⚠️ GROQ_API_KEY not found, using rule-based classification');
            const ruleIntent = classifyIntentRuleBased(userMessage, conversationHistory);
            const ruleEntities = extractEntitiesRuleBased(userMessage, conversationHistory);
            
            // Fetch real meals if recommendation intent
            const meals = ruleIntent === 'recommendation' ? 
                await fetchRealMeals(ruleEntities) : [];
            
            return {
                text: generateResponseText(ruleIntent, ruleEntities, meals),
                intent: ruleIntent,
                entities: ruleEntities,
                sentiment: 'neutral',
                meals: meals,
                suggestedActions: getSuggestedActions(ruleIntent)
            };
        }

        // Build messages array with conversation history
        const messages = [
            { role: 'system', content: SYSTEM_PROMPT }
        ];

        // Add recent conversation history (last 10 messages for better context)
        const recentHistory = conversationHistory.slice(-10);
        recentHistory.forEach(msg => {
            if (msg.text && msg.text.trim()) {
                messages.push({
                    role: msg.sender === 'user' ? 'user' : 'assistant',
                    content: msg.text
                });
            }
        });

        // Add current user message
        messages.push({
            role: 'user',
            content: userMessage
        });

        console.log('Conversation history length:', recentHistory.length);

        const MODEL_NAME = 'llama-3.3-70b-versatile';
        console.log('🚀 Using model:', MODEL_NAME);

        // Call Groq API
        const response = await groq.chat.completions.create({
            model: MODEL_NAME,
            messages: messages,
            temperature: 0.3,
            max_tokens: 300
        });

        console.log('✅ API Response Received from Groq!');

        let output = response.choices[0].message.content.trim();
        
        // Clean up output - remove markdown code blocks if present
        if (output.startsWith('```json')) {
            output = output.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        } else if (output.startsWith('```')) {
            output = output.replace(/```\n?/g, '').trim();
        }

        console.log('AI CLEANED OUTPUT:', output);

        // Parse JSON response
        let result;
        try {
            result = JSON.parse(output);
            console.log('✅ AI PARSED RESULT:', JSON.stringify(result, null, 2));
            console.log('🎯 Intent:', result.intent);
            console.log('🍽️ Food:', result.food);
            console.log('💰 Price:', result.price);
            console.log('⭐ Preference:', result.preference);
        } catch (parseError) {
            console.error('❌ JSON Parse Error:', parseError.message);
            console.error('❌ Failed to parse:', output);
            
            // Fallback to rule-based
            const ruleIntent = classifyIntentRuleBased(userMessage, conversationHistory);
            const ruleEntities = extractEntitiesRuleBased(userMessage, conversationHistory);
            const meals = ruleIntent === 'recommendation' ? 
                await fetchRealMeals(ruleEntities) : [];
            
            return {
                text: generateResponseText(ruleIntent, ruleEntities, meals),
                intent: ruleIntent,
                entities: ruleEntities,
                sentiment: 'neutral',
                meals: meals,
                suggestedActions: getSuggestedActions(ruleIntent)
            };
        }

        // Convert flat structure to expected format
        let finalResponse = {
            text: result.text || 'How can I help you? 😊',
            intent: result.intent || 'fallback',
            entities: {
                food: result.food || null,
                price: result.price || null,
                preference: result.preference || null
            },
            sentiment: result.sentiment || 'neutral',
            meals: [],
            suggestedActions: result.suggestedActions || ['view_meals', 'track_order']
        };

        console.log('🎯 AI Response Intent:', finalResponse.intent);
        console.log('📦 AI Response Entities:', finalResponse.entities);
        
        // SAFETY CHECK: If entities have food/price but intent is not recommendation, force it
        if ((finalResponse.entities.food || finalResponse.entities.price) && 
            finalResponse.intent !== 'recommendation') {
            console.log('⚠️ SAFETY CHECK: Forcing intent to recommendation due to food/price entities');
            finalResponse.intent = 'recommendation';
        }
        
        // ADDITIONAL SAFETY: Check message for food keywords
        const foodKeywords = ['biryani', 'pizza', 'burger', 'chicken', 'rice', 'pasta', 
                             'noodles', 'sandwich', 'meal', 'food', 'dish', 'soup', 'salad',
                             'karahi', 'korma', 'tikka', 'kebab', 'paratha', 'naan'];
        const msgLower = userMessage.toLowerCase();
        const hasFoodKeyword = foodKeywords.some(keyword => msgLower.includes(keyword));
        const hasPrice = /\d+/.test(msgLower);
        
        if ((hasFoodKeyword || hasPrice) && finalResponse.intent !== 'recommendation') {
            console.log('⚠️ SAFETY CHECK: Message contains food/price keywords, forcing recommendation');
            finalResponse.intent = 'recommendation';
            
            // Extract entities if AI missed them
            if (!finalResponse.entities.food && hasFoodKeyword) {
                const detectedFood = foodKeywords.find(keyword => msgLower.includes(keyword));
                finalResponse.entities.food = detectedFood;
                console.log('🔧 Extracted food from message:', detectedFood);
            }
            
            if (!finalResponse.entities.price && hasPrice) {
                const priceMatch = msgLower.match(/\d+/);
                finalResponse.entities.price = priceMatch ? parseInt(priceMatch[0]) : null;
                console.log('🔧 Extracted price from message:', finalResponse.entities.price);
            }
        }

        // CRITICAL: Fetch REAL meals from database if recommendation intent
        if (finalResponse.intent === 'recommendation') {
            console.log('🍽️ ========== FETCHING REAL MEALS ==========');
            console.log('🔍 Entities:', finalResponse.entities);
            finalResponse.meals = await fetchRealMeals(finalResponse.entities);
            console.log(`✅ Found ${finalResponse.meals.length} real meals from database`);
            if (finalResponse.meals.length > 0) {
                console.log('📋 Meals:', finalResponse.meals.map(m => `${m.name} - Rs ${m.price}`));
            }
            console.log('==========================================');
            
            // Update response text with meal count
            if (finalResponse.meals.length > 0) {
                finalResponse.text = generateMealResponseText(finalResponse.entities, finalResponse.meals);
            } else {
                finalResponse.text = generateNoMealsText(finalResponse.entities);
            }
        }

        // If AI returned fallback, use rule-based classification
        if (finalResponse.intent === 'fallback') {
            console.log('AI returned fallback, using rule-based classification...');
            
            const ruleIntent = classifyIntentRuleBased(userMessage, conversationHistory);
            const ruleEntities = extractEntitiesRuleBased(userMessage, conversationHistory);
            const meals = ruleIntent === 'recommendation' ? 
                await fetchRealMeals(ruleEntities) : [];
            
            finalResponse = {
                text: generateResponseText(ruleIntent, ruleEntities, meals),
                intent: ruleIntent,
                entities: ruleEntities,
                sentiment: userMessage.toLowerCase().includes('bad') || 
                          userMessage.toLowerCase().includes('worst') || 
                          userMessage.toLowerCase().includes('terrible') ? 'negative' : 'neutral',
                meals: meals,
                suggestedActions: getSuggestedActions(ruleIntent)
            };
        }

        console.log('FINAL RESPONSE:', finalResponse);

        return finalResponse;

    } catch (error) {
        console.error('\n❌ ========== GROQ API ERROR ==========');
        console.error('❌ GROQ ERROR:', error.response?.data || error.message);
        
        // Use rule-based classification as fallback
        console.log('🔄 Falling back to rule-based classification...');
        
        const ruleIntent = classifyIntentRuleBased(userMessage, conversationHistory);
        const ruleEntities = extractEntitiesRuleBased(userMessage, conversationHistory);
        const meals = ruleIntent === 'recommendation' ? 
            await fetchRealMeals(ruleEntities) : [];
        
        const sentiment = userMessage.toLowerCase().includes('bad') || 
                         userMessage.toLowerCase().includes('worst') || 
                         userMessage.toLowerCase().includes('terrible') ? 'negative' : 'neutral';
        
        return {
            text: generateResponseText(ruleIntent, ruleEntities, meals),
            intent: ruleIntent,
            entities: ruleEntities,
            sentiment: sentiment,
            meals: meals,
            suggestedActions: getSuggestedActions(ruleIntent)
        };
    }
};
