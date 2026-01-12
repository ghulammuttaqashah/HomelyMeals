import api from './axios'

export const signupRequest = async (payload) => {
  const { data } = await api.post('/api/customer/auth/signup/request', payload)
  return data
}

export const verifySignupOtp = async (payload) => {
  const { data } = await api.post('/api/customer/auth/signup/verify', payload)
  return data
}

export const resendSignupOtp = async (payload) => {
  const { data } = await api.post('/api/customer/auth/signup/resend', payload)
  return data
}

export const signin = async (payload) => {
  const { data } = await api.post('/api/customer/auth/signin', payload)
  return data
}

export const signout = async () => {
  const { data } = await api.post('/api/customer/auth/signout')
  return data
}

export const getCurrentCustomer = async () => {
  const { data } = await api.get('/api/customer/auth/me')
  return data
}

// Forgot Password APIs
export const forgotPasswordRequest = async (payload) => {
  const { data } = await api.post('/api/customer/auth/forgot-password/request', payload)
  return data
}

export const verifyForgotPasswordOtp = async (payload) => {
  const { data } = await api.post('/api/customer/auth/forgot-password/verify', payload)
  return data
}

export const resetPassword = async (payload) => {
  const { data } = await api.post('/api/customer/auth/forgot-password/reset', payload)
  return data
}

export const resendForgotPasswordOtp = async (payload) => {
  const { data } = await api.post('/api/customer/auth/forgot-password/resend', payload)
  return data
}

