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
        mealId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'CookMeal',
            default: null, // null for cook reviews, set for meal reviews
        },
        rating: {
            type: Number,
            required: true,
            min: 1,
            max: 5,
        },
        reviewText: {
            type: String,
            maxlength: 500,
            default: '',
        },
        reviewType: {
            type: String,
            enum: ['cook', 'meal'],
            required: true,
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
reviewSchema.index({ customerId: 1, orderId: 1 });

// Ensure one review per customer per meal
reviewSchema.index(
    { customerId: 1, mealId: 1 },
    { unique: true, sparse: true, partialFilterExpression: { mealId: { $ne: null } } }
);

// Ensure one cook review per customer per cook per order
reviewSchema.index(
    { customerId: 1, cookId: 1, reviewType: 1 },
    { unique: true, partialFilterExpression: { reviewType: 'cook' } }
);

const Review = mongoose.model('Review', reviewSchema);

export default Review;
