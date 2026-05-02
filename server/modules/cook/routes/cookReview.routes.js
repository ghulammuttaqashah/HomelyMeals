import express from 'express';
import Review from '../../../shared/models/review.model.js';
import { protect } from '../../../shared/middleware/auth.js';

const router = express.Router();

// Get all reviews for the authenticated cook
router.get('/', protect, async (req, res) => {
    try {
        const cookId = req.user._id;
        const { type, mealId } = req.query;

        // Build query - include both new 'order' type and legacy types
        let query = { cookId };

        if (type && type !== 'all') {
            if (type === 'cook') {
                query.reviewType = { $in: ['order', 'cook'] };
            } else if (type === 'meal') {
                query.reviewType = { $in: ['order', 'meal'] };
            } else {
                query.reviewType = type;
            }
        }

        if (mealId) {
            query.mealId = mealId;
        }

        // Mark all unread reviews as read
        await Review.updateMany({ cookId, isRead: false }, { $set: { isRead: true } });

        const reviews = await Review.find(query)
            .populate('customerId', 'name')
            .populate('mealId', 'name')
            .sort({ createdAt: -1 });

        const totalReviews = reviews.length;
        const averageRating = totalReviews > 0
            ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
            : 0;

        const ratingDistribution = {
            5: reviews.filter(r => r.rating === 5).length,
            4: reviews.filter(r => r.rating === 4).length,
            3: reviews.filter(r => r.rating === 3).length,
            2: reviews.filter(r => r.rating === 2).length,
            1: reviews.filter(r => r.rating === 1).length,
        };

        res.json({
            reviews,
            stats: {
                averageRating: Math.round(averageRating * 10) / 10,
                totalReviews,
                ratingDistribution,
            },
        });
    } catch (error) {
        console.error('Get cook reviews error:', error);
        res.status(500).json({ message: 'Failed to fetch reviews', error: error.message });
    }
});

// Get review stats summary (for dashboard widget)
router.get('/stats', protect, async (req, res) => {
    try {
        const cookId = req.user._id;

        const reviews = await Review.find({ cookId });
        const totalReviews = reviews.length;
        const averageRating = totalReviews > 0
            ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
            : 0;

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const recentReviews = reviews.filter(r => r.createdAt >= sevenDaysAgo).length;

        res.json({
            averageRating: Math.round(averageRating * 10) / 10,
            totalReviews,
            recentReviews,
        });
    } catch (error) {
        console.error('Get review stats error:', error);
        res.status(500).json({ message: 'Failed to fetch stats', error: error.message });
    }
});

export default router;
