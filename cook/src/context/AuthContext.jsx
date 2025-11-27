import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  signupRequest as signupRequestAPI,
  verifySignupOtp as verifySignupOtpAPI,
  resendSignupOtp as resendSignupOtpAPI,
  signin as signinAPI,
  signout as signoutAPI,
  getCurrentCook as getCurrentCookAPI,
} from '../api/auth'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate()
  const [cook, setCook] = useState(null)
  const [pendingEmail, setPendingEmail] = useState(() => {
    return sessionStorage.getItem('cookPendingEmail') || ''
  })
  const [signupData, setSignupData] = useState(() => {
    const saved = sessionStorage.getItem('cookSignupData')
    return saved ? JSON.parse(saved) : null
  })
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const isLoggingOut = useRef(false)

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const data = await getCurrentCookAPI()
        setCook(data.cook)
        setIsAuthenticated(true)
      } catch (error) {
        // Not authenticated, that's okay
        setCook(null)
        setIsAuthenticated(false)
      } finally {
        setIsLoading(false)
      }
    }
    checkAuth()
  }, [])

  const resetState = useCallback(() => {
    setCook(null)
    setIsAuthenticated(false)
    setPendingEmail('')
    setSignupData(null)
    sessionStorage.removeItem('cookPendingEmail')
    sessionStorage.removeItem('cookSignupData')
  }, [])

  const signupRequest = useCallback(async (data) => {
    await signupRequestAPI(data)
    setPendingEmail(data.email)
    setSignupData(data)
    sessionStorage.setItem('cookPendingEmail', data.email)
    sessionStorage.setItem('cookSignupData', JSON.stringify(data))
  }, [])

  const verifySignupOtp = useCallback(async ({ email, otpCode }) => {
    const result = await verifySignupOtpAPI({ email, otpCode })
    // After verification, sign in the user automatically
    if (signupData?.password) {
      const signinResult = await signinAPI({ email, password: signupData.password })
      setCook(signinResult?.cook ?? { email })
      setIsAuthenticated(true)
    }
    setPendingEmail('')
    setSignupData(null)
    sessionStorage.removeItem('cookPendingEmail')
    sessionStorage.removeItem('cookSignupData')
    return result
  }, [signupData])

  const resendOtp = useCallback(async (email) => {
    if (!email) {
      toast.error('Missing email for resend')
      return
    }
    await resendSignupOtpAPI({ email })
  }, [])

  const signin = useCallback(async (credentials) => {
    const data = await signinAPI(credentials)
    setCook(data?.cook ?? { email: credentials.email })
    setIsAuthenticated(true)
    return data
  }, [])

  const signout = useCallback(async () => {
    if (isLoggingOut.current) {
      return
    }
    
    isLoggingOut.current = true
    const wasAuthenticated = isAuthenticated

    if (!wasAuthenticated) {
      resetState()
      navigate('/login', { replace: true })
      isLoggingOut.current = false
      return
    }

    try {
      await signoutAPI()
    } catch (error) {
      // ignore errors
    } finally {
      resetState()
      navigate('/login', { replace: true })
      if (wasAuthenticated) {
        toast.success('Signed out')
      }
      isLoggingOut.current = false
    }
  }, [navigate, resetState, isAuthenticated])

  const value = useMemo(
    () => ({
      cook,
      isAuthenticated,
      isLoading,
      pendingEmail,
      signupData,
      signupRequest,
      verifySignupOtp,
      resendOtp,
      signin,
      signout,
    }),
    [cook, isAuthenticated, isLoading, pendingEmail, signupData, signupRequest, verifySignupOtp, resendOtp, signin, signout],
  )

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-600 border-t-transparent"></div>
      </div>
    )
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
