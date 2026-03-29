/**
 * Aspect-Based Sentiment Analysis (ABSA) utility for HomelyMeals reviews.
 *
 * Detects food-delivery-relevant aspects in review text (food quality,
 * delivery, packaging, quantity, value, service) and classifies each
 * detected aspect as positive, negative, or neutral.
 */

// ---------------------------------------------------------------------------
// Aspect definitions
// ---------------------------------------------------------------------------
const ASPECTS = {
    food_quality: {
        label: 'Food Quality',
        keywords: [
            'taste', 'tasty', 'delicious', 'yummy', 'bland', 'stale', 'fresh',
            'flavor', 'flavour', 'spicy', 'sweet', 'sour', 'salty', 'raw',
            'quality', 'food', 'meal', 'dish', 'item', 'cooked', 'overcooked',
            'undercooked', 'burned', 'burnt', 'soggy', 'crispy', 'hot', 'cold',
        ],
    },
    delivery: {
        label: 'Delivery',
        keywords: [
            'deliver', 'delivery', 'late', 'early', 'fast', 'quick', 'slow',
            'on time', 'ontime', 'delay', 'delayed', 'arrived', 'arrival',
        ],
    },
    packaging: {
        label: 'Packaging',
        keywords: [
            'packag', 'pack', 'wrap', 'container', 'box', 'spill', 'spilled',
            'leak', 'leaked', 'sealed', 'clean', 'dirty',
        ],
    },
    quantity: {
        label: 'Quantity',
        keywords: [
            'portion', 'quantity', 'amount', 'enough', 'generous', 'less',
            'more', 'size', 'serving', 'big', 'large', 'small', 'tiny',
        ],
    },
    value: {
        label: 'Value for Money',
        keywords: [
            'price', 'cost', 'expensive', 'cheap', 'affordable', 'value',
            'worth', 'money', 'pricey', 'overpriced', 'reasonable',
        ],
    },
    service: {
        label: 'Service',
        keywords: [
            'service', 'friendly', 'rude', 'helpful', 'professional',
            'response', 'responsive', 'courteous', 'polite', 'attitude',
            'behavior', 'behaviour', 'kind', 'communicate', 'communication',
        ],
    },
};

// ---------------------------------------------------------------------------
// Sentiment word lists
// ---------------------------------------------------------------------------
const POSITIVE_WORDS = new Set([
    'good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love',
    'loved', 'liked', 'best', 'perfect', 'awesome', 'outstanding', 'superb',
    'brilliant', 'exceptional', 'nice', 'delicious', 'tasty', 'yummy', 'fresh',
    'fast', 'quick', 'affordable', 'generous', 'helpful', 'friendly',
    'professional', 'courteous', 'polite', 'clean', 'hot', 'warm', 'sealed',
    'worth', 'recommend', 'satisfied', 'happy', 'impressed', 'reasonable',
    'kind', 'sweet', 'crispy', 'on time', 'ontime', 'early',
]);

const NEGATIVE_WORDS = new Set([
    'bad', 'terrible', 'awful', 'horrible', 'worst', 'hate', 'hated',
    'disliked', 'poor', 'disappointing', 'disappointed', 'disgusting', 'rude',
    'slow', 'late', 'cold', 'stale', 'bland', 'overpriced', 'expensive',
    'pricey', 'small', 'tiny', 'less', 'spilled', 'leaked', 'unsealed',
    'delay', 'delayed', 'unhelpful', 'unprofessional', 'raw', 'burned',
    'burnt', 'soggy', 'dirty', 'wrong', 'missing', 'broken', 'damaged',
    'not', 'never', 'no', 'undercooked', 'overcooked',
]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Score sentiment of a short text fragment.
 * @param {string} text
 * @returns {'positive'|'negative'|'neutral'}
 */
function scoreSentiment(text) {
    const words = text.toLowerCase().split(/\W+/);
    let pos = 0;
    let neg = 0;
    for (const word of words) {
        if (POSITIVE_WORDS.has(word)) pos++;
        if (NEGATIVE_WORDS.has(word)) neg++;
    }
    if (pos > neg) return 'positive';
    if (neg > pos) return 'negative';
    return 'neutral';
}

// Minimum review text length required before running analysis
const MIN_REVIEW_LENGTH = 5;

/**
 * Perform aspect-based sentiment analysis on a review text.
 *
 * @param {string} reviewText
 * @returns {Array<{aspect: string, label: string, sentiment: 'positive'|'negative'|'neutral'}>}
 */
export function analyzeAspects(reviewText) {
    if (!reviewText || reviewText.trim().length < MIN_REVIEW_LENGTH) return [];

    const lowerText = reviewText.toLowerCase();
    const detected = [];

    for (const [aspectKey, aspectInfo] of Object.entries(ASPECTS)) {
        const triggered = aspectInfo.keywords.some(kw => lowerText.includes(kw));
        if (!triggered) continue;

        // Isolate sentences that mention this aspect for targeted scoring
        const sentences = reviewText.split(/(?<=[.!?])\s+/);
        const relevant = sentences.filter(s =>
            aspectInfo.keywords.some(kw => s.toLowerCase().includes(kw))
        );
        const sentimentText = relevant.length > 0 ? relevant.join(' ') : reviewText;

        detected.push({
            aspect: aspectKey,
            label: aspectInfo.label,
            sentiment: scoreSentiment(sentimentText),
        });
    }

    return detected;
}

/**
 * Build an aggregate ABSA summary from an array of Review documents.
 *
 * @param {Array} reviews - Mongoose Review documents with an `aspects` field
 * @returns {Array<{aspect, label, positive, negative, neutral, total, positivePercent, negativePercent, neutralPercent}>}
 */
export function buildAbsaSummary(reviews) {
    const tally = {};

    for (const review of reviews) {
        if (!Array.isArray(review.aspects)) continue;
        for (const { aspect, label, sentiment } of review.aspects) {
            if (!tally[aspect]) {
                tally[aspect] = { label, positive: 0, negative: 0, neutral: 0, total: 0 };
            }
            tally[aspect][sentiment]++;
            tally[aspect].total++;
        }
    }

    return Object.entries(tally).map(([aspect, data]) => {
        // Use largest-remainder rounding so percentages always sum to 100
        const raw = [
            (data.positive / data.total) * 100,
            (data.negative / data.total) * 100,
            (data.neutral / data.total) * 100,
        ];
        const floored = raw.map(Math.floor);
        const remainders = raw.map((v, i) => ({ i, r: v - floored[i] }));
        let leftover = 100 - floored.reduce((a, b) => a + b, 0);
        remainders.sort((a, b) => b.r - a.r);
        for (let k = 0; k < leftover; k++) floored[remainders[k].i]++;

        return {
            aspect,
            label: data.label,
            positive: data.positive,
            negative: data.negative,
            neutral: data.neutral,
            total: data.total,
            positivePercent: floored[0],
            negativePercent: floored[1],
            neutralPercent: floored[2],
        };
    });
}
