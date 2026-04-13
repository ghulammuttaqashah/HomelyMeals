/**
 * Intent Classifier Utility
 * Detects user intent based on keywords in the message
 */

/**
 * Classify user intent based on message content
 * @param {string} message - User's message
 * @returns {string} - Detected intent name
 */
export const classifyIntent = (message) => {
    if (!message || typeof message !== 'string') {
        return 'fallback'
    }

    // Convert message to lowercase for case-insensitive matching
    const msg = message.toLowerCase().trim()

    // Greeting
    if (msg.includes('hi') || msg.includes('hello') || msg.includes('hey') || 
        msg.includes('good morning') || msg.includes('good afternoon') || msg.includes('good evening')) {
        return 'greeting'
    }

    // About bot (IMPROVED - handles more variations)
    if (msg.includes('who are you') || msg.includes('what are you') || 
        msg.includes('who is there') || msg.includes('anyone there') ||
        msg.includes('are you real') || msg.includes('what is this') ||
        msg.includes('who am i talking to') || msg.includes('your name') ||
        msg.includes('about you') || msg.includes('tell me about yourself')) {
        return 'about_bot'
    }

    // Order status
    if (msg.includes('order') || msg.includes('track') || 
        msg.includes('where is my order') || msg.includes('my order') ||
        msg.includes('delivery') || msg.includes('status')) {
        return 'order_status'
    }

    // Complaint
    if (msg.includes('complaint') || msg.includes('problem') || 
        msg.includes('issue') || msg.includes('bad') || 
        msg.includes('late') || msg.includes('worst') || 
        msg.includes('not good') || msg.includes('terrible') ||
        msg.includes('horrible') || msg.includes('disappointed')) {
        return 'complaint'
    }

    // Recommendation
    if (msg.includes('recommend') || msg.includes('suggest') || 
        msg.includes('food') || msg.includes('meal') || 
        msg.includes('hungry') || msg.includes('eat') ||
        msg.includes('dish') || msg.includes('menu')) {
        return 'recommendation'
    }

    // Help
    if (msg.includes('help') || msg.includes('how') || 
        msg.includes('what can you do') || msg.includes('guide') ||
        msg.includes('assist')) {
        return 'help'
    }

    // Fallback for unrecognized input
    return 'fallback'
}

/**
 * Detect sentiment in user message
 * @param {string} message - User's message
 * @returns {string} - 'negative', 'neutral', or 'positive'
 */
export const detectSentiment = (message) => {
    if (!message || typeof message !== 'string') {
        return 'neutral'
    }

    const lowerMessage = message.toLowerCase().trim()

    // Negative sentiment keywords
    const negativeSentimentKeywords = [
        'bad', 'worst', 'terrible', 'late', 'horrible', 'awful', 
        'disgusting', 'poor', 'disappointed', 'angry', 'unhappy', 
        'frustrated', 'annoyed', 'upset', 'hate', 'never', 'rude',
        'cold', 'wrong', 'missing', 'broken', 'damaged'
    ]

    // Check for negative sentiment
    for (const keyword of negativeSentimentKeywords) {
        if (lowerMessage.includes(keyword)) {
            return 'negative'
        }
    }

    // Default to neutral
    return 'neutral'
}



/**
 * Get confidence score for an intent (optional - for future use)
 * @param {string} message - User's message
 * @param {string} intent - Intent to check
 * @returns {number} - Confidence score (0-1)
 */
export const getIntentConfidence = (message, intent) => {
    if (!message || !intent || !intentKeywords[intent]) {
        return 0
    }

    const lowerMessage = message.toLowerCase()
    const keywords = intentKeywords[intent]
    
    let matchCount = 0
    keywords.forEach(keyword => {
        if (lowerMessage.includes(keyword)) {
            matchCount++
        }
    })

    return matchCount / keywords.length
}

/**
 * Get all possible intents with their confidence scores
 * @param {string} message - User's message
 * @returns {Object} - Object with intent names as keys and confidence scores as values
 */
export const getAllIntentScores = (message) => {
    const scores = {}
    
    Object.keys(intentKeywords).forEach(intent => {
        scores[intent] = getIntentConfidence(message, intent)
    })

    return scores
}
