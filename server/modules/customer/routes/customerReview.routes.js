import express from 'express';
import { rateLimit } from 'express-rate-limit';
import Review from '../../../shared/models/review.model.js';
import { Order } from '../../../shared/models/order.model.js';
import { protect } from '../../../shared/middleware/auth.js';
import { analyzeAspects, buildAbsaSummary } from '../../../shared/utils/absa.js';

const absaLimiter = rateLimit({ windowMs: 60 * 1000, max: 30 });

const router = express.Router();

// Submit a new review
router.post('/', protect, async (req, res) => {
    try {
        const { orderId, cookId, mealId, rating, reviewText, reviewType } = req.body;
        const customerId = req.user._id;

        // Validate required fields
        if (!orderId || !cookId || !rating || !reviewType) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        // Validate rating
        if (rating < 1 || rating > 5) {
            return res.status(400).json({ message: 'Rating must be between 1 and 5' });
        }

        // Validate review type
        if (!['cook', 'meal'].includes(reviewType)) {
            return res.status(400).json({ message: 'Invalid review type' });
        }

        // For meal reviews, mealId is required
        if (reviewType === 'meal' && !mealId) {
            return res.status(400).json({ message: 'Meal ID is required for meal reviews' });
        }

        // Validate the order
        const order = await Order.findOne({ _id: orderId, customerId });
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Check if order is delivered
        if (order.status !== 'delivered') {
            return res.status(400).json({ message: 'You can only review delivered orders' });
        }

        // For meal reviews, verify meal was in the order
        if (reviewType === 'meal') {
            const mealInOrder = order.items.some(item => item.mealId.toString() === mealId);
            if (!mealInOrder) {
                return res.status(400).json({ message: 'This meal was not in your order' });
            }
        }

        // Check for duplicate reviews
        if (reviewType === 'meal') {
            const existingReview = await Review.findOne({ customerId, mealId });
            if (existingReview) {
                return res.status(400).json({ message: 'You have already reviewed this meal' });
            }
        } else {
            const existingReview = await Review.findOne({ customerId, cookId, reviewType: 'cook' });
            if (existingReview) {
                return res.status(400).json({ message: 'You have already reviewed this cook' });
            }
        }

        // Create review
        const review = new Review({
            customerId,
            cookId,
            orderId,
            mealId: reviewType === 'meal' ? mealId : null,
            rating,
            reviewText: reviewText || '',
            reviewType,
            aspects: analyzeAspects(reviewText),
        });

        await review.save();

        // Populate customer info for response
        await review.populate('customerId', 'name');

        res.status(201).json({
            message: 'Review submitted successfully',
            review,
        });
    } catch (error) {
        console.error('Submit review error:', error);
        res.status(500).json({ message: 'Failed to submit review', error: error.message });
    }
});

// Get reviews for a cook
router.get('/cook/:cookId', async (req, res) => {
    try {
        const { cookId } = req.params;

        const reviews = await Review.find({ cookId, reviewType: 'cook' })
            .populate('customerId', 'name')
            .sort({ createdAt: -1 });

        // Calculate average rating
        const totalReviews = reviews.length;
        const averageRating = totalReviews > 0
            ? reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews
            : 0;

        res.json({
            reviews,
            averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
            totalReviews,
        });
    } catch (error) {
        console.error('Get cook reviews error:', error);
        res.status(500).json({ message: 'Failed to fetch reviews', error: error.message });
    }
});

// Get reviews for a meal
router.get('/meal/:mealId', async (req, res) => {
    try {
        const { mealId } = req.params;

        const reviews = await Review.find({ mealId, reviewType: 'meal' })
            .populate('customerId', 'name')
            .sort({ createdAt: -1 });

        // Calculate average rating
        const totalReviews = reviews.length;
        const averageRating = totalReviews > 0
            ? reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews
            : 0;

        res.json({
            reviews,
            averageRating: Math.round(averageRating * 10) / 10,
            totalReviews,
        });
    } catch (error) {
        console.error('Get meal reviews error:', error);
        res.status(500).json({ message: 'Failed to fetch reviews', error: error.message });
    }
});

// Get customer's own reviews
router.get('/my-reviews', protect, async (req, res) => {
    try {
        const customerId = req.user._id;

        const reviews = await Review.find({ customerId })
            .populate('cookId', 'name')
            .populate('mealId', 'name')
            .sort({ createdAt: -1 });

        res.json({ reviews });
    } catch (error) {
        console.error('Get my reviews error:', error);
        res.status(500).json({ message: 'Failed to fetch reviews', error: error.message });
    }
});

