import api from './axios'

// Get all cook's chats (customers who have messaged)
export const getChats = async () => {
  const { data } = await api.get('/api/cook/chats')
  return data
}

// Get messages for a specific chat with a customer
export const getChatMessages = async (customerId, page = 1) => {
  const { data } = await api.get(`/api/cook/chats/customer/${customerId}/messages`, {
    params: { page }
  })
  return data
}

// Send message to a customer
export const sendMessage = async (customerId, content) => {
  const { data } = await api.post(`/api/cook/chats/customer/${customerId}/message`, {
    content
  })
  return data
}

// Get unread message count
export const getUnreadCount = async () => {
  const { data } = await api.get('/api/cook/chats/unread')
  return data
}
