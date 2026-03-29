/**
 * Aspect-Based Sentiment Analysis (ABSA) utility
 *
 * Performs rule-based keyword matching to detect aspects mentioned
 * in review text and classify each as positive, negative, or neutral.
 *
 * Aspects tracked:
 *   food_quality   – taste, flavour, delicious, bland, …
 *   freshness      – fresh, stale, old, …
 *   presentation   – presentation, plating, looks, …
 *   value          – worth it, expensive, cheap, …
 *   delivery_speed – fast, slow, on time, late, …
 *   packaging      – packaging, well packed, spilled, …
 *   portion_size   – generous, small, tiny, large, filling, …
 *   service        – polite, rude, helpful, courteous, …
 */

/**
 * Test whether `text` contains `phrase` as a whole phrase using word
 * boundary matching.  Multi-word phrases (e.g. "fast delivery") are
 * matched as-is; single words are matched at word boundaries so that
 * "bad" does not trigger on "badminton".
 *
 * @param {string} text   - Lowercased source text.
 * @param {string} phrase - Keyword / phrase to search for.
 * @returns {boolean}
 */
const containsPhrase = (text, phrase) => {
  if (phrase.includes(" ")) {
    // Multi-word phrase: plain substring match is safe enough
    return text.includes(phrase);
  }
  // Single word: require word boundaries
  const re = new RegExp(`(?<![a-z])${phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![a-z])`, "i");
  return re.test(text);
};

const ASPECTS = {
  food_quality: {
    positive: [
      "delicious", "tasty", "yummy", "great taste", "great food", "amazing food",
      "wonderful food", "loved it", "loved the food", "fantastic", "excellent",
      "flavorful", "flavourful", "mouth watering", "mouthwatering", "savory",
      "savoury", "scrumptious", "finger licking", "perfect taste", "good food",
      "nice food", "nice taste", "good taste", "loved the taste", "enjoyed",
      "best food", "best meal", "superb", "outstanding", "incredible food",
    ],
    negative: [
      "bland", "tasteless", "bad food", "bad taste", "disgusting", "awful",
      "terrible food", "horrible", "not tasty", "not good", "not delicious",
      "no taste", "no flavor", "no flavour", "overcooked", "undercooked",
      "raw", "burnt", "too spicy", "too salty", "too sweet", "too bland",
      "unappetizing", "not enjoyable", "disappointed", "disappointing food",
    ],
  },

  freshness: {
    positive: [
      "fresh", "freshly made", "freshly cooked", "hot and fresh", "very fresh",
      "quite fresh", "smells fresh", "tasted fresh",
    ],
    negative: [
      "stale", "old", "not fresh", "smelled bad", "smelt bad", "smell bad",
      "rotten", "spoiled", "expired", "went bad", "not fresh at all",
    ],
  },

  presentation: {
    positive: [
      "nice presentation", "beautiful presentation", "great presentation",
      "well presented", "looks great", "looks amazing", "looks delicious",
      "nicely presented", "attractive", "appetizing", "appealing",
      "neat packaging", "good looking", "well plated", "plating was great",
    ],
    negative: [
      "bad presentation", "poor presentation", "ugly", "messy", "not attractive",
      "unappealing", "does not look good", "didn't look good",
    ],
  },

  value: {
    positive: [
      "worth it", "value for money", "great value", "affordable", "cheap",
      "reasonable price", "reasonable", "good price", "well priced", "budget",
      "cost effective", "cost-effective", "inexpensive", "pocket friendly",
      "pocket-friendly", "good deal", "great deal",
    ],
    negative: [
      "expensive", "overpriced", "too expensive", "not worth it", "costly",
      "pricey", "rip off", "rip-off", "not good value", "poor value",
      "waste of money",
    ],
  },

  delivery_speed: {
    positive: [
      "fast delivery", "quick delivery", "speedy delivery", "on time",
      "delivered on time", "arrived on time", "early delivery", "prompt",
      "very fast", "super fast", "lightning fast", "quick arrival",
    ],
    negative: [
      "late delivery", "delayed", "too late", "very late", "slow delivery",
      "took too long", "took forever", "long wait", "waited too long",
      "delivery was slow", "late", "not on time", "delay",
    ],
  },

  packaging: {
    positive: [
      "well packed", "well packaged", "good packaging", "nice packaging",
      "properly packed", "secured", "safe packaging", "packaging was great",
      "packaging was good", "neatly packed",
    ],
    negative: [
      "poorly packed", "bad packaging", "spilled", "leaked", "leaking",
      "open container", "food spilled", "packaging was bad", "not packed well",
      "packaging was poor",
    ],
  },

  portion_size: {
    positive: [
      "generous portion", "large portion", "good portion", "filling",
      "plenty", "sufficient", "enough food", "great quantity",
      "more than enough", "satisfying portion",
    ],
    negative: [
      "small portion", "tiny portion", "not enough", "not filling",
      "still hungry", "too little", "insufficient", "small quantity",
      "less food", "less quantity",
    ],
  },

  service: {
    positive: [
      "polite", "courteous", "friendly", "helpful", "great service",
      "good service", "excellent service", "professional", "responsive",
      "attentive", "kind", "cooperative", "wonderful service",
    ],
    negative: [
      "rude", "impolite", "unprofessional", "unhelpful", "bad service",
      "poor service", "terrible service", "not responsive", "ignored",
      "arrogant", "disrespectful",
    ],
  },
};

