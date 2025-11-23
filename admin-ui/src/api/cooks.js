import api from './axios'

export const getCooks = async () => {
  const { data } = await api.get('/api/admin/cooks')
  return data
}

export const updateCookStatus = async (id, payload) => {
  if (!id) {
    throw new Error('Cook ID is required')
  }
  const { data } = await api.patch(`/api/admin/cooks/${id}/status`, payload)
  return data
}
