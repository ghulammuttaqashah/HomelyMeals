import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
    {
        customerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Customer',
            required: true,
        },
        cookId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Cook',
            required: true,
        },
        orderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Order',
            required: true,
        },
        // mealId kept for backward compatibility with old meal-specific reviews
        mealId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'CookMeal',
            default: null,
        },
        rating: {
            type: Number,
            required: true,
            min: 1,
            max: 5,
        },
        reviewText: {
            type: String,
            maxlength: 1000,
            default: '',
        },
        // reviewType: 'order' for new unified reviews; 'cook'/'meal' for legacy
        reviewType: {
            type: String,
            enum: ['cook', 'meal', 'order'],
            required: true,
            default: 'order',
        },
        // New ABSA aspects schema: each aspect has target, category, aspect, sentiment, text
        aspects: {
            type: [{
                target: {
                    type: String,
                    enum: ['meal', 'cook'],
                    required: true
                },
                category: {
                    type: String,
                    required: true
                },
                aspect: {
                    type: String,
                    required: true
                },
                sentiment: {
                    type: String,
                    enum: ['positive', 'negative', 'Positive', 'Negative', 'Neutral', 'neutral'],
                    required: true
                },
                text: {
                    type: String,
                    default: ''
                },
                // Legacy fields kept for backward compatibility
                keywords: [String],
                reason: String
            }],
            default: []
        },
        isRead: {
            type: Boolean,
            default: false
        },
    },
    {
        timestamps: true,
    }
);

// Indexes for efficient queries
reviewSchema.index({ cookId: 1, reviewType: 1 });
reviewSchema.index({ mealId: 1 });
reviewSchema.index({ customerId: 1, cookId: 1, mealId: 1 });
reviewSchema.index({ orderId: 1, reviewType: 1 });

// ONE review per order (for new unified 'order' type reviews)
reviewSchema.index(
    { customerId: 1, orderId: 1, reviewType: 1 },
    {
        unique: true,
        partialFilterExpression: { reviewType: 'order' }
    }
);

// Legacy: one meal review per order
reviewSchema.index(
    { customerId: 1, orderId: 1, mealId: 1 },
    { unique: true, sparse: true, partialFilterExpression: { mealId: { $ne: null }, reviewType: 'meal' } }
);

// Legacy: one cook review per order
reviewSchema.index(
    { customerId: 1, orderId: 1 },
    { unique: true, partialFilterExpression: { reviewType: 'cook' } }
);

const Review = mongoose.model('Review', reviewSchema);

export default Review;
