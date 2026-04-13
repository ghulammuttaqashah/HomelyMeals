import api from './axios'

export const getActivePlans = async () => {
  const { data } = await api.get('/api/cook/subscriptions/plans')
  return data
}

export const createPaymentIntent = async (planId) => {
  const { data } = await api.post('/api/cook/subscriptions/payment-intent', { planId })
  return data
}

export const confirmSubscription = async (paymentIntentId) => {
  const { data } = await api.post('/api/cook/subscriptions/confirm', { paymentIntentId })
  return data
}

export const getMySubscription = async () => {
  const { data } = await api.get('/api/cook/subscriptions/me')
  return data
}
