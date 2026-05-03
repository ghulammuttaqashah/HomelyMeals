// modules/cook/routes/cookAnalytics.routes.js
import express from 'express';
import Review from '../../../shared/models/review.model.js';
import { protect } from '../../../shared/middleware/auth.js';
import { calculateAnalytics } from '../../../shared/services/absa.service.js';

const router = express.Router();

// Get analytics for cook's own reviews (cook-target aspects only)
router.get('/cook', protect, async (req, res) => {
    try {
        const cookId = req.user._id;
        const { days } = req.query;

        const query = { cookId, reviewType: { $in: ['order', 'cook'] } };

        if (days) {
            const daysAgo = new Date();
            daysAgo.setDate(daysAgo.getDate() - parseInt(days));
            query.createdAt = { $gte: daysAgo };
        }

        const reviews = await Review.find(query);
        // Filter analytics to cook-target aspects only
        const analytics = calculateAnalytics(reviews, 'cook');

        res.json(analytics);
    } catch (error) {
        console.error('Get cook analytics error:', error);
        res.status(500).json({ message: 'Failed to fetch analytics', error: error.message });
    }
});

// Get analytics for a specific meal (meal-target aspects only)
router.get('/meal/:mealId', protect, async (req, res) => {
    try {
        const { mealId } = req.params;
        const cookId = req.user._id;
        const { days } = req.query;

        // Import Order model
        const { Order } = await import('../../../shared/models/order.model.js');

        // Step 1: Find all delivered orders that contained this specific meal
        const orderQuery = { 'items.mealId': mealId, status: 'delivered', cookId };
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

// Get analytics for all meals (meal-target aspects only)
router.get('/meals', protect, async (req, res) => {
    try {
        const cookId = req.user._id;
        const { days } = req.query;

        const query = { cookId, reviewType: { $in: ['order', 'meal'] } };

        if (days) {
            const daysAgo = new Date();
            daysAgo.setDate(daysAgo.getDate() - parseInt(days));
            query.createdAt = { $gte: daysAgo };
        }

        const reviews = await Review.find(query);
        const analytics = calculateAnalytics(reviews, 'meal');

        res.json(analytics);
    } catch (error) {
        console.error('Get meals analytics error:', error);
        res.status(500).json({ message: 'Failed to fetch analytics', error: error.message });
    }
});

export default router;
