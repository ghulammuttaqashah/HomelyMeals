import api from './axios'

// Get dashboard stats (orders, revenue, reviews, chats, menu)
export const getDashboardStats = async () => {
    const { data } = await api.get('/api/cook/dashboard/stats')
    return data
}
