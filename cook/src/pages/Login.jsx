import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import Loader from '../components/Loader'
import Header from '../components/Header'
import Footer from '../components/Footer'
import FormInput from '../components/FormInput'

const Login = () => {
  const navigate = useNavigate()
  const { signin } = useAuth()
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    const loadingToast = toast.loading('Signing in...', { duration: Infinity })
    try {
      const result = await signin(formData)
      toast.dismiss(loadingToast)
      toast.success('Signed in successfully')
      
      // Check verification status and redirect accordingly
      const { verificationStatus } = result.cook
      
      if (verificationStatus === 'not_started') {
        navigate('/upload-docs', { replace: true })
      } else if (verificationStatus === 'pending') {
        navigate('/status', { replace: true })
      } else if (verificationStatus === 'rejected') {
        navigate('/status', { replace: true })
      } else if (verificationStatus === 'approved') {
        navigate('/dashboard', { replace: true })
      } else {
        navigate('/status', { replace: true })
      }
    } catch (error) {
      toast.dismiss(loadingToast)
      const message = error.response?.data?.message || 'Unable to sign in'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <Header />
      <div className="flex flex-1 items-center justify-center px-4 py-6 sm:py-8 lg:py-12">
        <div className="w-full max-w-6xl">
          <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
            {/* Left Side - Platform Features (Desktop Only) */}
            <div className="hidden lg:flex flex-col justify-center space-y-6">
              {/* Main Heading */}
              <div>
                <h1 className="text-3xl xl:text-4xl font-bold text-gray-900 mb-3">
                  Welcome to <span className="text-orange-600">HomelyMeals</span>
                </h1>
                <p className="text-base xl:text-lg text-gray-600">
                  Join Pakistan's fastest-growing home chef platform
                </p>
              </div>

              {/* Key Features */}
              <div className="space-y-4">
                {/* Feature 1 - No Commission */}
                <div className="flex items-start gap-4 p-4 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 shadow-sm">
                  <div className="flex-shrink-0">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500 shadow-md">
                      <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-bold text-gray-900 mb-1">Zero Commission</h3>
                    <p className="text-sm text-gray-700">
                      Keep 100% of your earnings! We only charge a small monthly subscription. No hidden fees, no commission cuts.
                    </p>
                  </div>
                </div>

                {/* Feature 2 - Subscription Based */}
                <div className="flex items-start gap-4 p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 shadow-sm">
                  <div className="flex-shrink-0">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500 shadow-md">
                      <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-bold text-gray-900 mb-1">Simple Subscription</h3>
                    <p className="text-sm text-gray-700">
                      Affordable monthly plans starting from just Rs. 500. Unlimited orders, unlimited earnings potential.
                    </p>
                  </div>
                </div>

                {/* Feature 3 - Full Control */}
                <div className="flex items-start gap-4 p-4 rounded-xl bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 shadow-sm">
                  <div className="flex-shrink-0">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-500 shadow-md">
                      <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-bold text-gray-900 mb-1">You're in Control</h3>
                    <p className="text-sm text-gray-700">
                      Set your own prices, delivery radius, and working hours. Accept or reject orders as you wish.
                    </p>
                  </div>
                </div>

                {/* Feature 4 - Direct Payments */}
                <div className="flex items-start gap-4 p-4 rounded-xl bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 shadow-sm">
                  <div className="flex-shrink-0">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-500 shadow-md">
                      <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-bold text-gray-900 mb-1">Direct Payments</h3>
                    <p className="text-sm text-gray-700">
                      Receive payments directly from customers. Cash on delivery or online - your choice, your money.
                    </p>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 pt-4">
                <div className="text-center p-3 rounded-lg bg-white border border-gray-200 shadow-sm">
                  <div className="text-2xl font-bold text-orange-600">500+</div>
                  <div className="text-xs text-gray-600 mt-1">Active Cooks</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-white border border-gray-200 shadow-sm">
                  <div className="text-2xl font-bold text-orange-600">10K+</div>
                  <div className="text-xs text-gray-600 mt-1">Orders Delivered</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-white border border-gray-200 shadow-sm">
                  <div className="text-2xl font-bold text-orange-600">4.8★</div>
                  <div className="text-xs text-gray-600 mt-1">Average Rating</div>
                </div>
              </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="flex items-center justify-center w-full">
              <div className="w-full max-w-md">
                <div className="rounded-2xl bg-white p-5 sm:p-8 shadow-xl border border-gray-100">
                  <div className="mb-6 sm:mb-8 text-center">
                    <div className="mx-auto mb-3 sm:mb-4 flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-orange-600 shadow-lg">
                      <svg
                        className="h-7 w-7 sm:h-8 sm:w-8 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Welcome Back</h1>
                    <p className="mt-1.5 sm:mt-2 text-sm sm:text-base text-gray-600">Sign in to your cook account</p>
                  </div>

                  {/* Mobile Features Summary */}
                  <div className="lg:hidden mb-6 p-4 rounded-xl bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500 shadow-sm">
                        <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <h3 className="text-sm font-bold text-gray-900">Why HomelyMeals?</h3>
                    </div>
                    <ul className="space-y-2 text-xs sm:text-sm text-gray-700">
                      <li className="flex items-start gap-2">
                        <svg className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span><strong>Zero commission</strong> - Keep 100% of your earnings</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <svg className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span><strong>Simple subscription</strong> - From Rs. 500/month</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <svg className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span><strong>Full control</strong> - Set your own prices & hours</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <svg className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span><strong>Direct payments</strong> - Cash or online, your choice</span>
                      </li>
                    </ul>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-5">
                    <FormInput
                      label="Email address"
                      id="email"
                      name="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="you@example.com"
                      icon={
                        <svg
                          className="h-5 w-5 text-slate-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"
                          />
                        </svg>
                      }
                    />

                    <div className="space-y-2">
                      <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                        Password
                      </label>
                      <div className="relative">
                        <input
                          id="password"
                          name="password"
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={formData.password}
                          onChange={handleChange}
                          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 pr-12 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-sm"
                          placeholder="Enter your password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                        >
                          {showPassword ? (
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                              />
                            </svg>
                          ) : (
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                              />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full rounded-lg bg-gradient-to-r from-orange-600 to-orange-700 px-6 py-3.5 text-sm font-semibold text-white shadow-lg hover:from-orange-700 hover:to-orange-800 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 transition-all"
                    >
                      <span className="flex items-center justify-center gap-2">
                        {loading ? (
                          <>
                            <Loader size="sm" className="text-white" />
                            Signing in...
                          </>
                        ) : (
                          'Sign In'
                        )}
                      </span>
                    </button>
                  </form>

                  <div className="mt-5 text-center">
                    <Link to="/forgot-password" className="text-sm font-medium text-orange-600 hover:text-orange-700 transition-colors">
                      Forgot your password?
                    </Link>
                  </div>

                  <div className="mt-5 text-center">
                    <p className="text-sm text-gray-600">
                      Don't have an account?{' '}
                      <Link to="/signup" className="font-semibold text-orange-600 hover:text-orange-700 transition-colors">
                        Sign up
                      </Link>
                    </p>
                  </div>

                  {/* Support Email */}
                  <div className="mt-6 pt-5 border-t border-gray-200">
                    <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-gray-600">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <span>Need help?</span>
                      <a 
                        href="mailto:homelymeals4@gmail.com" 
                        className="font-medium text-orange-600 hover:text-orange-700 transition-colors"
                      >
                        homelymeals4@gmail.com
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}

export default Login