/**
 * Classify the overall sentiment of a text as positive, negative, or neutral.
 * Uses a simple positive/negative keyword count with word-boundary matching.
 *
 * @param {string} text
 * @returns {"positive"|"negative"|"neutral"}
 */
const classifyOverallSentiment = (text) => {
  const POSITIVE_WORDS = [
    "good", "great", "excellent", "amazing", "wonderful", "fantastic",
    "love", "loved", "like", "liked", "best", "perfect", "happy",
    "satisfied", "recommended", "recommend", "awesome", "superb",
    "outstanding", "brilliant", "delightful",
  ];
  const NEGATIVE_WORDS = [
    "bad", "terrible", "horrible", "awful", "worst", "hate", "hated",
    "dislike", "disliked", "disappointed", "disappointing", "poor",
    "unhappy", "dissatisfied", "never again", "waste", "disgusting",
  ];

  const lower = text.toLowerCase();
  let pos = 0;
  let neg = 0;

  POSITIVE_WORDS.forEach((w) => { if (containsPhrase(lower, w)) pos += 1; });
  NEGATIVE_WORDS.forEach((w) => { if (containsPhrase(lower, w)) neg += 1; });

  if (pos > neg) return "positive";
  if (neg > pos) return "negative";
  return "neutral";
};

/**
 * Analyse a review text and return per-aspect sentiment results.
 *
 * @param {string} reviewText - The raw review text from the customer.
 * @param {number} rating     - Star rating (1-5) used as a tie-breaker.
 * @returns {{
 *   aspects: Array<{ aspect: string, sentiment: "positive"|"negative"|"neutral", keywords: string[] }>,
 *   overallSentiment: "positive"|"negative"|"neutral"
 * }}
 */
