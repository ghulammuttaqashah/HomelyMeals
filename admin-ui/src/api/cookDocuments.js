import api from './axios'

export const getSubmittedCookDocuments = async () => {
  const { data } = await api.get('/api/admin/cook-documents/submitted')
  return data
}

export const getCookDocuments = async (cookId) => {
  if (!cookId) throw new Error('Cook ID is required')
  const { data } = await api.get(`/api/admin/cook-documents/${cookId}`)
  return data
}

export const approveCookDocument = async (cookId, payload) => {
  if (!cookId) throw new Error('Cook ID is required')
  const { data } = await api.patch(`/api/admin/cook-documents/${cookId}/approve`, payload)
  return data
}

export const rejectCookDocument = async (cookId, payload) => {
  if (!cookId) throw new Error('Cook ID is required')
  const { data } = await api.patch(`/api/admin/cook-documents/${cookId}/reject`, payload)
  return data
}

export const approveAllCookDocuments = async (cookId) => {
  if (!cookId) throw new Error('Cook ID is required')
  const { data } = await api.patch(`/api/admin/cook-documents/${cookId}/approve-all`)
  return data
}

