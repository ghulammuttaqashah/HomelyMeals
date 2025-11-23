import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Loader from './Loader'

const ProtectedRoute = ({ children }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated, checkAuth, checkingSession } = useAuth()
  const [allowed, setAllowed] = useState(isAuthenticated)
  const [hasChecked, setHasChecked] = useState(false)

  useEffect(() => {
    let isMounted = true

    const validate = async () => {
      if (hasChecked) return
      setHasChecked(true)

      const ok = await checkAuth()
      if (!isMounted) return
      if (!ok) {
        navigate('/login', { replace: true, state: { from: location.pathname } })
      }
      setAllowed(ok)
    }

    if (!isAuthenticated && !hasChecked) {
      validate()
    } else if (isAuthenticated) {
      setAllowed(true)
    }

    return () => {
      isMounted = false
    }
  }, [checkAuth, isAuthenticated, location.pathname, navigate, hasChecked])

  if (checkingSession || (!allowed && !isAuthenticated)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100">
        <div className="flex flex-col items-center gap-4 rounded-2xl bg-white px-8 py-6 shadow-xl ring-1 ring-slate-200/50">
          <Loader size="lg" />
          <p className="text-sm font-medium text-slate-600">Checking your session…</p>
        </div>
      </div>
    )
  }

  if (!allowed) {
    return null
  }

  return children
}

export default ProtectedRoute
