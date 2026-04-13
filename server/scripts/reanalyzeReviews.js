// Script to re-analyze existing reviews with ABSA
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Review from '../shared/models/review.model.js';
import { analyzeReview } from '../shared/services/absa.service.js';

// Load environment variables
dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

const reanalyzeAllReviews = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // Find all reviews with text but no aspects
        const reviews = await Review.find({
            reviewText: { $exists: true, $ne: '' },
            $or: [
                { aspects: { $exists: false } },
                { aspects: { $size: 0 } }
            ]
        });

        console.log(`📊 Found ${reviews.length} reviews to re-analyze`);

        let successCount = 0;
        let errorCount = 0;

        for (const review of reviews) {
            try {
                console.log(`\n🔍 Analyzing review ${review._id}...`);
                console.log(`   Type: ${review.reviewType}`);
                console.log(`   Text: "${review.reviewText.substring(0, 50)}..."`);

                // Analyze the review
                const aspects = await analyzeReview(review.reviewText, review.reviewType);

                // Update the review
                review.aspects = aspects;
                await review.save();

                console.log(`✅ Success! Found ${aspects.length} aspects`);
                aspects.forEach(a => {
                    console.log(`   - ${a.aspect}: ${a.sentiment} (${a.keywords.join(', ')})`);
                });

                successCount++;
            } catch (error) {
                console.error(`❌ Error analyzing review ${review._id}:`, error.message);
                errorCount++;
            }

            // Add delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        console.log(`\n📊 Summary:`);
        console.log(`   ✅ Successfully analyzed: ${successCount}`);
        console.log(`   ❌ Errors: ${errorCount}`);
        console.log(`   📝 Total: ${reviews.length}`);

    } catch (error) {
        console.error('❌ Script error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n👋 Disconnected from MongoDB');
        process.exit(0);
    }
};

// Run the script
reanalyzeAllReviews();
