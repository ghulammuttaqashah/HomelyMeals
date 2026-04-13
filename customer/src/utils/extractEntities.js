/**
 * Entity Extraction Utility
 * Extracts entities like food items, prices, and other relevant information from user messages
 */

/**
 * Extract entities from user message
 * @param {string} message - User's message
 * @returns {Object} - Extracted entities (food, price, etc.)
 */
export const extractEntities = (message) => {
    if (!message || typeof message !== 'string') {
        return { food: null, price: null }
    }

    const msg = message.toLowerCase().trim()

    // Extract price (numbers)
    const priceMatch = msg.match(/\d+/)
    const price = priceMatch ? parseInt(priceMatch[0]) : null

    // Extract food items
    let food = null
    const foodItems = {
        'biryani': ['biryani', 'biriyani', 'briyani'],
        'pizza': ['pizza', 'pizzas'],
        'burger': ['burger', 'burgers'],
        'pasta': ['pasta', 'spaghetti'],
        'chicken': ['chicken', 'chiken'],
        'rice': ['rice', 'fried rice'],
        'noodles': ['noodles', 'noodle'],
        'sandwich': ['sandwich', 'sandwiches'],
        'salad': ['salad', 'salads'],
        'soup': ['soup', 'soups'],
        'curry': ['curry', 'curries'],
        'karahi': ['karahi', 'karai'],
        'kebab': ['kebab', 'kabab', 'kebabs'],
        'paratha': ['paratha', 'parathas'],
        'roll': ['roll', 'rolls', 'wrap', 'wraps']
    }

    for (const [item, variations] of Object.entries(foodItems)) {
        for (const variation of variations) {
            if (msg.includes(variation)) {
                food = item
                break
            }
        }
        if (food) break
    }

    // Extract preferences
    let preference = null
    if (msg.includes('spicy') || msg.includes('hot')) {
        preference = 'spicy'
    } else if (msg.includes('cheap') || msg.includes('budget') || msg.includes('affordable')) {
        preference = 'cheap'
    } else if (msg.includes('popular') || msg.includes('best') || msg.includes('top')) {
        preference = 'popular'
    } else if (msg.includes('vegetarian') || msg.includes('veg')) {
        preference = 'vegetarian'
    }

    return { food, price, preference }
}

/**
 * Extract order ID from message
 * @param {string} message - User's message
 * @returns {string|null} - Extracted order ID
 */
export const extractOrderId = (message) => {
    if (!message || typeof message !== 'string') {
        return null
    }

    // Match patterns like: #12345, order 12345, id 12345
    const orderIdMatch = message.match(/#?(\d{4,6})|order\s+(\d{4,6})|id\s+(\d{4,6})/i)
    
    if (orderIdMatch) {
        return orderIdMatch[1] || orderIdMatch[2] || orderIdMatch[3]
    }

    return null
}
