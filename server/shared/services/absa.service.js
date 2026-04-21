// shared/services/absa.service.js
import Groq from 'groq-sdk';
import { GROQ_API_KEY } from '../config/env.js';

const groq = new Groq({ apiKey: GROQ_API_KEY });

/**
 * Perform Aspect-Based Sentiment Analysis on review text
 * @param {string} reviewText - The review text to analyze
 * @param {string} reviewType - 'meal' or 'cook'
 * @returns {Promise<Array>} Array of aspects with sentiment, keywords, and reason
 */
export const analyzeReview = async (reviewText, reviewType = 'meal') => {
    try {
        if (!reviewText || reviewText.trim().length === 0) {
            return [];
        }

        const aspectGuidelines = reviewType === 'meal'
            ? 'taste, freshness, packaging, portion, presentation, temperature, quality'
            : 'behavior, communication, punctuality, professionalism, responsiveness, hygiene';

        const prompt = `You are an Aspect-Based Sentiment Analysis system.

IMPORTANT:
- Return ONLY JSON
- No explanations
- No <think> tags

Analyze this ${reviewType} review and extract aspects related to: ${aspectGuidelines}

Format:
{
  "aspects": [
    {
      "aspect": "aspect_name",
      "sentiment": "Positive/Negative/Neutral",
      "keywords": ["word1", "word2"],
      "reason": "short explanation"
    }
  ]
}

Review:
"${reviewText}"`;

        const response = await groq.chat.completions.create({
            model: 'qwen/qwen3-32b',
            messages: [
                { role: 'system', content: 'Return only JSON.' },
                { role: 'user', content: prompt }
            ],
            temperature: 0,
            max_tokens: 1000
        });

        let output = response.choices[0].message.content.trim();

        // Clean up output - remove thinking tags if present
        if (output.includes('</think>')) {
            output = output.split('</think>')[1].trim();
        }

        // Remove markdown code blocks if present
        if (output.startsWith('```json')) {
            output = output.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        } else if (output.startsWith('```')) {
            output = output.replace(/```\n?/g, '').trim();
        }

        // Parse JSON
        const result = JSON.parse(output);
        return result.aspects || [];

    } catch (error) {
        console.error('ABSA Analysis Error:', error.message);
        // Return empty array on error - don't block review submission
        return [];
    }
};

/**
 * Calculate analytics for a set of reviews (Drill-down format)
 * @param {Array} reviews - Array of review documents
 * @returns {Object} Analytics data with aspects and keyword breakdown
 */
export const calculateAnalytics = (reviews) => {
    if (!reviews || reviews.length === 0) {
        return {
            aspects: [],
            averageRating: 0,
            totalReviews: 0
        };
    }

    // Calculate average rating
    const averageRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

    // Map to track aspects with keyword breakdown
    const aspectMap = new Map();

    reviews.forEach(review => {
        if (review.aspects && review.aspects.length > 0) {
            review.aspects.forEach(aspect => {
                const sentiment = aspect.sentiment.toLowerCase();
                
                // Skip neutral sentiments
                if (sentiment === 'neutral') return;

                // Initialize aspect if not exists
                if (!aspectMap.has(aspect.aspect)) {
                    aspectMap.set(aspect.aspect, {
                        positive: 0,
                        negative: 0,
                        positiveKeywords: new Map(),
                        negativeKeywords: new Map()
                    });
                }

                const aspectData = aspectMap.get(aspect.aspect);

                // Count sentiment
                if (sentiment === 'positive') {
                    aspectData.positive++;
                } else if (sentiment === 'negative') {
                    aspectData.negative++;
                }

                // Track keywords by sentiment
                if (aspect.keywords && Array.isArray(aspect.keywords)) {
                    const keywordMap = sentiment === 'positive' 
                        ? aspectData.positiveKeywords 
                        : aspectData.negativeKeywords;

                    aspect.keywords.forEach(keyword => {
                        const lowerKeyword = keyword.toLowerCase().trim();
                        if (lowerKeyword) {
                            keywordMap.set(lowerKeyword, (keywordMap.get(lowerKeyword) || 0) + 1);
                        }
                    });
                }
            });
        }
    });

    // Convert aspect map to array with keyword arrays
    const aspects = Array.from(aspectMap.entries())
        .map(([name, data]) => ({
            name,
            positive: data.positive,
            negative: data.negative,
            positiveKeywords: Array.from(data.positiveKeywords.entries())
                .map(([word, count]) => ({ word, count }))
                .sort((a, b) => b.count - a.count),
            negativeKeywords: Array.from(data.negativeKeywords.entries())
                .map(([word, count]) => ({ word, count }))
                .sort((a, b) => b.count - a.count)
        }))
        .filter(aspect => aspect.positive > 0 || aspect.negative > 0)
        .sort((a, b) => (b.positive + b.negative) - (a.positive + a.negative));

    return {
        aspects,
        averageRating: Math.round(averageRating),
        totalReviews: reviews.length
    };
};
