import api from './axios'

// Send message to AI chatbot
export const sendChatbotMessage = async (message, conversationHistory = []) => {
    const { data } = await api.post('/api/customer/chatbot/message', {
        message,
        conversationHistory
    })
    return data
}
