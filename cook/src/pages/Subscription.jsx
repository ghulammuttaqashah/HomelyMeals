import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { CardElement, Elements, useElements, useStripe } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import Header from '../components/Header'
import Footer from '../components/Footer'
import {
  getActivePlans,
  createPaymentIntent,
  confirmSubscription,
  getMySubscription,
} from '../api/subscriptions'
import { useAuth } from '../context/AuthContext'
import Loader from '../components/Loader'
import { FiArrowLeft } from 'react-icons/fi'

const stripePublicKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || ''
const stripePromise = stripePublicKey ? loadStripe(stripePublicKey) : null

const cardElementOptions = {
  style: {
    base: {
      fontSize: '16px',
      color: '#1f2937',
      '::placeholder': { color: '#9ca3af' },
    },
    invalid: { color: '#dc2626' },
  },
}

const CheckoutForm = ({ clientSecret, onSuccess, cook }) => {
  const stripe = useStripe()
  const elements = useElements()
  const [processing, setProcessing] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!stripe || !elements || !clientSecret) return

    setProcessing(true)
    try {
      const cardElement = elements.getElement(CardElement)

      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: cook?.name || 'Cook User',
            email: cook?.email || undefined,
          },
        },
      })

      if (result.error) {
        toast.error(result.error.message || 'Payment failed')
        return
      }

      if (result.paymentIntent?.status === 'succeeded') {
        await onSuccess(result.paymentIntent.id)
      } else {
        toast.error('Payment did not complete. Please try again.')
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Payment failed')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-bold text-gray-900">Pay with Stripe</h3>
      <div className="rounded-lg border border-gray-300 p-3">
        <CardElement options={cardElementOptions} />
      </div>
      <button
        type="submit"
        disabled={!stripe || processing}
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {processing ? (
          <>
            <Loader size="sm" className="text-white" />
            Processing...
          </>
        ) : (
          'Pay & Activate Subscription'
        )}
      </button>
    </form>
  )
}

