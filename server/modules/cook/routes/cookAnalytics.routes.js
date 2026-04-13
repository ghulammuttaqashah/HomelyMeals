// modules/cook/routes/cookAnalytics.routes.js
import express from 'express';
import Review from '../../../shared/models/review.model.js';
import { protect } from '../../../shared/middleware/auth.js';
import { calculateAnalytics } from '../../../shared/services/absa.service.js';

const router = express.Router();

// Get analytics for cook's own reviews
router.get('/cook', protect, async (req, res) => {
    try {
        const cookId = req.user._id;
        const { days } = req.query;

        // Build query
        const query = { cookId, reviewType: 'cook' };

        // Apply time filter if specified
        if (days) {
            const daysAgo = new Date();
            daysAgo.setDate(daysAgo.getDate() - parseInt(days));
            query.createdAt = { $gte: daysAgo };
        }

        // Fetch reviews
        const reviews = await Review.find(query);

        // Calculate analytics
        const analytics = calculateAnalytics(reviews);

        res.json(analytics);
    } catch (error) {
        console.error('Get cook analytics error:', error);
        res.status(500).json({ message: 'Failed to fetch analytics', error: error.message });
    }
});

// Get analytics for a specific meal
router.get('/meal/:mealId', protect, async (req, res) => {
    try {
        const { mealId } = req.params;
        const cookId = req.user._id;
        const { days } = req.query;

        // Build query
        const query = { mealId, cookId, reviewType: 'meal' };

        // Apply time filter if specified
        if (days) {
            const daysAgo = new Date();
            daysAgo.setDate(daysAgo.getDate() - parseInt(days));
            query.createdAt = { $gte: daysAgo };
        }

        // Fetch reviews
        const reviews = await Review.find(query);

        // Calculate analytics
        const analytics = calculateAnalytics(reviews);

        res.json(analytics);
    } catch (error) {
        console.error('Get meal analytics error:', error);
        res.status(500).json({ message: 'Failed to fetch analytics', error: error.message });
    }
});

// Get analytics for all meals
router.get('/meals', protect, async (req, res) => {
    try {
        const cookId = req.user._id;
        const { days } = req.query;

        // Build query
        const query = { cookId, reviewType: 'meal' };

        // Apply time filter if specified
        if (days) {
            const daysAgo = new Date();
            daysAgo.setDate(daysAgo.getDate() - parseInt(days));
            query.createdAt = { $gte: daysAgo };
        }

        // Fetch reviews
        const reviews = await Review.find(query);

        // Calculate analytics
        const analytics = calculateAnalytics(reviews);

        res.json(analytics);
    } catch (error) {
        console.error('Get meals analytics error:', error);
        res.status(500).json({ message: 'Failed to fetch analytics', error: error.message });
    }
});

export default router;
