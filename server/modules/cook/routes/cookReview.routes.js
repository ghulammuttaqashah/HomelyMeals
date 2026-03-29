import express from 'express';
import { rateLimit } from 'express-rate-limit';
import Review from '../../../shared/models/review.model.js';
import { protect } from '../../../shared/middleware/auth.js';
import { buildAbsaSummary } from '../../../shared/utils/absa.js';

const absaSummaryLimiter = rateLimit({ windowMs: 60 * 1000, max: 30 });

const router = express.Router();

// Get all reviews for the authenticated cook
router.get('/', protect, async (req, res) => {
    try {
        const cookId = req.user._id;
        const { type, mealId } = req.query;

        // Build query
        let query = { cookId };

        if (type && type !== 'all') {
            query.reviewType = type;
        }

        if (mealId) {
            query.mealId = mealId;
        }

        // Fetch reviews
        const reviews = await Review.find(query)
            .populate('customerId', 'name')
            .populate('mealId', 'name')
            .sort({ createdAt: -1 });

        // Calculate stats
        const totalReviews = reviews.length;
        const averageRating = totalReviews > 0
            ? reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews
            : 0;

        // Rating distribution
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
                aspectSummary: buildAbsaSummary(reviews),
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
            ? reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews
            : 0;

        // Get recent reviews count (last 7 days)
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

// Get ABSA (Aspect-Based Sentiment Analysis) summary for the authenticated cook
router.get('/absa-summary', absaSummaryLimiter, protect, async (req, res) => {
    try {
        const cookId = req.user._id;

        const reviews = await Review.find({ cookId }).select('aspects');
        const aspectSummary = buildAbsaSummary(reviews);

        res.json({ aspectSummary });
    } catch (error) {
        console.error('Get ABSA summary error:', error);
        res.status(500).json({ message: 'Failed to fetch ABSA summary', error: error.message });
    }
});

export default router;
