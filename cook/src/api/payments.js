import axios from './axios'

/**
 * Get Stripe account status
 */
export const getStripeStatus = async () => {
  const response = await axios.get('/api/cook/stripe/status')
  return response.data
}

/**
 * Initiate Stripe onboarding
 */
export const initiateOnboarding = async () => {
  const response = await axios.post('/api/cook/stripe/onboard')
  return response.data
}

/**
 * Get Stripe account management link
 */
export const getManageLink = async () => {
  const response = await axios.post('/api/cook/stripe/manage')
  return response.data
}

/**
 * Update payment settings (enable/disable online payments)
 */
export const updatePaymentSettings = async (isOnlinePaymentEnabled) => {
  const response = await axios.patch('/api/cook/payment-settings', {
    isOnlinePaymentEnabled,
  })
  return response.data
}
