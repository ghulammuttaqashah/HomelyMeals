import api from './axios'

// Submit a unified order review (new ABSA system - one review per order)
export const submitReview = async (reviewData) => {
    const { data } = await api.post('/api/customer/reviews', reviewData)
    return data
}

// Check if customer can review an order
export const checkCanReview = async (orderId) => {
    const { data } = await api.get(`/api/customer/reviews/can-review/${orderId}`)
    return data
}

// Get reviews for a cook (public)
export const getCookReviews = async (cookId) => {
    const { data } = await api.get(`/api/customer/reviews/cook/${cookId}`)
    return data
}

// Get reviews for a meal (public)
export const getMealReviews = async (mealId) => {
    const { data } = await api.get(`/api/customer/reviews/meal/${mealId}`)
    return data
}

// Get customer's own reviews
export const getMyReviews = async () => {
    const { data } = await api.get('/api/customer/reviews/my-reviews')
    return data
}

// Update a review
export const updateReview = async (reviewId, reviewData) => {
    const { data } = await api.put(`/api/customer/reviews/${reviewId}`, reviewData)
    return data
}

// Delete a review
export const deleteReview = async (reviewId) => {
    const { data } = await api.delete(`/api/customer/reviews/${reviewId}`)
    return data
}

// Legacy: Check if customer can review a cook
export const checkCanReviewCook = async (cookId) => {
    const { data } = await api.get(`/api/customer/reviews/can-review-cook/${cookId}`)
    return data
}

// Legacy: Check if customer can review a meal
export const checkCanReviewMeal = async (mealId) => {
    const { data } = await api.get(`/api/customer/reviews/can-review-meal/${mealId}`)
    return data
}
