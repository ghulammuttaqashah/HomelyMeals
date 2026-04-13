import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import Header from '../components/Header'
import Footer from '../components/Footer'
import Loader from '../components/Loader'
import Button from '../components/Button'
import { FiArrowLeft, FiExternalLink, FiCheckCircle, FiInfo, FiShield, FiLock, FiDollarSign, FiClock, FiFileText, FiCreditCard } from 'react-icons/fi'
import {
  getStripeStatus,
  initiateOnboarding,
  getManageLink,
  updatePaymentSettings,
} from '../api/payments'

const PaymentSettings = () => {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const [searchParams] = useSearchParams()

  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [toggleLoading, setToggleLoading] = useState(false)

  const [paymentStatus, setPaymentStatus] = useState({
    stripeAccountId: null,
    stripeAccountStatus: 'not_started',
    isOnlinePaymentEnabled: false,
    chargesEnabled: false,
    payoutsEnabled: false,
    detailsSubmitted: false,
  })

  const fetchPaymentStatus = async () => {
    try {
      setLoading(true)
      const data = await getStripeStatus()
      setPaymentStatus(data)
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to load payment status')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true })
      return
    }

    fetchPaymentStatus()

    // Check for onboarding callback
    const onboardingStatus = searchParams.get('onboarding')
    if (onboardingStatus === 'success') {
      toast.success('KYC onboarding completed! Refreshing status...')
      setTimeout(() => fetchPaymentStatus(), 2000)
    } else if (onboardingStatus === 'refresh') {
      toast('Please complete the onboarding process', { icon: '⚠️' })
    }
  }, [isAuthenticated, navigate, searchParams])

  const handleStartOnboarding = async () => {
    try {
      setActionLoading(true)
      const data = await initiateOnboarding()
      
      if (data.onboardingUrl) {
        window.open(data.onboardingUrl, '_blank')
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to start onboarding')
      setActionLoading(false)
    }
  }

  const handleManageAccount = async () => {
    try {
      setActionLoading(true)
      const data = await getManageLink()
      
      if (data.manageUrl) {
        window.open(data.manageUrl, '_blank')
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to open account management')
    } finally {
      setActionLoading(false)
    }
  }

  const handleTogglePayments = async (enabled) => {
    // Prevent enabling if KYC not complete
    if (enabled && (paymentStatus.stripeAccountStatus !== 'active')) {
      toast.error('You must complete KYC verification before enabling online payments.')
      return
    }

    try {
      setToggleLoading(true)
      const data = await updatePaymentSettings(enabled)
      
      setPaymentStatus((prev) => ({
        ...prev,
        isOnlinePaymentEnabled: data.isOnlinePaymentEnabled,
      }))
      
      toast.success(data.message)
    } catch (error) {
      const errorMsg = error?.response?.data?.message || 'Failed to update payment settings'
      toast.error(errorMsg)
      
      // Show action hint if KYC is required
      if (error?.response?.data?.action === 'complete_kyc') {
        setTimeout(() => {
          toast('Complete KYC verification first', { icon: '💡' })
        }, 1000)
      }
    } finally {
      setToggleLoading(false)
    }
  }

  const getStatusBadge = () => {
    const status = paymentStatus.stripeAccountStatus
    
    const badges = {
      not_started: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Not Started' },
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Pending Verification' },
      active: { bg: 'bg-green-100', text: 'text-green-700', label: 'Verified & Active' },
      restricted: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Restricted' },
      disabled: { bg: 'bg-red-100', text: 'text-red-700', label: 'Disabled' },
    }

    const badge = badges[status] || badges.not_started

    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full ${badge.bg} px-3 py-1 text-sm font-semibold ${badge.text}`}>
        <span className="h-2 w-2 rounded-full bg-current"></span>
        {badge.label}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-gray-50">
        <Header showSignOut={true} />
        <main className="flex-1 py-6 sm:py-8 lg:py-12">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mb-8">
              <button
                onClick={() => navigate('/dashboard')}
                className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-orange-600 transition-colors"
              >
                <FiArrowLeft className="w-4 h-4" />
                Back to Dashboard
              </button>
              <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Payment Settings</h1>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white py-16 shadow-sm">
              <div className="flex flex-col items-center gap-3">
                <Loader size="lg" />
                <p className="text-sm font-medium text-gray-600">Loading payment settings...</p>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  const isStripeActive = paymentStatus.stripeAccountId && paymentStatus.stripeAccountStatus === 'active'
  const needsKYC = !isStripeActive

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Header showSignOut={true} />

      <main className="flex-1 py-6 sm:py-8 lg:py-12">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          
          {/* Header Section */}
          <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <button
                onClick={() => navigate('/dashboard')}
                className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-orange-600 transition-colors"
              >
                <FiArrowLeft className="w-4 h-4" />
                Back to Dashboard
              </button>
              <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Payment Settings</h1>
              <p className="mt-1 text-sm text-gray-600">
                Configure how you receive money and manage your secure Stripe payout account.
              </p>
            </div>
            {getStatusBadge()}
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            
            {/* Left Column: Stripe & KYC */}
            <div className="space-y-6">
              
              {/* KYC Status Card */}
              <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
                    <FiShield className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Identity Verification (KYC)</h2>
                    <p className="text-xs text-gray-500">Security powered by Stripe Connect</p>
                  </div>
                </div>

                <p className="text-sm text-gray-600 leading-relaxed mb-6">
                  To receive online payments directly into your bank account, we are required by law to verify your identity. This process is handled securely by Stripe.
                </p>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Payment Receiving</p>
                    <p className={`mt-1 text-sm font-bold ${paymentStatus.chargesEnabled ? 'text-green-600' : 'text-gray-400'}`}>
                      {paymentStatus.chargesEnabled ? '✓ Enabled' : '○ Not Active'}
                    </p>
                  </div>
                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Bank Payouts</p>
                    <p className={`mt-1 text-sm font-bold ${paymentStatus.payoutsEnabled ? 'text-green-600' : 'text-gray-400'}`}>
                      {paymentStatus.payoutsEnabled ? '✓ Enabled' : '○ Not Active'}
                    </p>
                  </div>
                </div>

                {!isStripeActive ? (
                  <Button
                    onClick={handleStartOnboarding}
                    loading={actionLoading}
                    loadingText="Redirecting to Stripe..."
                    fullWidth
                    size="md"
                    icon={<FiLock className="h-4 w-4" />}
                  >
                    Start Onboarding Process
                  </Button>
                ) : (
                  <Button
                    onClick={handleManageAccount}
                    loading={actionLoading}
                    loadingText="Opening Dashboard..."
                    variant="outline"
                    fullWidth
                    size="md"
                    icon={<FiExternalLink className="h-4 w-4" />}
                  >
                    Manage Stripe Dashboard
                  </Button>
                )}
              </section>

              {/* Document Checklist */}
              <section className="rounded-2xl border border-blue-100 bg-blue-50/50 p-6">
                <h3 className="flex items-center gap-2 text-sm font-bold text-blue-900 mb-4">
                  <FiFileText className="h-4 w-4" />
                  What you'll need for KYC
                </h3>
                <ul className="space-y-3">
                  {[
                    { label: 'CNIC / National Identity Card', desc: 'A clear photo of your government ID' },
                    { label: 'Bank Account (IBAN)', desc: 'Where you want to receive your earnings' },
                    { label: 'Mobile Number', desc: 'For two-factor authentication security' },
                    { label: 'Business Address', desc: 'Your home kitchen or shop address' },
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-200 text-blue-700">
                        <FiCheckCircle className="h-2.5 w-2.5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-blue-900">{item.label}</p>
                        <p className="text-[11px] text-blue-700/70">{item.desc}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            </div>

            {/* Right Column: Online Payments & Info */}
            <div className="space-y-6">
              
              {/* Online Payment Card */}
              <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100 text-green-600">
                      <FiCreditCard className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">Online Payments</h2>
                      <p className="text-xs text-gray-500">Enable card payments for customers</p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleTogglePayments(!paymentStatus.isOnlinePaymentEnabled)}
                    disabled={needsKYC || toggleLoading}
                    className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-30 ${
                      paymentStatus.isOnlinePaymentEnabled ? 'bg-orange-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
                        paymentStatus.isOnlinePaymentEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {needsKYC ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <div className="flex gap-3">
                      <FiInfo className="h-5 w-5 shrink-0 text-amber-600" />
                      <div>
                        <p className="text-sm font-bold text-amber-900">Complete KYC to Activate</p>
                        <p className="mt-1 text-xs text-amber-800 leading-relaxed">
                          Online payments are disabled until your identity is verified. This ensures all payouts are sent to a legitimate bank account.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                    <div className="flex gap-3">
                      <FiCheckCircle className="h-5 w-5 shrink-0 text-green-600" />
                      <div>
                        <p className="text-sm font-bold text-green-900">Seamless Payouts</p>
                        <p className="mt-1 text-xs text-green-800 leading-relaxed">
                          Your account is ready! Customers can now pay with Credit/Debit cards, and funds will be sent directly to your bank.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </section>

              {/* Why Stripe? Section */}
              <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <h3 className="text-sm font-bold text-gray-900 mb-4">Why use Online Payments?</h3>
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-50 text-orange-600">
                      <FiDollarSign className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-800">Direct Bank Transfers</p>
                      <p className="text-xs text-gray-500">No more manual verification of screenshots. Payments are processed and sent to your bank automatically.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-50 text-orange-600">
                      <FiClock className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-800">Faster Order Fulfillment</p>
                      <p className="text-xs text-gray-500">Orders are marked as "Paid" instantly, so you can start cooking immediately without waiting for cash.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-50 text-orange-600">
                      <FiLock className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-800">Zero Fraud Risk</p>
                      <p className="text-xs text-gray-500">Stripe handles card security and fraud detection, protecting you from fake payment proofs.</p>
                    </div>
                  </div>
                </div>
              </section>

            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}

export default PaymentSettings
