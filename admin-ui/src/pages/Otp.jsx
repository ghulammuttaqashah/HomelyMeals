import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import Loader from '../components/Loader'
import Header from '../components/Header'
import Footer from '../components/Footer'

const Otp = () => {
  const navigate = useNavigate()
  const { pendingEmail, verifyOtp, resendCode } = useAuth()
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const inputRefs = useRef([])

  useEffect(() => {
    if (!pendingEmail) {
      navigate('/login', { replace: true })
    }
  }, [pendingEmail, navigate])

  useEffect(() => {
    // Focus first input on mount
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus()
    }
  }, [])

  const handleChange = (index, value) => {
    // Only allow numbers
    if (value && !/^\d$/.test(value)) return

    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index, event) => {
    // Handle backspace
    if (event.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
    // Handle paste
    if (event.key === 'v' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault()
      navigator.clipboard.readText().then((text) => {
        const digits = text.replace(/\D/g, '').slice(0, 6).split('')
        const newOtp = [...otp]
        digits.forEach((digit, i) => {
          if (i + index < 6) {
            newOtp[i + index] = digit
          }
        })
        setOtp(newOtp)
        // Focus the last filled input or next empty
        const nextIndex = Math.min(index + digits.length, 5)
        inputRefs.current[nextIndex]?.focus()
      })
    }
  }

  const handlePaste = (event) => {
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
    inputRefs.current[nextIndex]?.focus()
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!pendingEmail) return

    const otpCode = otp.join('')
    if (otpCode.length !== 6) {
      toast.error('Please enter the complete 6-digit code')
      return
    }

    setLoading(true)
    const loadingToast = toast.loading('Verifying OTP...', { duration: Infinity })
    try {
      await verifyOtp({ email: pendingEmail, otpCode })
      toast.dismiss(loadingToast)
      toast.success('Signed in successfully')
      navigate('/dashboard', { replace: true })
    } catch (error) {
      toast.dismiss(loadingToast)
      const message = error.response?.data?.message || 'Invalid OTP'
      toast.error(message)
      // Clear OTP on error
      setOtp(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (!pendingEmail) return
    setResending(true)
    const resendToast = toast.loading('Resending OTP...', { duration: Infinity })
    try {
      await resendCode(pendingEmail)
      toast.dismiss(resendToast)
      toast.success('OTP resent to your email')
      setOtp(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
    } catch (error) {
      toast.dismiss(resendToast)
      const message = error.response?.data?.message || 'Failed to resend OTP'
      toast.error(message)
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <Header showNav={false} />
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="rounded-2xl bg-white p-8 shadow-xl ring-1 ring-slate-200/50 transition-all hover:shadow-2xl">
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-100">
                <svg
                  className="h-8 w-8 text-brand-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">Verify OTP</p>
              <h1 className="mt-3 text-2xl font-bold text-slate-900">Check your inbox</h1>
              {pendingEmail && (
                <p className="mt-2 text-sm text-slate-500">
                  We sent a 6-digit code to <span className="font-medium text-slate-700">{pendingEmail}</span>
                </p>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="otp-inputs" className="mb-3 block text-sm font-medium text-slate-700">
                  Enter verification code
                </label>
                <div
                  id="otp-inputs"
                  className="flex gap-3"
                  onPaste={handlePaste}
                >
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => (inputRefs.current[index] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      className="h-14 w-full rounded-xl border-2 border-slate-200 bg-slate-50 text-center text-2xl font-bold text-slate-900 transition-all focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-100 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={loading}
                    />
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || otp.join('').length !== 6}
                className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-brand-600 to-brand-700 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/30 transition-all hover:from-brand-700 hover:to-brand-800 hover:shadow-xl hover:shadow-brand-500/40 focus:outline-none focus:ring-4 focus:ring-brand-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {loading ? (
                    <>
                      <Loader size="sm" className="text-white" />
                      Verifying...
                    </>
                  ) : (
                    'Verify & Continue'
                  )}
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-brand-700 to-brand-800 opacity-0 transition-opacity group-hover:opacity-100" />
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="mb-3 text-sm text-slate-500">Didn't receive the code?</p>
              <button
                type="button"
                onClick={handleResend}
                disabled={resending || loading}
                className="text-sm font-semibold text-brand-600 transition-colors hover:text-brand-700 disabled:cursor-not-allowed disabled:text-slate-400"
              >
                {resending ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader size="sm" />
                    Resending...
                  </span>
                ) : (
                  'Resend code'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}

export default Otp
