import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  forgotPasswordRequest,
  verifyForgotPasswordOtp,
  resetPassword,
  resendForgotPasswordOtp,
} from '../api/auth'
import Loader from '../components/Loader'
import Header from '../components/Header'
import Footer from '../components/Footer'
import FormInput from '../components/FormInput'

const ForgotPassword = () => {
  const navigate = useNavigate()
  const [step, setStep] = useState(1) // 1: email, 2: otp, 3: new password
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const otpInputRefs = useRef([])

  // OTP Input Handlers
  const handleOtpChange = (index, value) => {
    // Only allow numbers
    if (value && !/^\d$/.test(value)) return

    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)

    // Auto-focus next input
    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus()
    }
  }

  const handleOtpKeyDown = (index, event) => {
    // Handle backspace
    if (event.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus()
    }
  }

  const handleOtpPaste = (event) => {
    event.preventDefault()
    const pastedData = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    const digits = pastedData.split('')
    const newOtp = [...otp]
    digits.forEach((digit, i) => {
      if (i < 6) {
        newOtp[i] = digit
      }
    })
    setOtp(newOtp)
    // Focus the last filled input or next empty
    const nextIndex = Math.min(digits.length - 1, 5)
    otpInputRefs.current[nextIndex]?.focus()
  }

  // Step 1: Request OTP
  const handleRequestOtp = async (event) => {
    event.preventDefault()
    if (!email) {
      toast.error('Please enter your email')
      return
    }

    setLoading(true)
    const loadingToast = toast.loading('Sending OTP...', { duration: Infinity })
    try {
      await forgotPasswordRequest({ email })
      toast.dismiss(loadingToast)
      toast.success('OTP sent to your email')
      setStep(2)
      // Focus first OTP input after step change
      setTimeout(() => otpInputRefs.current[0]?.focus(), 100)
    } catch (error) {
      toast.dismiss(loadingToast)
      const message = error.response?.data?.message || 'Failed to send OTP'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  // Step 2: Verify OTP
  const handleVerifyOtp = async (event) => {
    event.preventDefault()
    const otpCode = otp.join('')
    if (otpCode.length !== 6) {
      toast.error('Please enter the complete 6-digit OTP')
      return
    }

    setLoading(true)
    const loadingToast = toast.loading('Verifying OTP...', { duration: Infinity })
    try {
      await verifyForgotPasswordOtp({ email, otpCode })
      toast.dismiss(loadingToast)
      toast.success('OTP verified successfully')
      setStep(3)
    } catch (error) {
      toast.dismiss(loadingToast)
      const message = error.response?.data?.message || 'Invalid OTP'
      toast.error(message)
      // Clear OTP on error
      setOtp(['', '', '', '', '', ''])
      otpInputRefs.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }

  // Step 3: Reset Password
  const handleResetPassword = async (event) => {
    event.preventDefault()
    if (!newPassword || !confirmPassword) {
      toast.error('Please fill in all fields')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    setLoading(true)
    const loadingToast = toast.loading('Resetting password...', { duration: Infinity })
    try {
      await resetPassword({ email, newPassword })
      toast.dismiss(loadingToast)
      toast.success('Password reset successful!')
      navigate('/login', { replace: true })
    } catch (error) {
      toast.dismiss(loadingToast)
      const message = error.response?.data?.message || 'Failed to reset password'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  // Resend OTP
  const handleResendOtp = async () => {
    setLoading(true)
    const loadingToast = toast.loading('Resending OTP...', { duration: Infinity })
    try {
      await resendForgotPasswordOtp({ email })
      toast.dismiss(loadingToast)
      toast.success('OTP resent successfully')
      // Clear OTP fields and focus first input
      setOtp(['', '', '', '', '', ''])
      otpInputRefs.current[0]?.focus()
    } catch (error) {
      toast.dismiss(loadingToast)
      const message = error.response?.data?.message || 'Failed to resend OTP'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const getStepTitle = () => {
    switch (step) {
      case 1:
        return 'Forgot Password'
      case 2:
        return 'Verify OTP'
      case 3:
        return 'Reset Password'
      default:
        return 'Forgot Password'
    }
  }

  const getStepDescription = () => {
    switch (step) {
      case 1:
        return 'Enter your email to receive a password reset OTP'
      case 2:
        return 'Enter the OTP sent to your email'
      case 3:
        return 'Enter your new password'
      default:
        return ''
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <Header />
      <div className="flex flex-1 items-center justify-center px-3 py-6 sm:px-4 sm:py-12">
        <div className="w-full max-w-md">
          <div className="rounded-lg bg-white p-5 sm:p-8 shadow-sm border border-gray-200">
            <div className="mb-6 sm:mb-8 text-center">
              <div className="mx-auto mb-3 sm:mb-4 flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-orange-100">
                <svg
                  className="h-6 w-6 sm:h-8 sm:w-8 text-orange-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                  />
                </svg>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-orange-600">{getStepTitle()}</h1>
              <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm text-gray-600">{getStepDescription()}</p>
              
              {/* Step Indicator */}
              <div className="mt-3 sm:mt-4 flex justify-center gap-1.5 sm:gap-2">
                {[1, 2, 3].map((s) => (
                  <div
                    key={s}
                    className={`h-1.5 sm:h-2 w-6 sm:w-8 rounded-full ${
                      s <= step ? 'bg-orange-600' : 'bg-gray-200'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Step 1: Email */}
            {step === 1 && (
              <form onSubmit={handleRequestOtp} className="space-y-4 sm:space-y-5">
                <FormInput
                  label="Email address"
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  icon={
                    <svg
                      className="h-4 w-4 sm:h-5 sm:w-5 text-slate-400"
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

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-orange-600 px-5 py-3 sm:px-6 sm:py-3.5 text-xs sm:text-sm font-semibold text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="flex items-center justify-center gap-2">
                    {loading ? (
                      <>
                        <Loader size="sm" className="text-white" />
                        Sending OTP...
                      </>
                    ) : (
                      'Send OTP'
                    )}
                  </span>
                </button>
              </form>
            )}

            {/* Step 2: OTP Verification */}
            {step === 2 && (
              <form onSubmit={handleVerifyOtp} className="space-y-5 sm:space-y-6">
                <div>
                  <label className="mb-2 sm:mb-3 block text-xs sm:text-sm font-medium text-gray-700">
                    Enter verification code
                  </label>
                  <div className="flex gap-1.5 sm:gap-3" onPaste={handleOtpPaste}>
                    {otp.map((digit, index) => (
                      <input
                        key={index}
                        ref={(el) => (otpInputRefs.current[index] = el)}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(index, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(index, e)}
                        className="h-11 w-full sm:h-14 rounded-lg border border-gray-300 bg-white text-center text-xl sm:text-2xl font-bold text-gray-900 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={loading}
                      />
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || otp.join('').length !== 6}
                  className="w-full rounded-lg bg-orange-600 px-5 py-3 sm:px-6 sm:py-3.5 text-xs sm:text-sm font-semibold text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="flex items-center justify-center gap-2">
                    {loading ? (
                      <>
                        <Loader size="sm" className="text-white" />
                        Verifying...
                      </>
                    ) : (
                      'Verify OTP'
                    )}
                  </span>
                </button>

                <div className="text-center">
                  <p className="mb-1.5 sm:mb-2 text-xs sm:text-sm text-gray-600">Didn't receive the code?</p>
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={loading}
                    className="text-xs sm:text-sm font-semibold text-orange-600 hover:text-orange-700 disabled:opacity-60"
                  >
                    Resend OTP
                  </button>
                </div>
              </form>
            )}

            {/* Step 3: New Password */}
            {step === 3 && (
              <form onSubmit={handleResetPassword} className="space-y-4 sm:space-y-5">
                <div className="space-y-1.5 sm:space-y-2">
                  <label htmlFor="newPassword" className="block text-xs sm:text-sm font-medium text-gray-700">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      id="newPassword"
                      name="newPassword"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 sm:px-4 sm:py-3 pr-10 sm:pr-12 text-xs sm:text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="Enter new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-2.5 sm:pr-3 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? (
                        <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                          />
                        </svg>
                      ) : (
                        <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

                <div className="space-y-1.5 sm:space-y-2">
                  <label htmlFor="confirmPassword" className="block text-xs sm:text-sm font-medium text-gray-700">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 sm:px-4 sm:py-3 pr-10 sm:pr-12 text-xs sm:text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="Confirm new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-2.5 sm:pr-3 text-slate-400 hover:text-slate-600"
                    >
                      {showConfirmPassword ? (
                        <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                          />
                        </svg>
                      ) : (
                        <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  className="w-full rounded-lg bg-orange-600 px-5 py-3 sm:px-6 sm:py-3.5 text-xs sm:text-sm font-semibold text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="flex items-center justify-center gap-2">
                    {loading ? (
                      <>
                        <Loader size="sm" className="text-white" />
                        Resetting...
                      </>
                    ) : (
                      'Reset Password'
                    )}
                  </span>
                </button>
              </form>
            )}

            <div className="mt-5 sm:mt-6 text-center">
              <p className="text-xs sm:text-sm text-gray-600">
                Remember your password?{' '}
                <Link to="/login" className="font-semibold text-orange-600 hover:text-orange-700">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}

export default ForgotPassword
