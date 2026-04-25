import api from './axios'

export const submitDocuments = async (payload) => {
  const { data } = await api.post('/api/cook/documents/submit', payload)
  return data
}

export const getDocumentStatus = async () => {
  const { data } = await api.get('/api/cook/documents/status')
  return data
}

export const resubmitDocuments = async (payload) => {
  const { data } = await api.put('/api/cook/documents/resubmit', payload)
  return data
}
