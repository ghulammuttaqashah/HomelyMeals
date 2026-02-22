import api from './axios'

// Get sales analytics with period filter
export const getSalesAnalytics = async (period = 'monthly') => {
    const { data } = await api.get('/api/cook/sales', { params: { period } })
    return data
}
