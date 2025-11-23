import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { login as loginRequest, resendOtp, verifyOtp as verifyOtpRequest, logout as logoutRequest } from '../api/auth'
import { getCustomers } from '../api/customers'
import { setUnauthorizedHandler } from '../api/axios'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate()
  const [admin, setAdmin] = useState(null)
  const [pendingEmail, setPendingEmail] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [checkingSession, setCheckingSession] = useState(false)
  const isLoggingOut = useRef(false)

  const resetState = useCallback(() => {
    setAdmin(null)
    setIsAuthenticated(false)
    setPendingEmail('')
  }, [])

  const login = useCallback(
    async (credentials) => {
      await loginRequest(credentials)
      setPendingEmail(credentials.email)
    },
    [setPendingEmail],
  )

  const resendCode = useCallback(async (email) => {
    if (!email) {
      toast.error('Missing email for resend')
      return
    }
    await resendOtp({ email })
  }, [])

  const verifyOtp = useCallback(
    async ({ email, otpCode }) => {
      const data = await verifyOtpRequest({ email, otpCode })
      setAdmin(data?.admin ?? { email })
      setIsAuthenticated(true)
      setPendingEmail('')
    },
    [],
  )

  const logout = useCallback(async () => {
    // Prevent multiple simultaneous logout calls
    if (isLoggingOut.current) {
      return
    }
    
    isLoggingOut.current = true
    const wasAuthenticated = isAuthenticated

    // If already logged out, just reset state and navigate (no toast)
    if (!wasAuthenticated) {
      resetState()
      navigate('/login', { replace: true })
      isLoggingOut.current = false
      return
    }

    try {
      await logoutRequest()
    } catch (error) {
      // ignore logout errors (including 401 if already logged out)
    } finally {
      resetState()
      navigate('/login', { replace: true })
      // Only show toast if user was actually logged in
      if (wasAuthenticated) {
        toast.success('Signed out')
      }
      isLoggingOut.current = false
    }
  }, [navigate, resetState, isAuthenticated])

  useEffect(() => {
    setUnauthorizedHandler(logout)
  }, [logout])

  const checkAuth = useCallback(async () => {
    // If already authenticated, skip check
    if (isAuthenticated) {
      return true
    }
    
    setCheckingSession(true)
    try {
      await getCustomers()
      setIsAuthenticated(true)
      return true
    } catch (error) {
      // Silently fail - this is expected when not authenticated
      resetState()
      return false
    } finally {
      setCheckingSession(false)
    }
  }, [resetState, isAuthenticated])

  const value = useMemo(
    () => ({
      admin,
      isAuthenticated,
      pendingEmail,
      checkingSession,
      login,
      resendCode,
      verifyOtp,
      logout,
      checkAuth,
    }),
    [admin, isAuthenticated, pendingEmail, checkingSession, login, resendCode, verifyOtp, logout, checkAuth],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

