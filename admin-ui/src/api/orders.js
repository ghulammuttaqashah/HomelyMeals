import api from './axios'

// Orders API
export const getOrders = (params = {}) => {
  return api.get('/api/admin/orders', { params })
}

export const getOrder = (orderId) => {
  return api.get(`/api/admin/orders/${orderId}`)
}

export const confirmDelivery = (orderId, data = {}) => {
  return api.patch(`/api/admin/orders/${orderId}/confirm-delivery`, data)
}

// Dashboard stats
export const getOrderStats = () => {
  return api.get('/api/admin/orders/stats')
}
