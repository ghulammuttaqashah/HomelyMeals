import { Order } from "../../../shared/models/order.model.js";
import { Complaint, CUSTOMER_COMPLAINT_TYPES } from "../../../shared/models/complaint.model.js";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/**
 * Intelligent Order Assistant - Routes users dynamically
 * POST /api/customer/chatbot/order-assistant
 */
export const intelligentOrderAssistant = async (req, res) => {
  try {
    const { query, chatHistory = [] } = req.body;
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    console.log("🤖 Order Assistant Query:", query);

    // STEP 1: Analyze user intent using AI
    let intent = null;
    
    try {
      const intentPrompt = `You are an intelligent food delivery assistant. Analyze the user's message and determine their intent.

User Message: "${query}"

Determine the PRIMARY intent from these options:
1. "track_order" - User wants to track/check order status (keywords: where, track, order, delivery, status, when)
2. "complaint" - User has a problem/complaint (keywords: bad, wrong, late, problem, issue, not delivered, missing, complaint, terrible, worst)
3. "recommendation" - User wants food suggestions (keywords: what should I eat, recommend, suggest, hungry)
4. "general" - General question or greeting

Also detect:
- Sentiment: positive, neutral, negative
- Urgency: high, medium, low

Return ONLY valid JSON:
{
  "intent": "track_order|complaint|recommendation|general",
  "sentiment": "positive|neutral|negative",
  "urgency": "high|medium|low",
  "reasoning": "brief explanation"
}`;

      const intentResponse = await groq.chat.completions.create({
        messages: [{ role: "user", content: intentPrompt }],
        model: "llama-3.3-70b-versatile",
        temperature: 0.3,
        max_tokens: 200,
      });

      const content = intentResponse.choices[0]?.message?.content?.trim();
      intent = JSON.parse(content);
      console.log("🧠 Detected Intent:", intent);
    } catch (error) {
      console.error("Intent detection failed, using fallback:", error);
      intent = detectIntentFallback(query);
    }

    // STEP 2: Get user's order context
    const orderContext = await getUserOrderContext(userId);
    console.log("📦 Order Context:", orderContext);

    // STEP 3: Route to appropriate handler based on intent
    let response = null;

    switch (intent.intent) {
      case "track_order":
        response = await handleTrackOrderIntent(userId, orderContext, intent);
        break;
      
      case "complaint":
        response = await handleComplaintIntent(userId, orderContext, intent, query);
        break;
      
      case "recommendation":
        response = {
          success: true,
          action: "redirect_to_recommendations",
          message: "Let me help you find something delicious! 😋",
          guidance: "I'll show you personalized meal recommendations based on your preferences.",
        };
        break;
      
      case "general":
      default:
        response = await handleGeneralIntent(userId, orderContext, query);
        break;
    }

    return res.status(200).json(response);
  } catch (error) {
    console.error("Order Assistant error:", error);
    
    // NEVER show system errors - always guide forward
    return res.status(200).json({
      success: true,
      action: "show_menu",
      message: "I'm here to help! What would you like to do?",
      options: [
        { label: "Track My Order", action: "track_order" },
        { label: "File a Complaint", action: "file_complaint" },
        { label: "Browse Meals", action: "browse_meals" },
      ],
    });
  }
};

/**
 * Get user's order context (active, recent, delivered orders)
 */
async function getUserOrderContext(userId) {
  try {
    // Get latest order
    const latestOrder = await Order.findOne({ customerId: userId })
      .sort({ createdAt: -1 })
      .populate("cookId", "name")
      .lean();

    if (!latestOrder) {
      return {
        hasOrders: false,
        latestOrder: null,
        activeOrder: null,
        recentDelivered: null,
      };
    }

    // Check if latest order is active
    const activeStatuses = ["confirmed", "preparing", "out_for_delivery"];
    const isActive = activeStatuses.includes(latestOrder.status);

    // Get most recent delivered order (for complaints)
    const recentDelivered = await Order.findOne({
      customerId: userId,
      status: "delivered",
    })
      .sort({ deliveredAt: -1 })
      .populate("cookId", "name")
      .lean();

    return {
      hasOrders: true,
      latestOrder,
      activeOrder: isActive ? latestOrder : null,
      recentDelivered,
    };
  } catch (error) {
    console.error("Get order context error:", error);
    return {
      hasOrders: false,
      latestOrder: null,
      activeOrder: null,
      recentDelivered: null,
    };
  }
}

