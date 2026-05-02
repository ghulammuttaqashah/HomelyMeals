// modules/customer/routes/customerAnalytics.routes.js
import express from 'express';
import Review from '../../../shared/models/review.model.js';
import { Order } from '../../../shared/models/order.model.js';
import CookMeal from '../../cook/models/cookMeal.model.js';
import { calculateAnalytics } from '../../../shared/services/absa.service.js';

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/customer/analytics/cook/:cookId
// Cook analytics — only cook-target aspects from reviews of this cook
// ─────────────────────────────────────────────────────────────────────────────
router.get('/cook/:cookId', async (req, res) => {
    try {
        const { cookId } = req.params;
        const { days } = req.query;

        const query = { cookId, reviewType: { $in: ['order', 'cook'] } };
        if (days) {
            const daysAgo = new Date();
            daysAgo.setDate(daysAgo.getDate() - parseInt(days));
            query.createdAt = { $gte: daysAgo };
        }

        const reviews = await Review.find(query);
        const analytics = calculateAnalytics(reviews, 'cook');
        res.json(analytics);
    } catch (error) {
        console.error('Get cook analytics error:', error);
        res.status(500).json({ message: 'Failed to fetch analytics', error: error.message });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/customer/analytics/meal/:mealId
// Meal analytics — only reviews from orders that contained this specific meal
// ─────────────────────────────────────────────────────────────────────────────
router.get('/meal/:mealId', async (req, res) => {
    try {
        const { mealId } = req.params;
        const { days } = req.query;

        // Step 1: Find all delivered orders that contained this specific meal
        const orderQuery = { 'items.mealId': mealId, status: 'delivered' };
        if (days) {
            const daysAgo = new Date();
            daysAgo.setDate(daysAgo.getDate() - parseInt(days));
            orderQuery.createdAt = { $gte: daysAgo };
        }
        const orders = await Order.find(orderQuery).select('_id').lean();
        const orderIds = orders.map(o => o._id);

        if (orderIds.length === 0) {
            // No orders for this meal — return empty analytics
            return res.json({
                totalReviews: 0,
                averageRating: 0,
                sentiments: { positive: 0, negative: 0 },
                categories: { positive: [], negative: [] },
                aspects: [],
                keywords: []
            });
        }

        // Step 2: Find reviews for those specific orders
        const reviews = await Review.find({
            orderId: { $in: orderIds },
            reviewType: { $in: ['order', 'meal'] }
        });

        // Step 3: Calculate analytics filtered to meal-target aspects only
        const analytics = calculateAnalytics(reviews, 'meal');
        res.json(analytics);
    } catch (error) {
        console.error('Get meal analytics error:', error);
        res.status(500).json({ message: 'Failed to fetch analytics', error: error.message });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// Smart meal recommendations (for chatbot)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/recommendations', async (req, res) => {
    try {
        const { food, maxPrice, minRating, preference } = req.query;

        const mealQuery = { availability: 'Available' };
        if (food) mealQuery.name = { $regex: new RegExp(food, 'i') };
        if (maxPrice) mealQuery.price = { $lte: parseInt(maxPrice) };

        let meals = await CookMeal.find(mealQuery).populate('cookId', 'name').lean();
        if (meals.length === 0) {
            return res.json({ meals: [], message: 'No meals found matching your criteria' });
        }

        const mealsWithScores = await Promise.all(
            meals.map(async (meal) => {
                const cookId = meal.cookId?._id || meal.cookId;
                const cookName = meal.cookId?.name || 'Unknown Cook';

                // Get orders containing this meal
                const orders = await Order.find({
                    'items.mealId': meal._id,
                    status: 'delivered'
                }).select('_id').lean();
                const orderIds = orders.map(o => o._id);

                if (orderIds.length === 0) {
                    return { ...meal, cookId, cookName, averageRating: 0, reviewCount: 0, sentimentScore: 0, positivePercentage: 0, rankScore: 0 };
                }

                const reviews = await Review.find({
                    orderId: { $in: orderIds },
                    reviewType: { $in: ['order', 'meal'] }
                });

                if (reviews.length === 0) {
                    return { ...meal, cookId, cookName, averageRating: 0, reviewCount: 0, sentimentScore: 0, positivePercentage: 0, rankScore: 0 };
                }

                const analytics = calculateAnalytics(reviews, 'meal');
                const totalPositive = analytics.sentiments?.positive || 0;
                const totalNegative = analytics.sentiments?.negative || 0;
                const totalAspects = totalPositive + totalNegative;
                const positivePercentage = totalAspects > 0 ? (totalPositive / totalAspects) * 100 : 0;
                const sentimentScore = (positivePercentage / 100) * 5;
                const ratingScore = analytics.averageRating * 0.4;
                const sentimentWeight = sentimentScore * 0.4;
                let priceScore = preference === 'cheap'
                    ? ((maxPrice ? parseInt(maxPrice) : 500) - meal.price) / (maxPrice ? parseInt(maxPrice) : 500)
                    : 0.5;

                return {
                    ...meal, cookId, cookName,
                    averageRating: analytics.averageRating,
                    reviewCount: reviews.length,
                    sentimentScore: Math.round(sentimentScore * 10) / 10,
                    positivePercentage: Math.round(positivePercentage),
                    rankScore: Math.round((ratingScore + sentimentWeight + priceScore) * 100) / 100
                };
            })
        );

        let filteredMeals = mealsWithScores;
        if (minRating) filteredMeals = filteredMeals.filter(m => m.averageRating >= parseFloat(minRating));
        filteredMeals = filteredMeals.filter(m => m.reviewCount === 0 || m.positivePercentage >= 60);
        filteredMeals.sort((a, b) => b.rankScore - a.rankScore);

        res.json({
            meals: filteredMeals.slice(0, 20),
            total: filteredMeals.slice(0, 20).length,
            message: filteredMeals.length > 0 ? 'Recommendations found' : 'No meals found with positive sentiment'
        });
    } catch (error) {
        console.error('Get recommendations error:', error);
        res.status(500).json({ message: 'Failed to fetch recommendations', error: error.message });
    }
});

export default router;
