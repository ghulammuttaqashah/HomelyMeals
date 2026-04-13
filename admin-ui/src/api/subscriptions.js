import api from './axios'

export const createPlan = async (payload) => {
  const { data } = await api.post('/api/admin/plans', payload)
  return data
}

export const updatePlan = async (id, payload) => {
  const { data } = await api.put(`/api/admin/plans/${id}`, payload)
  return data
}

export const deletePlan = async (id) => {
  const { data } = await api.delete(`/api/admin/plans/${id}`)
  return data
}

export const getPlans = async (params = {}) => {
  const { data } = await api.get('/api/admin/plans', { params })
  return data
}

export const getSubscriptions = async (params = {}) => {
  const { data } = await api.get('/api/admin/subscriptions', { params })
  return data
}

export const getSubscriptionRevenue = async () => {
  const { data } = await api.get('/api/admin/subscriptions/revenue')
  return data
}
