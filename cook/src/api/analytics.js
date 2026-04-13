import api from './axios'

// Get cook analytics (own reviews)
export const getCookAnalytics = async (days = null) => {
    const params = days ? { days } : {}
    const { data } = await api.get('/api/cook/analytics/cook', { params })
    return data
}

// Get meal analytics
export const getMealAnalytics = async (mealId, days = null) => {
    const params = days ? { days } : {}
    const { data } = await api.get(`/api/cook/analytics/meal/${mealId}`, { params })
    return data
}

// Get all meals analytics
export const getAllMealsAnalytics = async (days = null) => {
    const params = days ? { days } : {}
    const { data } = await api.get('/api/cook/analytics/meals', { params })
    return data
}