export const analyzeReviewSentiment = (reviewText, rating = 3) => {
  if (!reviewText || reviewText.trim() === "") {
    // No text – derive overall sentiment from star rating alone
    const overallSentiment =
      rating >= 4 ? "positive" : rating <= 2 ? "negative" : "neutral";
    return { aspects: [], overallSentiment };
  }

  const lower = reviewText.toLowerCase();
  const detectedAspects = [];

  for (const [aspect, { positive, negative }] of Object.entries(ASPECTS)) {
    const matchedPositive = positive.filter((kw) => containsPhrase(lower, kw));
    const matchedNegative = negative.filter((kw) => containsPhrase(lower, kw));

    if (matchedPositive.length === 0 && matchedNegative.length === 0) {
      continue; // aspect not mentioned
    }

    let sentiment;
    if (matchedPositive.length > matchedNegative.length) {
      sentiment = "positive";
    } else if (matchedNegative.length > matchedPositive.length) {
      sentiment = "negative";
    } else {
      // Tie – use star rating as tiebreaker
      sentiment = rating > 3 ? "positive" : rating < 3 ? "negative" : "neutral";
    }

    detectedAspects.push({
      aspect,
      sentiment,
      keywords: [...matchedPositive, ...matchedNegative],
    });
  }

  // Compute overall sentiment: combine keyword-based classification with
  // detected aspect sentiments and the star rating.
  let textSentiment = classifyOverallSentiment(reviewText);

  let posScore = 0;
  let negScore = 0;

  // Keyword-based score
  if (textSentiment === "positive") posScore += 2;
  else if (textSentiment === "negative") negScore += 2;

  // Aspect-based score
  for (const a of detectedAspects) {
    if (a.sentiment === "positive") posScore += 1;
    else if (a.sentiment === "negative") negScore += 1;
  }

  // Star-rating score
  if (rating >= 4) posScore += 2;
  else if (rating <= 2) negScore += 2;

  let overallSentiment;
  if (posScore > negScore) overallSentiment = "positive";
  else if (negScore > posScore) overallSentiment = "negative";
  else overallSentiment = "neutral";

  return { aspects: detectedAspects, overallSentiment };
};

/**
 * Build an aggregated ABSA summary from an array of review documents.
 * Usable across all sentiment-summary endpoints.
 *
 * @param {Array} reviews - Mongoose lean review documents with sentimentAnalysis field.
 * @returns {{
 *   totalReviews: number,
 *   overallSentiment: "positive"|"negative"|"neutral"|null,
 *   sentimentCounts: { positive: number, negative: number, neutral: number },
 *   aspectSummary: Array
 * }}
 */
export const buildSentimentSummary = (reviews) => {
  if (!reviews || reviews.length === 0) {
    return {
      totalReviews: 0,
      overallSentiment: null,
      sentimentCounts: { positive: 0, negative: 0, neutral: 0 },
      aspectSummary: [],
    };
  }

  const aspectMap = {};
  let positiveCount = 0;
  let negativeCount = 0;
  let neutralCount = 0;

  for (const review of reviews) {
    const sa = review.sentimentAnalysis;
    if (!sa) continue;

    if (sa.overallSentiment === "positive") positiveCount++;
    else if (sa.overallSentiment === "negative") negativeCount++;
    else neutralCount++;

    for (const aspectEntry of sa.aspects || []) {
      if (!aspectMap[aspectEntry.aspect]) {
        aspectMap[aspectEntry.aspect] = { positive: 0, negative: 0, neutral: 0, mentions: 0 };
      }
      aspectMap[aspectEntry.aspect][aspectEntry.sentiment]++;
      aspectMap[aspectEntry.aspect].mentions++;
    }
  }

  const dominantOverall =
    positiveCount >= negativeCount && positiveCount >= neutralCount
      ? "positive"
      : negativeCount >= positiveCount && negativeCount >= neutralCount
      ? "negative"
      : "neutral";

  const aspectSummary = Object.entries(aspectMap)
    .map(([aspect, counts]) => ({
      aspect,
      mentions: counts.mentions,
      positive: counts.positive,
      negative: counts.negative,
      neutral: counts.neutral,
      dominantSentiment:
        counts.positive >= counts.negative && counts.positive >= counts.neutral
          ? "positive"
          : counts.negative >= counts.positive && counts.negative >= counts.neutral
          ? "negative"
          : "neutral",
    }))
    .sort((a, b) => b.mentions - a.mentions);

  return {
    totalReviews: reviews.length,
    overallSentiment: dominantOverall,
    sentimentCounts: { positive: positiveCount, negative: negativeCount, neutral: neutralCount },
    aspectSummary,
  };
};
