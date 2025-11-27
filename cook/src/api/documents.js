import api from './axios'

export const submitDocuments = async (payload) => {
  const { data } = await api.post('/api/cook/documents/submit', payload)
  return data
}