/**
 * Handle Track Order Intent
 */
async function handleTrackOrderIntent(userId, orderContext, intent) {
  // CASE A: User has active order
  if (orderContext.activeOrder) {
    const order = orderContext.activeOrder;
    const statusMessages = {
      confirmed: "Your order has been confirmed and is waiting for the cook to start preparing it.",
      preparing: "Your order is being prepared by the cook right now. 👨‍🍳",
      out_for_delivery: "Great news! Your order is on the way to you! 🚗",
    };

    const message = statusMessages[order.status] || "Your order is being processed.";
    
    return {
      success: true,
      action: "show_order_status",
      message,
      order: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        cookName: order.cookId?.name,
        totalAmount: order.totalAmount,
        estimatedTime: order.estimatedTime,
        items: order.items,
      },
      nextSteps: [
        "Your order will be delivered soon",
        "You can contact the cook if needed",
      ],
    };
  }

  // CASE B: Latest order is delivered
  if (orderContext.latestOrder?.status === "delivered") {
    return {
      success: true,
      action: "show_delivered_status",
      message: "Your last order has been delivered! 🎉",
      order: {
        orderId: orderContext.latestOrder._id,
        orderNumber: orderContext.latestOrder.orderNumber,
        status: "delivered",
        deliveredAt: orderContext.latestOrder.deliveredAt,
      },
      guidance: "If you faced any issue with your order, you can file a complaint.",
      options: [
        { label: "File a Complaint", action: "file_complaint" },
        { label: "Order Again", action: "browse_meals" },
      ],
    };
  }

  // CASE C: Latest order is cancelled
  if (orderContext.latestOrder?.status === "cancelled") {
    return {
      success: true,
      action: "show_cancelled_status",
      message: "Your last order was cancelled.",
      order: {
        orderId: orderContext.latestOrder._id,
        orderNumber: orderContext.latestOrder.orderNumber,
        status: "cancelled",
        cancellationReason: orderContext.latestOrder.cancellationReason,
      },
      guidance: "Would you like to place a new order?",
      options: [
        { label: "Browse Meals", action: "browse_meals" },
      ],
    };
  }

  // CASE D: No orders yet
  return {
    success: true,
    action: "no_orders",
    message: "You haven't placed any orders yet.",
    guidance: "Would you like to browse meals and place your first order?",
    options: [
      { label: "Browse Meals", action: "browse_meals" },
      { label: "View Recommendations", action: "recommendations" },
    ],
  };
}

/**
 * Handle Complaint Intent
 */
async function handleComplaintIntent(userId, orderContext, intent, query) {
  // Check if user has delivered orders to complain about
  if (!orderContext.recentDelivered) {
    return {
      success: true,
      action: "no_delivered_orders",
      message: "I understand you have a concern. However, you need a delivered order to file a complaint.",
      guidance: "Once you receive an order, you can file a complaint if there's any issue.",
      sentiment: intent.sentiment,
      options: [
        { label: "Track Current Order", action: "track_order" },
        { label: "Browse Meals", action: "browse_meals" },
      ],
    };
  }

  // Check if complaint already exists for recent order
  const existingComplaint = await Complaint.findOne({
    complainantId: userId,
    orderId: orderContext.recentDelivered._id,
  }).lean();

  if (existingComplaint) {
    return {
      success: true,
      action: "complaint_exists",
      message: "You've already filed a complaint for your recent order.",
      complaint: {
        complaintId: existingComplaint._id,
        status: existingComplaint.status,
        type: existingComplaint.type,
      },
      guidance: "Our team is reviewing your complaint. You can check its status in your complaints section.",
      options: [
        { label: "View My Complaints", action: "view_complaints" },
        { label: "Browse Meals", action: "browse_meals" },
      ],
    };
  }

  // Analyze complaint type using AI
  let complaintType = null;
  try {
    const typePrompt = `Analyze this complaint and categorize it.

User Complaint: "${query}"

Valid complaint types:
1. "Order Not Delivered"
2. "Wrong Food Delivered"
3. "Food Quality Issue"
4. "Other"

Return ONLY valid JSON:
{
  "type": "exact type from list above",
  "severity": "high|medium|low",
  "summary": "brief 1-sentence summary"
}`;

    const typeResponse = await groq.chat.completions.create({
      messages: [{ role: "user", content: typePrompt }],
      model: "llama-3.3-70b-versatile",
      temperature: 0.3,
      max_tokens: 150,
    });

    const content = typeResponse.choices[0]?.message?.content?.trim();
    complaintType = JSON.parse(content);
  } catch (error) {
    console.error("Complaint type detection failed:", error);
    complaintType = {
      type: "Other",
      severity: "medium",
      summary: "Customer reported an issue with their order",
    };
  }

  // Guide user to file complaint
  return {
    success: true,
    action: "guide_to_complaint",
    message: "I'm really sorry to hear that. 😔 Let me help you file a complaint.",
    order: {
      orderId: orderContext.recentDelivered._id,
      orderNumber: orderContext.recentDelivered.orderNumber,
      cookName: orderContext.recentDelivered.cookId?.name,
    },
    suggestedComplaintType: complaintType.type,
    complaintTypes: CUSTOMER_COMPLAINT_TYPES,
    guidance: "Please select the complaint type and provide details. You can also upload proof images.",
    sentiment: intent.sentiment,
    urgency: intent.urgency,
  };
}

