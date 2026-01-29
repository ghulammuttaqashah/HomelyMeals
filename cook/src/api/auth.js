import api from './axios'

export const signupRequest = async (payload) => {
  const { data } = await api.post('/api/cook/auth/signup/request', payload)
  return data
}

export const verifySignupOtp = async (payload) => {
  const { data } = await api.post('/api/cook/auth/signup/verify', payload)
  return data
}

export const resendSignupOtp = async (payload) => {
  const { data } = await api.post('/api/cook/auth/signup/resend', payload)
  return data
}

export const signin = async (payload) => {
  const { data } = await api.post('/api/cook/auth/signin', payload)
  return data
}

export const signout = async () => {
  const { data } = await api.post('/api/cook/auth/signout')
  return data
}

export const getCurrentCook = async () => {
  const { data } = await api.get('/api/cook/auth/me')
  return data
}

// Forgot Password APIs
export const forgotPasswordRequest = async (payload) => {
  const { data } = await api.post('/api/cook/auth/forgot-password/request', payload)
  return data
}

export const verifyForgotPasswordOtp = async (payload) => {
  const { data } = await api.post('/api/cook/auth/forgot-password/verify', payload)
  return data
}

export const resetPassword = async (payload) => {
  const { data } = await api.post('/api/cook/auth/forgot-password/reset', payload)
  return data
}

export const resendForgotPasswordOtp = async (payload) => {
  const { data } = await api.post('/api/cook/auth/forgot-password/resend', payload)
  return data
}

export const toggleServiceStatus = async () => {
  const { data } = await api.patch('/api/cook/auth/service-status')
  return data
}

export const updateProfile = async (payload) => {
  const { data } = await api.put('/api/cook/auth/profile', payload)
  return data
}

export const changePassword = async (payload) => {
  const { data } = await api.put('/api/cook/auth/change-password', payload)
  return data
}
