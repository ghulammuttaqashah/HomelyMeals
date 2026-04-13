import api from './axios'

/**
 * Create a payment intent for an order
 */
export const createPaymentIntent = async (orderId, cookId, amount) => {
  const response = await api.post('/api/customer/payments/create-intent', {
    orderId,
    cookId,
    amount,
  })
  return response.data
}

/**
 * Confirm payment after successful Stripe payment
 */
export const confirmPayment = async (orderId, paymentIntentId) => {
  const response = await api.post('/api/customer/payments/confirm', {
    orderId,
    paymentIntentId,
  })
  return response.data
}