// Check what can be reviewed for an order
router.get('/can-review/:orderId', protect, async (req, res) => {
    try {
        const { orderId } = req.params;
        const customerId = req.user._id;

        // Get order
        const order = await Order.findOne({ _id: orderId, customerId });
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        if (order.status !== 'delivered') {
            return res.json({
                canReviewCook: false,
                canReviewMeals: [],
                message: 'Order must be delivered to review',
            });
        }

        // Check if cook has been reviewed
        const cookReview = await Review.findOne({ customerId, cookId: order.cookId, reviewType: 'cook' });
        const canReviewCook = !cookReview;

        // Check which meals can be reviewed
        const canReviewMeals = await Promise.all(
            order.items.map(async (item) => {
                const mealReview = await Review.findOne({ customerId, mealId: item.mealId });
                return {
                    mealId: item.mealId,
                    mealName: item.name,
                    alreadyReviewed: !!mealReview,
                };
            })
        );

        res.json({
            canReviewCook,
            canReviewMeals,
            cookId: order.cookId,
        });
    } catch (error) {
        console.error('Can review check error:', error);
        res.status(500).json({ message: 'Failed to check review status', error: error.message });
    }
});

// Update a review
router.put('/:reviewId', protect, async (req, res) => {
    try {
        const { reviewId } = req.params;
        const { rating, reviewText } = req.body;
        const customerId = req.user._id;

        // Find review
        const review = await Review.findOne({ _id: reviewId, customerId });
        if (!review) {
            return res.status(404).json({ message: 'Review not found' });
        }

        // Validate rating if provided
        if (rating && (rating < 1 || rating > 5)) {
            return res.status(400).json({ message: 'Rating must be between 1 and 5' });
        }

        // Update fields
        if (rating) review.rating = rating;
        if (reviewText !== undefined) {
            review.reviewText = reviewText;
            review.aspects = analyzeAspects(reviewText);
        }

        await review.save();
        await review.populate('customerId', 'name');

        res.json({
            message: 'Review updated successfully',
            review,
        });
    } catch (error) {
        console.error('Update review error:', error);
        res.status(500).json({ message: 'Failed to update review', error: error.message });
    }
});

// Delete a review
router.delete('/:reviewId', protect, async (req, res) => {
    try {
        const { reviewId } = req.params;
        const customerId = req.user._id;

        const review = await Review.findOneAndDelete({ _id: reviewId, customerId });
        if (!review) {
            return res.status(404).json({ message: 'Review not found' });
        }

        res.json({ message: 'Review deleted successfully' });
    } catch (error) {
        console.error('Delete review error:', error);
        res.status(500).json({ message: 'Failed to delete review', error: error.message });
    }
});

// Check if customer can review a cook
router.get('/can-review-cook/:cookId', protect, async (req, res) => {
    try {
        const { cookId } = req.params;
        const customerId = req.user._id;

        // Check if already reviewed
        const existingReview = await Review.findOne({ customerId, cookId, reviewType: 'cook' });
        if (existingReview) {
            return res.json({
                canReview: false,
                hasOrdered: true,
                alreadyReviewed: true,
                message: 'You have already reviewed this cook'
            });
        }

        // Find any delivered order from this cook
        const deliveredOrder = await Order.findOne({
            customerId,
            cookId,
            status: 'delivered'
        }).sort({ createdAt: -1 });

        if (!deliveredOrder) {
            return res.json({
                canReview: false,
                hasOrdered: false,
                alreadyReviewed: false,
                message: 'Order from this cook to leave a review'
            });
        }

        res.json({
            canReview: true,
            hasOrdered: true,
            alreadyReviewed: false,
            eligibleOrderId: deliveredOrder._id,
            cookId
        });
    } catch (error) {
        console.error('Can review cook check error:', error);
        res.status(500).json({ message: 'Failed to check review eligibility', error: error.message });
    }
});

// Check if customer can review a meal
router.get('/can-review-meal/:mealId', protect, async (req, res) => {
    try {
        const { mealId } = req.params;
        const customerId = req.user._id;

        // Check if already reviewed
        const existingReview = await Review.findOne({ customerId, mealId });
        if (existingReview) {
            return res.json({
                canReview: false,
                hasOrdered: true,
                alreadyReviewed: true,
                message: 'You have already reviewed this meal'
            });
        }

        // Find any delivered order containing this meal
        const deliveredOrder = await Order.findOne({
            customerId,
            status: 'delivered',
            'items.mealId': mealId
        }).sort({ createdAt: -1 });

        if (!deliveredOrder) {
            return res.json({
                canReview: false,
                hasOrdered: false,
                alreadyReviewed: false,
                message: 'Order this meal to leave a review'
            });
        }

        res.json({
            canReview: true,
            hasOrdered: true,
            alreadyReviewed: false,
            eligibleOrderId: deliveredOrder._id,
            cookId: deliveredOrder.cookId,
            mealId
        });
    } catch (error) {
        console.error('Can review meal check error:', error);
        res.status(500).json({ message: 'Failed to check review eligibility', error: error.message });
    }
});

// Get ABSA (Aspect-Based Sentiment Analysis) summary for a cook
router.get('/cook/:cookId/absa', absaLimiter, async (req, res) => {
    try {
        const { cookId } = req.params;

        const reviews = await Review.find({ cookId, reviewType: 'cook' }).select('aspects');
        const aspectSummary = buildAbsaSummary(reviews);

        res.json({ aspectSummary });
    } catch (error) {
        console.error('Get cook ABSA error:', error);
        res.status(500).json({ message: 'Failed to fetch ABSA summary', error: error.message });
    }
});

export default router;
