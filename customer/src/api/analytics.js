import api from './axios'

// Get cook analytics (public)
export const getCookAnalytics = async (cookId, days = null) => {
    const params = days ? { days } : {}
    const { data } = await api.get(`/api/customer/analytics/cook/${cookId}`, { params })
    return data
}

// Get meal analytics (public)
export const getMealAnalytics = async (mealId, days = null) => {
    const params = days ? { days } : {}
    const { data } = await api.get(`/api/customer/analytics/meal/${mealId}`, { params })
    return data
}

// Get reviews by keyword for meal
export const getMealReviewsByKeyword = async (mealId, aspect, sentiment, keyword) => {
    const { data } = await api.get(`/api/customer/analytics/meal/${mealId}/reviews/${aspect}/${sentiment}/${keyword}`)
    return data
}

// Get reviews by keyword for cook
export const getCookReviewsByKeyword = async (cookId, aspect, sentiment, keyword) => {
    const { data } = await api.get(`/api/customer/analytics/cook/${cookId}/reviews/${aspect}/${sentiment}/${keyword}`)
    return data
}

// Get smart meal recommendations with ABSA filtering (for chatbot)
export const getSmartRecommendations = async (filters = {}) => {
    const { data } = await api.get('/api/customer/analytics/recommendations', { params: filters })
    return data
}
