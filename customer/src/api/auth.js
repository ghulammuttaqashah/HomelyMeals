import api from './axios'

export const signupRequest = async (payload) => {
  const { data } = await api.post('/api/customer/signup/request', payload)
  return data
}

export const verifySignupOtp = async (payload) => {
  const { data } = await api.post('/api/customer/signup/verify', payload)
  return data
}

export const resendSignupOtp = async (payload) => {
  const { data } = await api.post('/api/customer/signup/resend', payload)
  return data
}

export const signin = async (payload) => {
  const { data } = await api.post('/api/customer/signin', payload)
  return data
}

export const signout = async () => {
  const { data } = await api.post('/api/customer/signout')
  return data
}

export const getCurrentCustomer = async () => {
  const { data } = await api.get('/api/customer/me')
  return data
}
