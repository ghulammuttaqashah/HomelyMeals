// modules/customer/routes/chatbot.routes.js
import express from 'express';
import { processMessage } from '../../../shared/services/chatbot.service.js';

const router = express.Router();

console.log('🚀 MAIN CHAT ROUTES LOADED - /message endpoint registered');

// Process chatbot message - MAIN CHAT ENDPOINT
router.post('/message', async (req, res) => {
    try {
        console.log('📨 ========== MAIN CHAT MESSAGE RECEIVED ==========');
        console.log('📝 Message:', req.body.message);
        console.log('📜 History length:', req.body.conversationHistory?.length || 0);
        
        const { message, conversationHistory } = req.body;

        if (!message || typeof message !== 'string') {
            console.log('❌ Invalid message format');
            return res.status(400).json({ 
                message: 'Message is required',
                error: 'Invalid input' 
            });
        }

        console.log('🤖 Processing with AI and fetching REAL meals...');
        // Process message with AI - THIS FETCHES REAL MEALS
        const response = await processMessage(message, conversationHistory || []);

        console.log('✅ Response generated:', {
            intent: response.intent,
            mealsCount: response.meals?.length || 0,
            hasFood: !!response.entities?.food,
            hasPrice: !!response.entities?.price,
            text: response.text?.substring(0, 80) + '...'
        });
        
        if (response.meals && response.meals.length > 0) {
            console.log('🍽️ REAL MEALS RETURNED:', response.meals.map(m => `${m.name} - Rs ${m.price}`));
        }
        
        console.log('================================================\n');

        // Return response with meals
        res.json(response);
    } catch (error) {
        console.error('❌ Chatbot message error:', error);
        res.status(500).json({ 
            message: 'Failed to process message', 
            error: error.message,
            meals: []
        });
    }
});

export default router;
