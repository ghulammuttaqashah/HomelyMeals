import api from './axios'

// Get all reviews for the authenticated cook
export const getCookReviews = async (type = 'all', mealId = null) => {
    const params = {}
    if (type && type !== 'all') params.type = type
    if (mealId) params.mealId = mealId

    const { data } = await api.get('/api/cook/reviews', { params })
    return data
}

// Get review stats summary
export const getReviewStats = async () => {
    const { data } = await api.get('/api/cook/reviews/stats')
    return data
}
