import api from './axios'

// Get delivery charges settings
export const getDeliveryCharges = async () => {
  const { data } = await api.get('/api/admin/delivery-charges')
  return data
}

// Create delivery charges settings
export const createDeliveryCharges = async (payload) => {
  const { data } = await api.post('/api/admin/delivery-charges', payload)
  return data
}

// Update delivery charges settings
export const updateDeliveryCharges = async (payload) => {
  const { data } = await api.put('/api/admin/delivery-charges', payload)
  return data
}

// Delete all delivery charges settings
export const deleteDeliveryCharges = async () => {
  const { data } = await api.delete('/api/admin/delivery-charges')
  return data
}
