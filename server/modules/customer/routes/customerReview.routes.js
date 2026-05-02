import express from 'express';
import Review from '../../../shared/models/review.model.js';
import { Order } from '../../../shared/models/order.model.js';
import { protect } from '../../../shared/middleware/auth.js';
import { analyzeReview } from '../../../shared/services/absa.service.js';

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/customer/reviews
// Submit ONE unified review per order (new ABSA system)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', protect, async (req, res) => {
    try {
        const { orderId, cookId, rating, reviewText } = req.body;
        const customerId = req.user._id;

        if (!orderId || !cookId || !rating) {
            return res.status(400).json({ message: 'Missing required fields: orderId, cookId, rating' });
        }

        if (rating < 1 || rating > 5) {
            return res.status(400).json({ message: 'Rating must be between 1 and 5' });
        }

        if (!reviewText || reviewText.trim().length < 10) {
            return res.status(400).json({ message: 'Review text must be at least 10 characters' });
        }

        // Validate the order belongs to this customer
        const order = await Order.findOne({ _id: orderId, customerId });
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        if (order.status !== 'delivered') {
            return res.status(400).json({ message: 'You can only review delivered orders' });
        }

        // Enforce ONE review per order
        const existingReview = await Review.findOne({ customerId, orderId, reviewType: 'order' });
        if (existingReview) {
            return res.status(400).json({ message: 'You have already reviewed this order' });
        }

        // Run ABSA analysis
        let aspects = [];
        try {
            aspects = await analyzeReview(reviewText.trim());
        } catch (analysisError) {
            console.error('ABSA analysis failed, saving review without aspects:', analysisError.message);
        }

        const review = new Review({
            customerId,
            cookId,
            orderId,
            mealId: null,
            rating,
            reviewText: reviewText.trim(),
            reviewType: 'order',
            aspects
        });

        await review.save();
        await review.populate('customerId', 'name');

        res.status(201).json({
            message: 'Review submitted successfully',
            review,
        });
    } catch (error) {
        console.error('Submit review error:', error);

        if (error.code === 11000) {
            return res.status(400).json({ message: 'You have already reviewed this order' });
        }

        res.status(500).json({ message: 'Failed to submit review', error: error.message });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/customer/reviews/can-review/:orderId
// Check if customer can review this order (has not reviewed yet)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/can-review/:orderId', protect, async (req, res) => {
    try {
        const { orderId } = req.params;
        const customerId = req.user._id;

        const order = await Order.findOne({ _id: orderId, customerId });
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        if (order.status !== 'delivered') {
            return res.json({
                canReview: false,
                alreadyReviewed: false,
                message: 'Order must be delivered to review',
            });
        }

        const existingReview = await Review.findOne({ customerId, orderId, reviewType: 'order' });

        res.json({
            canReview: !existingReview,
            alreadyReviewed: !!existingReview,
            cookId: order.cookId,
            // Legacy fields kept for backward compatibility
            canReviewCook: !existingReview,
            canReviewMeals: order.items.map(item => ({
                mealId: item.mealId,
                mealName: item.name,
                alreadyReviewed: !!existingReview,
            })),
        });
    } catch (error) {
        console.error('Can review check error:', error);
        res.status(500).json({ message: 'Failed to check review status', error: error.message });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/customer/reviews/my-reviews
// Get customer's own reviews
// ─────────────────────────────────────────────────────────────────────────────
router.get('/my-reviews', protect, async (req, res) => {
    try {
        const customerId = req.user._id;

        const reviews = await Review.find({ customerId })
            .populate('cookId', 'name')
            .sort({ createdAt: -1 });

        res.json({ reviews });
    } catch (error) {
        console.error('Get my reviews error:', error);
        res.status(500).json({ message: 'Failed to fetch reviews', error: error.message });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/customer/reviews/cook/:cookId
// Get all reviews for a cook (public)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/cook/:cookId', async (req, res) => {
    try {
        const { cookId } = req.params;

        // Fetch both new unified reviews and legacy cook reviews
        const reviews = await Review.find({
            cookId,
            reviewType: { $in: ['order', 'cook'] }
        })
            .populate('customerId', 'name')
            .sort({ createdAt: -1 });

        const totalReviews = reviews.length;
        const averageRating = totalReviews > 0
            ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
            : 0;

        res.json({
            reviews,
            averageRating: Math.round(averageRating * 10) / 10,
            totalReviews,
        });
    } catch (error) {
        console.error('Get cook reviews error:', error);
        res.status(500).json({ message: 'Failed to fetch reviews', error: error.message });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/customer/reviews/meal/:mealId
// Get all reviews mentioning a specific meal (via ABSA aspects)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/meal/:mealId', async (req, res) => {
    try {
        const { mealId } = req.params;

        // Legacy meal reviews
        const reviews = await Review.find({ mealId, reviewType: 'meal' })
            .populate('customerId', 'name')
            .sort({ createdAt: -1 });

        const totalReviews = reviews.length;
        const averageRating = totalReviews > 0
            ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
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

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/customer/reviews/:reviewId
// Update a review (re-runs ABSA)
// ─────────────────────────────────────────────────────────────────────────────
router.put('/:reviewId', protect, async (req, res) => {
    try {
        const { reviewId } = req.params;
        const { rating, reviewText } = req.body;
        const customerId = req.user._id;

        const review = await Review.findOne({ _id: reviewId, customerId });
        if (!review) {
            return res.status(404).json({ message: 'Review not found' });
        }

        if (rating && (rating < 1 || rating > 5)) {
            return res.status(400).json({ message: 'Rating must be between 1 and 5' });
        }

        if (rating) review.rating = rating;
        if (reviewText !== undefined) {
            review.reviewText = reviewText;
            if (reviewText && reviewText.trim().length > 0) {
                review.aspects = await analyzeReview(reviewText.trim());
            } else {
                review.aspects = [];
            }
        }

        await review.save();
        await review.populate('customerId', 'name');

        res.json({ message: 'Review updated successfully', review });
    } catch (error) {
        console.error('Update review error:', error);
        res.status(500).json({ message: 'Failed to update review', error: error.message });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/customer/reviews/:reviewId
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// Legacy endpoints kept for backward compatibility
// ─────────────────────────────────────────────────────────────────────────────

router.get('/can-review-cook/:cookId', protect, async (req, res) => {
    try {
        const { cookId } = req.params;
        const customerId = req.user._id;

        const deliveredOrders = await Order.find({ customerId, cookId, status: 'delivered' }).sort({ createdAt: 1 });

        if (!deliveredOrders.length) {
            return res.json({ canReview: false, hasOrdered: false, eligibleOrders: [], message: 'Order from this cook to leave a review' });
        }

        const reviewedOrderIds = await Review.distinct('orderId', { customerId, cookId, reviewType: { $in: ['order', 'cook'] } });
        const reviewedSet = new Set(reviewedOrderIds.map(id => id.toString()));

        const eligibleOrders = deliveredOrders
            .filter(o => !reviewedSet.has(o._id.toString()))
            .map(o => ({ orderId: o._id, orderNumber: o.orderNumber, createdAt: o.createdAt, totalAmount: o.totalAmount }));

        if (!eligibleOrders.length) {
            return res.json({ canReview: false, hasOrdered: true, eligibleOrders: [], message: 'You have already reviewed all orders from this cook' });
        }

        res.json({ canReview: true, hasOrdered: true, eligibleOrders, eligibleOrderId: eligibleOrders[0].orderId, cookId });
    } catch (error) {
        console.error('Can review cook check error:', error);
        res.status(500).json({ message: 'Failed to check review eligibility', error: error.message });
    }
});

router.get('/can-review-meal/:mealId', protect, async (req, res) => {
    try {
        const { mealId } = req.params;
        const customerId = req.user._id;

        const deliveredOrders = await Order.find({ customerId, status: 'delivered', 'items.mealId': mealId }).sort({ createdAt: 1 });

        if (!deliveredOrders.length) {
            return res.json({ canReview: false, hasOrdered: false, eligibleOrders: [], message: 'Order this meal to leave a review' });
        }

        const reviewedOrderIds = await Review.distinct('orderId', { customerId, reviewType: { $in: ['order', 'meal'] } });
        const reviewedSet = new Set(reviewedOrderIds.map(id => id.toString()));

        const eligibleOrders = deliveredOrders
            .filter(o => !reviewedSet.has(o._id.toString()))
            .map(o => ({ orderId: o._id, orderNumber: o.orderNumber, createdAt: o.createdAt, totalAmount: o.totalAmount, cookId: o.cookId }));

        if (!eligibleOrders.length) {
            return res.json({ canReview: false, hasOrdered: true, eligibleOrders: [], message: 'You have already reviewed all orders containing this meal' });
        }

        res.json({ canReview: true, hasOrdered: true, eligibleOrders, eligibleOrderId: eligibleOrders[0].orderId, cookId: eligibleOrders[0].cookId, mealId });
    } catch (error) {
        console.error('Can review meal check error:', error);
        res.status(500).json({ message: 'Failed to check review eligibility', error: error.message });
    }
});

export default router;
