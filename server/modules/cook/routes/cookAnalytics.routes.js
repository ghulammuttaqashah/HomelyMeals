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

        // For new unified reviews, filter by cookId; for legacy, filter by mealId
        const query = {
            cookId,
            $or: [
                { reviewType: 'order' },
                { reviewType: 'meal', mealId }
            ]
        };

        if (days) {
            const daysAgo = new Date();
            daysAgo.setDate(daysAgo.getDate() - parseInt(days));
            query.createdAt = { $gte: daysAgo };
        }

        const reviews = await Review.find(query);
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
