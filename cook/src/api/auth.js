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
