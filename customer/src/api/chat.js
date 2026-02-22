import api from './axios'

// Get all cooks available for chat
export const getCooksForChat = async () => {
  const { data } = await api.get('/api/customer/chats/cooks')
  return data
}

// Get all customer's chats
export const getChats = async () => {
  const { data } = await api.get('/api/customer/chats')
  return data
}

// Get or create chat with a cook
export const getOrCreateChat = async (cookId) => {
  const { data } = await api.get(`/api/customer/chats/cook/${cookId}`)
  return data
}

// Get messages for a specific chat
export const getChatMessages = async (cookId, page = 1) => {
  const { data } = await api.get(`/api/customer/chats/cook/${cookId}/messages`, {
    params: { page }
  })
  return data
}

// Send message to a cook
export const sendMessage = async (cookId, content) => {
  const { data } = await api.post(`/api/customer/chats/cook/${cookId}/message`, {
    content
  })
  return data
}

// Get unread message count
export const getUnreadCount = async () => {
  const { data } = await api.get('/api/customer/chats/unread')
  return data
}
