import api from './axios'

export const getCustomers = async () => {
  const { data } = await api.get('/api/admin/customers')
  return data
}

export const updateCustomerStatus = async (id, payload) => {
  if (!id) {
    throw new Error('Customer ID is required')
  }
  const { data } = await api.patch(`/api/admin/customers/${id}/status`, payload)
  return data
}

