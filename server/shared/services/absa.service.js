// shared/services/absa.service.js
import Groq from 'groq-sdk';
import { GROQ_API_KEY } from '../config/env.js';

const groq = new Groq({ apiKey: GROQ_API_KEY });

/**
 * Perform Aspect-Based Sentiment Analysis on a unified order review.
 * Extracts aspects for BOTH meal and cook from a single free-text review.
 * @param {string} reviewText - The review text to analyze
 * @returns {Promise<Array>} Array of aspect objects
 */
export const analyzeReview = async (reviewText) => {
    try {
        if (!reviewText || reviewText.trim().length === 0) {
            return [];
        }

        const prompt = `You are an Aspect-Based Sentiment Analysis (ABSA) system for a food delivery platform.

Analyze the following customer review and extract ALL aspects mentioned. Each aspect must be classified with:
- "target": either "meal" or "cook"
- "category": one of the STANDARDIZED categories below
- "aspect": a short normalized label (2-3 words max)
- "sentiment": either "positive" or "negative"
- "text": the exact phrase from the review that supports this aspect

STANDARDIZED CATEGORIES:
For target "meal": Taste, Food Quality, Packaging, Quantity, Price
For target "cook": Behavior, Professionalism, Communication, Hygiene, Timeliness

NORMALIZATION RULES:
- tasty / yummy / delicious / flavorful → category: Taste, aspect: "Tasty"
- bland / tasteless / bad taste → category: Taste, aspect: "Bland"
- rude / impolite / disrespectful → category: Behavior, aspect: "Rude"
- polite / friendly / nice → category: Behavior, aspect: "Polite"
- bad packaging / broken packaging / spilled → category: Packaging, aspect: "Bad Packaging"
- good packaging / well packed / sealed → category: Packaging, aspect: "Good Packaging"
- late / slow / delayed → category: Timeliness, aspect: "Late Delivery"
- fast / on time / quick → category: Timeliness, aspect: "On Time"
- small portion / less food / not enough → category: Quantity, aspect: "Small Portion"
- large portion / generous / filling → category: Quantity, aspect: "Large Portion"
- expensive / overpriced → category: Price, aspect: "Overpriced"
- cheap / affordable / good value → category: Price, aspect: "Good Value"
- fresh / hot / warm → category: Food Quality, aspect: "Fresh"
- stale / cold / old → category: Food Quality, aspect: "Stale"
- unhygienic / dirty / unclean → category: Hygiene, aspect: "Unhygienic"
- clean / hygienic → category: Hygiene, aspect: "Hygienic"
- professional / skilled → category: Professionalism, aspect: "Professional"
- unprofessional / careless → category: Professionalism, aspect: "Unprofessional"
- responsive / communicative → category: Communication, aspect: "Responsive"
- unresponsive / no reply → category: Communication, aspect: "Unresponsive"

IMPORTANT RULES:
- Return ONLY valid JSON, no explanations, no markdown, no <think> tags
- Extract ALL aspects mentioned, even if multiple aspects share the same category
- If the review mentions the rider/delivery person, classify as target "cook"
- If no aspects can be extracted, return {"aspects": []}

Return this exact JSON format:
{
  "aspects": [
    {
      "target": "meal",
      "category": "Taste",
      "aspect": "Tasty",
      "sentiment": "positive",
      "text": "food was tasty"
    }
  ]
}

Review to analyze:
"${reviewText}"`;

        const response = await groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: [
                { role: 'system', content: 'You are an ABSA system. Return only valid JSON with no extra text.' },
                { role: 'user', content: prompt }
            ],
            temperature: 0.1,
            max_tokens: 1500
        });

        let output = response.choices[0].message.content.trim();

        // Strip thinking tags if present
        if (output.includes('</think>')) {
            output = output.split('</think>')[1].trim();
        }

        // Strip markdown code blocks
        if (output.startsWith('```json')) {
            output = output.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        } else if (output.startsWith('```')) {
            output = output.replace(/```\n?/g, '').trim();
        }

        const result = JSON.parse(output);
        const aspects = result.aspects || [];

        // Validate and normalize each aspect
        const validTargets = ['meal', 'cook'];
        const validMealCategories = ['Taste', 'Food Quality', 'Packaging', 'Quantity', 'Price'];
        const validCookCategories = ['Behavior', 'Professionalism', 'Communication', 'Hygiene', 'Timeliness'];
        const validSentiments = ['positive', 'negative'];

        return aspects.filter(a =>
            a.target && validTargets.includes(a.target) &&
            a.category && a.aspect && a.sentiment &&
            validSentiments.includes(a.sentiment.toLowerCase()) &&
            (
                (a.target === 'meal' && validMealCategories.includes(a.category)) ||
                (a.target === 'cook' && validCookCategories.includes(a.category))
            )
        ).map(a => ({
            target: a.target,
            category: a.category,
            aspect: a.aspect,
            sentiment: a.sentiment.toLowerCase(),
            text: a.text || ''
        }));

    } catch (error) {
        console.error('ABSA Analysis Error:', error.message);
        return [];
    }
};

/**
 * Calculate ABSA analytics for a set of reviews.
 * Returns data structured for the drill-down UI:
 * Sentiment → Category → Aspect (with review texts for tooltip)
 *
 * @param {Array} reviews - Array of review documents
 * @param {string} targetFilter - 'meal' | 'cook' | null (filter by target)
 * @returns {Object} Analytics data
 */
export const calculateAnalytics = (reviews, targetFilter = null) => {
    if (!reviews || reviews.length === 0) {
        return {
            totalReviews: 0,
            averageRating: 0,
            sentiments: { positive: 0, negative: 0 },
            categories: [],
            aspects: []
        };
    }

    const totalReviews = reviews.length;
    const averageRating = reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews;

    // Collect all aspects, optionally filtered by target
    const allAspects = [];
    reviews.forEach(review => {
        if (!review.aspects || review.aspects.length === 0) return;
        review.aspects.forEach(aspect => {
            if (targetFilter && aspect.target !== targetFilter) return;
            // Convert Mongoose subdocument to plain object to avoid getter issues
            const plainAspect = aspect.toObject ? aspect.toObject() : { ...aspect };
            allAspects.push({
                ...plainAspect,
                reviewText: review.reviewText,
                reviewId: review._id
            });
        });
    });

    // Level 1: Sentiment counts
    const sentiments = {
        positive: allAspects.filter(a => (a.sentiment || '').toLowerCase() === 'positive').length,
        negative: allAspects.filter(a => (a.sentiment || '').toLowerCase() === 'negative').length
    };

    // Level 2: Category breakdown per sentiment
    // Structure: { positive: { Taste: { count, aspects: { Tasty: [texts] } } }, negative: {...} }
    const categoryMap = { positive: {}, negative: {} };

    allAspects.forEach(aspect => {
        const sentiment = (aspect.sentiment || '').toLowerCase(); // normalize to 'positive'/'negative'
        const category = aspect.category;
        const aspectName = aspect.aspect;
        const text = aspect.text || '';

        // Skip if sentiment is not positive or negative
        if (sentiment !== 'positive' && sentiment !== 'negative') return;

        if (!categoryMap[sentiment][category]) {
            categoryMap[sentiment][category] = { count: 0, aspects: {} };
        }
        categoryMap[sentiment][category].count++;

        if (!categoryMap[sentiment][category].aspects[aspectName]) {
            categoryMap[sentiment][category].aspects[aspectName] = { count: 0, texts: [] };
        }
        categoryMap[sentiment][category].aspects[aspectName].count++;
        // Store the full review text for the hover tooltip (deduplicated)
        const fullReviewText = aspect.reviewText || text || '';
        if (fullReviewText) {
            if (!categoryMap[sentiment][category].aspects[aspectName].texts.includes(fullReviewText)) {
                categoryMap[sentiment][category].aspects[aspectName].texts.push(fullReviewText);
            }
        }
    });

    // Convert to arrays for frontend consumption
    const buildCategoryArray = (sentimentData) => {
        return Object.entries(sentimentData)
            .map(([name, data]) => ({
                name,
                count: data.count,
                aspects: Object.entries(data.aspects)
                    .map(([aspectName, aspectData]) => ({
                        name: aspectName,
                        count: aspectData.count,
                        texts: aspectData.texts
                    }))
                    .sort((a, b) => b.count - a.count)
            }))
            .sort((a, b) => b.count - a.count);
    };

    const categories = {
        positive: buildCategoryArray(categoryMap.positive),
        negative: buildCategoryArray(categoryMap.negative)
    };

    // Legacy flat aspects array (for backward compatibility with cook ReviewAnalytics component)
    const legacyAspectMap = new Map();
    allAspects.forEach(aspect => {
        const key = aspect.category;
        const sentiment = (aspect.sentiment || '').toLowerCase();
        if (!legacyAspectMap.has(key)) {
            legacyAspectMap.set(key, { positive: 0, negative: 0, positiveKeywords: new Map(), negativeKeywords: new Map() });
        }
        const data = legacyAspectMap.get(key);
        if (sentiment === 'positive') {
            data.positive++;
            const kw = aspect.aspect.toLowerCase();
            data.positiveKeywords.set(kw, (data.positiveKeywords.get(kw) || 0) + 1);
        } else if (sentiment === 'negative') {
            data.negative++;
            const kw = aspect.aspect.toLowerCase();
            data.negativeKeywords.set(kw, (data.negativeKeywords.get(kw) || 0) + 1);
        }
    });

    const legacyAspects = Array.from(legacyAspectMap.entries())
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
        .sort((a, b) => (b.positive + b.negative) - (a.positive + a.negative));

    return {
        totalReviews,
        averageRating: Math.round(averageRating * 10) / 10,
        sentiments,
        categories,
        aspects: legacyAspects, // backward compat
        keywords: [] // backward compat
    };
};
