// Admin route to re-analyze all reviews
import express from 'express';
import Review from '../../../shared/models/review.model.js';
import { analyzeReview } from '../../../shared/services/absa.service.js';

const router = express.Router();

// Re-analyze all reviews that have text but no aspects
router.post('/reanalyze-reviews', async (req, res) => {
    try {
        // Find reviews with text but no aspects
        const reviews = await Review.find({
            reviewText: { $exists: true, $ne: '' },
            $or: [
                { aspects: { $exists: false } },
                { aspects: { $size: 0 } }
            ]
        }).limit(50); // Process 50 at a time to avoid memory issues

        console.log(`📊 Found ${reviews.length} reviews to re-analyze`);

        const results = {
            total: reviews.length,
            success: 0,
            failed: 0,
            details: []
        };

        for (const review of reviews) {
            try {
                console.log(`🔍 Analyzing review ${review._id}...`);
                
                // Analyze the review
                const aspects = await analyzeReview(review.reviewText, review.reviewType);
                
                // Update the review
                review.aspects = aspects;
                await review.save();
                
                results.success++;
                results.details.push({
                    reviewId: review._id,
                    status: 'success',
                    aspectsFound: aspects.length
                });
                
                console.log(`✅ Success! Found ${aspects.length} aspects`);
                
                // Add delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 1000));
                
            } catch (error) {
                console.error(`❌ Error analyzing review ${review._id}:`, error.message);
                results.failed++;
                results.details.push({
                    reviewId: review._id,
                    status: 'failed',
                    error: error.message
                });
            }
        }

        res.json({
            message: 'Re-analysis complete',
            results
        });

    } catch (error) {
        console.error('Re-analyze error:', error);
        res.status(500).json({ 
            message: 'Failed to re-analyze reviews', 
            error: error.message 
        });
    }
});

export default router;