const Subscription = () => {
  const navigate = useNavigate()
  const { cook } = useAuth()
  const [plans, setPlans] = useState([])
  const [subscription, setSubscription] = useState(null)
  const [loading, setLoading] = useState(true)

  const [selectedPlan, setSelectedPlan] = useState(null)
  const [clientSecret, setClientSecret] = useState('')
  const [intentLoading, setIntentLoading] = useState(false)

  const hasStripeKey = useMemo(() => Boolean(stripePublicKey), [])

  const fetchData = async (showPageLoader = true) => {
    try {
      if (showPageLoader) setLoading(true)
      const [plansRes, mySubRes] = await Promise.all([getActivePlans(), getMySubscription()])
      setPlans(plansRes.plans || [])
      setSubscription(mySubRes.subscription || null)
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to load subscription data')
    } finally {
      if (showPageLoader) setLoading(false)
    }
  }

  const statusPillClass =
    subscription?.status === 'active'
      ? 'bg-green-50 text-green-700 border-green-200'
      : subscription?.status === 'pending'
        ? 'bg-amber-50 text-amber-700 border-amber-200'
        : 'bg-red-50 text-red-700 border-red-200'

  useEffect(() => {
    fetchData(true)
  }, [])

  const handleStartCheckout = async (plan) => {
    if (!hasStripeKey) {
      toast.error('Stripe publishable key is missing in cook .env')
      return
    }

    try {
      setIntentLoading(true)
      const res = await createPaymentIntent(plan._id)
      setSelectedPlan(plan)
      setClientSecret(res.clientSecret)
      toast.success('Payment started. Complete card details below.')
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to start payment')
    } finally {
      setIntentLoading(false)
    }
  }

  const handleConfirmSuccess = async (paymentIntentId) => {
    try {
      await confirmSubscription(paymentIntentId)
      toast.success('Subscription activated successfully')
      setClientSecret('')
      setSelectedPlan(null)
      await fetchData()
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to activate subscription')
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Header showSignOut={true} />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-orange-600 transition-colors"
          >
            <FiArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Subscription</h1>
              <p className="mt-1 text-sm text-gray-600">Choose a plan and subscribe securely using Stripe test mode.</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="rounded-lg border border-gray-200 bg-white py-16 shadow-sm">
            <div className="flex flex-col items-center gap-3">
              <Loader size="lg" />
              <p className="text-sm font-medium text-gray-600">Loading subscription details...</p>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
              <section className="rounded-xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-5 shadow-sm lg:col-span-1">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-xl font-bold text-gray-900">Current Status</h2>
                  {subscription?.status ? (
                    <span className={`inline-flex rounded-lg border px-3 py-1 text-sm font-semibold capitalize ${statusPillClass}`}>
                      {subscription.status}
                    </span>
                  ) : null}
                </div>

                {!subscription ? (
                  <div className="mt-4 rounded-lg border border-dashed border-gray-300 bg-white/80 p-4">
                    <p className="text-sm font-medium text-gray-700">No active subscription yet.</p>
                    <p className="mt-1 text-xs text-gray-500">Choose a plan from the right panel to activate your kitchen.</p>
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    <div className="rounded-lg bg-white p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Plan</p>
                      <p className="mt-1 text-base font-semibold text-gray-900">{subscription.plan?.name || '-'}</p>
                    </div>

                    <div className="rounded-lg bg-white p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Status</p>
                      <p className="mt-1 text-base font-semibold capitalize text-gray-900">{subscription.status}</p>
                    </div>

                    <div className="rounded-lg bg-white p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Expiry Date</p>
                      <p className="mt-1 text-base font-semibold text-gray-900">
                        {subscription.end_date
                          ? new Date(subscription.end_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
                          : '-'}
                      </p>
                    </div>

                    {/* Expiry Countdown */}
                    {subscription.end_date && subscription.status === 'active' && (() => {
                      const now = new Date();
                      const endDate = new Date(subscription.end_date);
                      const daysUntilExpiry = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
                      
                      if (daysUntilExpiry <= 7) {
                        return (
                          <div className={`rounded-lg p-4 border-2 ${
                            daysUntilExpiry === 0 
                              ? 'bg-red-50 border-red-300' 
                              : daysUntilExpiry <= 3 
                                ? 'bg-orange-50 border-orange-300' 
                                : 'bg-yellow-50 border-yellow-300'
                          }`}>
                            <div className="flex items-center gap-3">
                              <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
                                daysUntilExpiry === 0 
                                  ? 'bg-red-100 text-red-600' 
                                  : daysUntilExpiry <= 3 
                                    ? 'bg-orange-100 text-orange-600' 
                                    : 'bg-yellow-100 text-yellow-600'
                              }`}>
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </div>
                              <div className="flex-1">
                                <p className={`text-lg font-bold ${
                                  daysUntilExpiry === 0 
                                    ? 'text-red-900' 
                                    : daysUntilExpiry <= 3 
                                      ? 'text-orange-900' 
                                      : 'text-yellow-900'
                                }`}>
                                  {daysUntilExpiry === 0 
                                    ? 'Expires Today!' 
                                    : `${daysUntilExpiry} ${daysUntilExpiry === 1 ? 'Day' : 'Days'} Left`}
                                </p>
                                <p className={`text-sm ${
                                  daysUntilExpiry === 0 
                                    ? 'text-red-700' 
                                    : daysUntilExpiry <= 3 
                                      ? 'text-orange-700' 
                                      : 'text-yellow-700'
                                }`}>
                                  {daysUntilExpiry === 0 
                                    ? 'Renew immediately to avoid service interruption' 
                                    : 'Renew soon to keep your kitchen active'}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                )}
              </section>

              <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm lg:col-span-2">
                <h2 className="text-lg font-bold text-gray-900">Available Plans</h2>
                {plans.length === 0 ? (
                  <p className="mt-3 text-sm text-gray-600">No active plans available right now.</p>
                ) : (
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    {plans.map((plan) => (
                      <div key={plan._id} className="rounded-lg border border-gray-200 p-4">
                        <h3 className="text-base font-bold text-gray-900">{plan.name}</h3>
                        <p className="mt-1 text-sm text-gray-600">
                          Rs. {plan.price} for {plan.duration} days
                        </p>
                        <button
                          type="button"
                          onClick={() => handleStartCheckout(plan)}
                          disabled={intentLoading || Boolean(subscription?.status === 'active')}
                          className="mt-3 inline-flex items-center gap-2 rounded-lg bg-orange-600 px-3 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {subscription?.status === 'active' ? (
                            'Already Subscribed'
                          ) : intentLoading && selectedPlan?._id === plan._id ? (
                            <>
                              <Loader size="sm" className="text-white" />
                              Starting...
                            </>
                          ) : (
                            'Subscribe'
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
        )}

        {selectedPlan && clientSecret && stripePromise && (
          <div className="mt-6">
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <CheckoutForm clientSecret={clientSecret} onSuccess={handleConfirmSuccess} cook={cook} />
            </Elements>
          </div>
        )}

        {!hasStripeKey && (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Missing VITE_STRIPE_PUBLISHABLE_KEY in cook .env. Add it to enable Stripe checkout.
          </p>
        )}
      </main>

      <Footer />
    </div>
  )
}

export default Subscription
