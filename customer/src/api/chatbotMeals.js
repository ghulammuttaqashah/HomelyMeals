import api from './axios'

/**
 * Send message to advanced AI chatbot
 */
export const sendAdvancedChatMessage = async (message, conversationHistory = []) => {
  const { data } = await api.post('/api/customer/chatbot/advanced', {
    message,
    conversationHistory
  })
  return data
}

/**
 * Send message to feature search AI (restricted to top selling context)
 */
export const sendFeatureSearchMessage = async (message, conversationHistory = []) => {
  const { data } = await api.post('/api/customer/chatbot/feature-search', {
    message,
    conversationHistory
  })
  return data
}

/**
 * Get all available meals (for chatbot)
 */
export const getAllMealsForChatbot = async () => {
  const { data } = await api.get('/api/customer/chatbot/meals/all')
  return data
}

/**
 * Get top selling meals by time period
 * @param {string} period - 'today', 'week', 'month', 'overall'
 * @param {number} limit - Number of meals to return (default: 5)
 */
export const getTopSellingByPeriod = async (period = 'overall', limit = 5) => {
  const { data } = await api.get('/api/customer/chatbot/meals/top-selling', {
    params: { period, limit }
  })
  return data
}

/**
 * Get top rated meals
 * @param {number} limit - Number of meals to return (default: 10)
 */
export const getTopRatedMealsForChatbot = async (limit = 10) => {
  const { data } = await api.get('/api/customer/chatbot/meals/top-rated', {
    params: { limit }
  })
  return data
}

/**
 * Get unique meal types for dropdown
 */
export const getUniqueMealTypes = async () => {
  const { data } = await api.get('/api/customer/chatbot/meals/unique-types')
  return data
}

/**
 * Get top rated cooks
 * @param {number} limit - Number of cooks to return (default: 7)
 */
export const getTopRatedCooks = async (limit = 7) => {
  const { data } = await api.get('/api/customer/chatbot/cooks/top-rated', {
    params: { limit }
  })
  return data
}

/**
 * Get top selling cooks
 * @param {number} limit - Number of cooks to return (default: 7)
 */
export const getTopSellingCooks = async (limit = 7) => {
  const { data } = await api.get('/api/customer/chatbot/cooks/top-selling', {
    params: { limit }
  })
  return data
}

/**
 * Get best cooks for top selling items
 * @param {number} limit - Number of cooks per item (default: 3)
 */
export const getBestCooksByTopItems = async (limit = 3) => {
  const { data } = await api.get('/api/customer/chatbot/cooks/by-top-items', {
    params: { limit }
  })
  return data
}

/**
 * Get personalized recommendations for user
 * @param {number} limit - Number of recommendations to return (default: 10)
 */
export const getPersonalizedRecommendations = async (limit = 10) => {
  const { data } = await api.get('/api/customer/chatbot/recommendations', {
    params: { limit }
  })
  return data
}

/**
 * Smart Food Advisor - AI-driven meal recommendations
 * @param {string} query - User query (e.g., "I have fever", "cheap food")
 */
export const getSmartFoodAdvice = async (query) => {
  const { data } = await api.post('/api/customer/chatbot/smart-advisor', { query })
  return data
}

/**
 * Get health-based meals
 * @param {string} tags - Comma-separated health tags (e.g., "healthy,light")
 * @param {number} limit - Number of meals to return
 */
export const getHealthBasedMeals = async (tags, limit = 10) => {
  const { data } = await api.get('/api/customer/chatbot/health-meals', {
    params: { tags, limit }
  })
  return data
}

/**
 * Compare meals
 * @param {Array} mealIds - Array of 2-3 meal IDs to compare
 */
export const compareMeals = async (mealIds) => {
  const { data } = await api.post('/api/customer/chatbot/compare-meals', { mealIds })
  return data
}

/**
 * Get available health tags
 */
export const getHealthTags = async () => {
  const { data } = await api.get('/api/customer/chatbot/health-tags')
  return data
}

/**
 * Intelligent Order Assistant - Dynamic routing for orders, complaints, tracking
 * @param {string} query - User query
 * @param {Array} chatHistory - Conversation history
 */
export const sendOrderAssistantQuery = async (query, chatHistory = []) => {
  const { data } = await api.post('/api/customer/chatbot/order-assistant', {
    query,
    chatHistory
  })
  return data
}
