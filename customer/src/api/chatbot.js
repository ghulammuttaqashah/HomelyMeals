import api from './axios'

// Send message to AI chatbot
export const sendChatbotMessage = async (message, conversationHistory = []) => {
    console.log('🔵 FRONTEND API: Calling /api/customer/chatbot/message');
    console.log('🔵 Message:', message);
    
    const { data } = await api.post('/api/customer/chatbot/message', {
        message,
        conversationHistory
    })
    
    console.log('🔵 FRONTEND API: Response received:', data);
    return data
}
