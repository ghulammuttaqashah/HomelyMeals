// modules/customer/routes/customerAnalytics.routes.js
import express from 'express';
import Review from '../../../shared/models/review.model.js';
import CookMeal from '../../cook/models/cookMeal.model.js';
import { calculateAnalytics } from '../../../shared/services/absa.service.js';

const router = express.Router();

// Get analytics for a specific cook (public)
router.get('/cook/:cookId', async (req, res) => {
    try {
        const { cookId } = req.params;
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

// Get reviews by keyword for a specific cook
router.get('/cook/:cookId/reviews/:aspect/:sentiment/:keyword', async (req, res) => {
    try {
        const { cookId, aspect, sentiment, keyword } = req.params;

        // Find reviews with matching aspect, sentiment, and keyword
        const reviews = await Review.find({
            cookId,
            reviewType: 'cook',
            'aspects': {
                $elemMatch: {
                    aspect: aspect,
                    sentiment: { $regex: new RegExp(`^${sentiment}$`, 'i') },
                    keywords: { $in: [new RegExp(keyword, 'i')] }
                }
            }
        })
        .populate('customerId', 'name')
        .sort({ createdAt: -1 })
        .limit(50);

        res.json({ reviews });
    } catch (error) {
        console.error('Get reviews by keyword error:', error);
        res.status(500).json({ message: 'Failed to fetch reviews', error: error.message });
    }
});

// Get analytics for a specific meal (public)
router.get('/meal/:mealId', async (req, res) => {
    try {
        const { mealId } = req.params;
        const { days } = req.query;

        // Build query
        const query = { mealId, reviewType: 'meal' };

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

// Get reviews by keyword for a specific meal
router.get('/meal/:mealId/reviews/:aspect/:sentiment/:keyword', async (req, res) => {
    try {
        const { mealId, aspect, sentiment, keyword } = req.params;

        // Find reviews with matching aspect, sentiment, and keyword
        const reviews = await Review.find({
            mealId,
            reviewType: 'meal',
            'aspects': {
                $elemMatch: {
                    aspect: aspect,
                    sentiment: { $regex: new RegExp(`^${sentiment}$`, 'i') },
                    keywords: { $in: [new RegExp(keyword, 'i')] }
                }
            }
        })
        .populate('customerId', 'name')
        .sort({ createdAt: -1 })
        .limit(50);

        res.json({ reviews });
    } catch (error) {
        console.error('Get reviews by keyword error:', error);
        res.status(500).json({ message: 'Failed to fetch reviews', error: error.message });
    }
});

// Smart meal recommendations with ABSA filtering (for chatbot)
router.get('/recommendations', async (req, res) => {
    try {
        const { food, maxPrice, minRating, preference } = req.query;

        // Build meal query
        const mealQuery = { availability: 'Available' };
        
        // Filter by food name (if provided)
        if (food) {
            mealQuery.name = { $regex: new RegExp(food, 'i') };
        }

        // Filter by price (if provided)
        if (maxPrice) {
            mealQuery.price = { $lte: parseInt(maxPrice) };
        }

        // Fetch meals
        let meals = await CookMeal.find(mealQuery)
            .populate('cookId', 'name')
            .lean();

        if (meals.length === 0) {
            return res.json({ meals: [], message: 'No meals found matching your criteria' });
        }

        // Fetch reviews for each meal and calculate sentiment scores
        const mealsWithScores = await Promise.all(
            meals.map(async (meal) => {
                const reviews = await Review.find({ 
                    mealId: meal._id, 
                    reviewType: 'meal' 
                });

                // Extract cook info before processing
                const cookId = meal.cookId?._id || meal.cookId;
                const cookName = meal.cookId?.name || 'Unknown Cook';

                if (reviews.length === 0) {
                    return {
                        ...meal,
                        cookId: cookId,
                        cookName: cookName,
                        averageRating: 0,
                        reviewCount: 0,
                        sentimentScore: 0,
                        positivePercentage: 0,
                        rankScore: 0
                    };
                }

                // Calculate analytics
                const analytics = calculateAnalytics(reviews);
                
                // Calculate sentiment score (positive aspects / total aspects)
                let totalPositive = 0;
                let totalNegative = 0;
                
                analytics.aspects.forEach(aspect => {
                    totalPositive += aspect.positive;
                    totalNegative += aspect.negative;
                });

                const totalAspects = totalPositive + totalNegative;
                const positivePercentage = totalAspects > 0 
                    ? (totalPositive / totalAspects) * 100 
                    : 0;

                // Sentiment score (0-5 scale based on positive percentage)
                const sentimentScore = (positivePercentage / 100) * 5;

                // Calculate rank score: (rating * 0.4) + (sentiment * 0.4) + (price match * 0.2)
                const ratingScore = analytics.averageRating * 0.4;
                const sentimentWeight = sentimentScore * 0.4;
                
                // Price match score (cheaper is better if preference is 'cheap')
                let priceScore = 0;
                if (preference === 'cheap') {
                    const maxPriceValue = maxPrice ? parseInt(maxPrice) : 500;
                    priceScore = ((maxPriceValue - meal.price) / maxPriceValue) * 1; // 0-1 scale
                } else {
                    priceScore = 0.5; // neutral
                }

                const rankScore = ratingScore + sentimentWeight + priceScore;

                return {
                    ...meal,
                    cookId: cookId,
                    cookName: cookName,
                    averageRating: analytics.averageRating,
                    reviewCount: reviews.length,
                    sentimentScore: Math.round(sentimentScore * 10) / 10,
                    positivePercentage: Math.round(positivePercentage),
                    rankScore: Math.round(rankScore * 100) / 100
                };
            })
        );

        // Filter by minimum rating (if provided)
        let filteredMeals = mealsWithScores;
        if (minRating) {
            filteredMeals = mealsWithScores.filter(
                meal => meal.averageRating >= parseFloat(minRating)
            );
        }

        // Filter by positive sentiment (at least 60% positive for quality recommendations)
        filteredMeals = filteredMeals.filter(
            meal => meal.reviewCount === 0 || meal.positivePercentage >= 60
        );

        // Sort by rank score (highest first)
        filteredMeals.sort((a, b) => b.rankScore - a.rankScore);

        // Return top 20 recommendations (increased from 5 for better variety)
        const recommendations = filteredMeals.slice(0, 20);

        res.json({ 
            meals: recommendations,
            total: recommendations.length,
            message: recommendations.length > 0 
                ? 'Recommendations found' 
                : 'No meals found with positive sentiment'
        });

    } catch (error) {
        console.error('Get recommendations error:', error);
        res.status(500).json({ message: 'Failed to fetch recommendations', error: error.message });
    }
});

export default router;