/**
 * Handle General Intent
 */
async function handleGeneralIntent(userId, orderContext, query) {
  // If user has active order, prioritize that
  if (orderContext.activeOrder) {
    return {
      success: true,
      action: "show_menu_with_context",
      message: "Hi! I can help you with your order or anything else. 😊",
      context: {
        hasActiveOrder: true,
        orderNumber: orderContext.activeOrder.orderNumber,
        status: orderContext.activeOrder.status,
      },
      options: [
        { label: "Track My Order", action: "track_order", highlighted: true },
        { label: "Browse Meals", action: "browse_meals" },
        { label: "Get Recommendations", action: "recommendations" },
      ],
    };
  }

  // Default menu
  return {
    success: true,
    action: "show_menu",
    message: "Hi! How can I help you today? 😊",
    options: [
      { label: "Browse Meals", action: "browse_meals" },
      { label: "Get Recommendations", action: "recommendations" },
      { label: "Track Order", action: "track_order" },
    ],
  };
}

/**
 * Fallback intent detection (when AI fails)
 */
function detectIntentFallback(query) {
  const lowerQuery = query.toLowerCase();
  
  // Track order keywords
  if (
    lowerQuery.includes("track") ||
    lowerQuery.includes("order") ||
    lowerQuery.includes("where") ||
    lowerQuery.includes("status") ||
    lowerQuery.includes("delivery") ||
    lowerQuery.includes("when")
  ) {
    return {
      intent: "track_order",
      sentiment: "neutral",
      urgency: "medium",
      reasoning: "Keyword-based detection",
    };
  }

  // Complaint keywords
  if (
    lowerQuery.includes("bad") ||
    lowerQuery.includes("wrong") ||
    lowerQuery.includes("late") ||
    lowerQuery.includes("problem") ||
    lowerQuery.includes("issue") ||
    lowerQuery.includes("complaint") ||
    lowerQuery.includes("terrible") ||
    lowerQuery.includes("worst") ||
    lowerQuery.includes("not delivered") ||
    lowerQuery.includes("missing")
  ) {
    return {
      intent: "complaint",
      sentiment: "negative",
      urgency: "high",
      reasoning: "Keyword-based detection",
    };
  }

  // Recommendation keywords
  if (
    lowerQuery.includes("recommend") ||
    lowerQuery.includes("suggest") ||
    lowerQuery.includes("what should i eat") ||
    lowerQuery.includes("hungry") ||
    lowerQuery.includes("food")
  ) {
    return {
      intent: "recommendation",
      sentiment: "neutral",
      urgency: "low",
      reasoning: "Keyword-based detection",
    };
  }

  // Default to general
  return {
    intent: "general",
    sentiment: "neutral",
    urgency: "low",
    reasoning: "No specific intent detected",
  };
}
