// ABSA Service using Groq API
import { Groq } from 'groq-sdk';

if (!process.env.GROQ_API_KEY) {
  throw new Error('GROQ_API_KEY environment variable is required for ABSA service');
}

const client = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

/**
 * Analyze review text for aspects and sentiments
 * @param {string} reviewText - The review text to analyze
 * @returns {Object} - Structured aspect-sentiment analysis
 */
export const analyzeReviewAspects = async (reviewText) => {
  try {
    const prompt = `You are an Aspect-Based Sentiment Analysis system for a food delivery platform.

IMPORTANT RULES:
- Return ONLY valid JSON
- No explanations or extra text
- Extract aspects related to: Food Quality, Taste, Service, Delivery, Packaging, Price, Overall Experience
- For each aspect, provide sentiment (Positive/Negative/Neutral) and specific reason

Expected JSON Format:
{
  "aspects": [
    {
      "category": "Food Quality",
      "aspect": "taste",
      "sentiment": "Positive",
      "reason": "delicious, flavorful",
      "confidence": 0.9
    },
    {
      "category": "Delivery", 
      "aspect": "timing",
      "sentiment": "Negative",
      "reason": "late delivery",
      "confidence": 0.8
    }
  ],
  "overall_sentiment": "Mixed",
  "summary": "Good food quality but delivery issues"
}

Review Text: "${reviewText}"`;

    const response = await client.chat.completions.create({
      model: "qwen/qwen3-32b",
      messages: [
        { role: "system", content: "You are an expert in aspect-based sentiment analysis. Return only valid JSON." },
        { role: "user", content: prompt }
      ],
      temperature: 0.1,
      max_tokens: 1000
    });

    let output = response.choices[0].message.content.trim();
    
    // Clean up any unwanted text
    if (output.includes('```json')) {
      output = output.split('```json')[1].split('```')[0].trim();
    }
    if (output.includes('```')) {
      output = output.split('```')[1].trim();
    }
    
    // Remove any thinking tags if present
    output = output.replace(/<think>.*?<\/think>/gs, '').trim();
    
    const analysis = JSON.parse(output);
    
    // Validate the structure
    if (!analysis.aspects || !Array.isArray(analysis.aspects)) {
      throw new Error('Invalid analysis structure');
    }
    
    return analysis;
    
  } catch (error) {
    console.error('ABSA Analysis Error:', error);
    
    // Fallback analysis
    return {
      aspects: [
        {
          category: "Overall Experience",
          aspect: "general",
          sentiment: "Neutral",
          reason: "analysis unavailable",
          confidence: 0.5
        }
      ],
      overall_sentiment: "Neutral",
      summary: "Unable to analyze review aspects",
      error: error.message
    };
  }
};

/**
 * Aggregate aspect sentiments for multiple reviews
 * @param {Array} reviews - Array of reviews with ABSA data
 * @returns {Object} - Aggregated aspect insights
 */
export const aggregateAspectInsights = (reviews) => {
  const aspectStats = {};
  const categoryStats = {};
  
  reviews.forEach(review => {
    if (review.aspectAnalysis && review.aspectAnalysis.aspects) {
      review.aspectAnalysis.aspects.forEach(aspect => {
        const { category, sentiment, confidence = 1 } = aspect;
        
        // Category-level aggregation
        if (!categoryStats[category]) {
          categoryStats[category] = { positive: 0, negative: 0, neutral: 0, total: 0 };
        }
        categoryStats[category][sentiment.toLowerCase()]++;
        categoryStats[category].total++;
        
        // Aspect-level aggregation
        const aspectKey = `${category}_${aspect.aspect}`;
        if (!aspectStats[aspectKey]) {
          aspectStats[aspectKey] = {
            category,
            aspect: aspect.aspect,
            positive: 0,
            negative: 0,
            neutral: 0,
            total: 0,
            reasons: []
          };
        }
        aspectStats[aspectKey][sentiment.toLowerCase()]++;
        aspectStats[aspectKey].total++;
        aspectStats[aspectKey].reasons.push(aspect.reason);
      });
    }
  });
  
  // Calculate percentages and insights
  const insights = {
    categories: Object.keys(categoryStats).map(category => ({
      name: category,
      ...categoryStats[category],
      positivePercentage: Math.round((categoryStats[category].positive / categoryStats[category].total) * 100),
      negativePercentage: Math.round((categoryStats[category].negative / categoryStats[category].total) * 100)
    })),
    aspects: Object.values(aspectStats).map(aspect => ({
      ...aspect,
      positivePercentage: Math.round((aspect.positive / aspect.total) * 100),
      negativePercentage: Math.round((aspect.negative / aspect.total) * 100),
      topReasons: [...new Set(aspect.reasons)].slice(0, 3)
    })),
    totalReviews: reviews.length
  };
  
  return insights;
};