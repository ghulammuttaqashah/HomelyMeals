import api from './axios'

export const login = async (payload) => {
  const { data } = await api.post('/api/admin/auth/signin/request', payload)
  return data
}

export const resendOtp = async (payload) => {
  const { data } = await api.post('/api/admin/auth/signin/resend', payload)
  return data
}

export const verifyOtp = async (payload) => {
  const { data } = await api.post('/api/admin/auth/signin/verify', payload)
  return data
}

export const logout = async () => {
  const { data } = await api.post('/api/admin/auth/signout')
  return data
}

