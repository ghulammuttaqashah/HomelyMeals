// modules/customer/routes/chatbot.routes.js
import express from 'express';
import { processMessage } from '../../../shared/services/chatbot.service.js';

const router = express.Router();

// Process chatbot message
router.post('/message', async (req, res) => {
    try {
        const { message, conversationHistory } = req.body;

        if (!message || typeof message !== 'string') {
            return res.status(400).json({ 
                message: 'Message is required',
                error: 'Invalid input' 
            });
        }

        // Process message with AI
        const response = await processMessage(message, conversationHistory || []);

        res.json(response);
    } catch (error) {
        console.error('Chatbot message error:', error);
        res.status(500).json({ 
            message: 'Failed to process message', 
            error: error.message 
        });
    }
});

export default router;
