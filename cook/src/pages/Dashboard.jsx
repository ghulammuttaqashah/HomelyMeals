import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { toggleServiceStatus } from '../api/auth'
import { getDashboardStats } from '../api/dashboard'
import { subscribeToNewOrders, subscribeToOrderUpdates, initializeSocket } from '../utils/socket'
import Loader from '../components/Loader'
import Header from '../components/Header'
import Footer from '../components/Footer'

const Dashboard = () => {
  const navigate = useNavigate()
  const { cook, isAuthenticated, refreshCook } = useAuth()
  const [toggling, setToggling] = useState(false)
  const [stats, setStats] = useState(null)
  const [loadingStats, setLoadingStats] = useState(true)

  const fetchStats = useCallback(async () => {
    if (isAuthenticated && cook?.verificationStatus === 'approved') {
      try {
        setLoadingStats(true)
        const data = await getDashboardStats()
        setStats(data)
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error)
      } finally {
        setLoadingStats(false)
      }
    }
  }, [isAuthenticated, cook?.verificationStatus])

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true })
      return
    }

    const status = cook?.verificationStatus
    if (status === 'not_started') {
      navigate('/upload-docs', { replace: true })
    } else if (status === 'pending' || status === 'rejected') {
      navigate('/status', { replace: true })
    }
  }, [isAuthenticated, cook, navigate])

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 30000)
    return () => clearInterval(interval)
  }, [fetchStats])

  // Real-time socket updates for dashboard counts
  useEffect(() => {
    if (!isAuthenticated || cook?.verificationStatus !== 'approved') return

    initializeSocket()

    const unsubNewOrder = subscribeToNewOrders(() => {
      fetchStats()
    })

    const unsubOrderUpdate = subscribeToOrderUpdates(() => {
      fetchStats()
    })

    return () => {
      unsubNewOrder()
      unsubOrderUpdate()
    }
  }, [isAuthenticated, cook?.verificationStatus, fetchStats])

  const handleCardClick = (path) => {
    navigate(path)
  }

  const handleToggleService = async () => {
    setToggling(true)
    try {
      const response = await toggleServiceStatus()
      toast.success(response.message)
      if (refreshCook) {
        await refreshCook()
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Couldn\'t update your status. Please try again.'
      toast.error(message)
    } finally {
      setToggling(false)
    }
  }

  const hasActiveSubscription = Boolean(cook?.hasActiveSubscription)
  const isOpen = hasActiveSubscription && cook?.serviceStatus === 'open'

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Header showSignOut={true} />

      <main className="flex-1 py-6 sm:py-8 lg:py-12">
        <div className="mx-auto max-w-7xl px-3 sm:px-4 lg:px-6">
          {/* Header Section */}
          <div className="mb-6 sm:mb-8 flex items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Dashboard</h1>
              <p className="mt-1 text-xs sm:text-sm text-gray-600">Welcome back, {cook?.name}!</p>
            </div>

            {/* Service Status Toggle - Compact */}
            <div className={`flex items-center gap-3 rounded-lg px-3 py-2 shadow-sm border transition-all duration-300 ${isOpen
              ? 'bg-green-50 border-green-200'
              : 'bg-red-50 border-red-200'
              }`}>
              <div className="flex items-center gap-2">
                <span className={`relative flex h-2 w-2`}>
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isOpen ? 'bg-green-400' : 'bg-red-400'}`}></span>
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${isOpen ? 'bg-green-500' : 'bg-red-500'}`}></span>
                </span>
                <span className={`text-xs font-semibold ${isOpen ? 'text-green-700' : 'text-red-700'}`}>
                  {isOpen ? 'Open' : 'Closed'}
                </span>
              </div>
              <button
                onClick={handleToggleService}
                disabled={toggling || !hasActiveSubscription}
                className={`relative inline-flex h-6 w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:cursor-not-allowed ${isOpen
                  ? 'bg-green-500 focus:ring-green-500 hover:bg-green-600'
                  : 'bg-gray-300 focus:ring-gray-400 hover:bg-gray-400'
                  } ${toggling ? 'opacity-70' : ''}`}
                role="switch"
                aria-checked={isOpen}
                aria-label="Toggle kitchen status"
              >
                <span
                  className={`pointer-events-none inline-flex h-5 w-5 transform items-center justify-center rounded-full bg-white shadow ring-0 transition-all duration-300 ease-in-out ${isOpen ? 'translate-x-4' : 'translate-x-0'
                    }`}
                >
                  {toggling ? (
                    <Loader size="sm" />
                  ) : isOpen ? (
                    <svg className="h-3 w-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="h-3 w-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </span>
              </button>
            </div>
          </div>

          {/* Cards Grid - Ordered to match header navigation */}
          <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">

            {/* 1. Sales Analytics Card */}
            <button
              type="button"
              onClick={() => handleCardClick('/sales')}
              className="group relative overflow-hidden rounded-lg bg-white p-5 sm:p-8 text-left shadow-sm border border-gray-200 transition-all hover:shadow-md hover:border-orange-200 active:scale-[0.98]"
            >
              <div className="mb-3 sm:mb-4 inline-flex rounded-lg bg-orange-100 p-2 sm:p-3 text-orange-600 shadow-sm">
                <svg className="h-6 w-6 sm:h-8 sm:w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-gray-500">Analytics</p>
              <h3 className="mt-1.5 sm:mt-2 text-lg sm:text-2xl font-bold text-gray-900">Sales Dashboard</h3>
              <p className="mt-2 sm:mt-3 text-xs sm:text-sm leading-relaxed text-gray-600">
                Track your revenue, orders, and top-selling meals.
              </p>
              {!loadingStats && stats && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                    Rs {stats.revenue.today.toLocaleString()} today
                  </span>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                    Rs {stats.revenue.thisMonth.toLocaleString()} this month
                  </span>
                </div>
              )}
              <div className="mt-4 sm:mt-6 flex items-center text-xs sm:text-sm font-semibold text-orange-600">
                <span>View analytics</span>
                <svg className="ml-1.5 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>

            {/* 2. Orders Card */}
            <button
              type="button"
              onClick={() => handleCardClick('/orders')}
              className="group relative overflow-hidden rounded-lg bg-white p-5 sm:p-8 text-left shadow-sm border border-gray-200 transition-all hover:shadow-md hover:border-orange-200 active:scale-[0.98]"
            >
              {stats?.orders?.active > 0 && (
                <span className="absolute top-3 right-3 sm:top-4 sm:right-4 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white animate-pulse">
                  {stats.orders.active > 9 ? '9+' : stats.orders.active}
                </span>
              )}
              <div className="mb-3 sm:mb-4 inline-flex rounded-lg bg-orange-100 p-2 sm:p-3 text-orange-600 shadow-sm">
                <svg className="h-6 w-6 sm:h-8 sm:w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-gray-500">Manage</p>
              <h3 className="mt-1.5 sm:mt-2 text-lg sm:text-2xl font-bold text-gray-900">Orders</h3>
              <p className="mt-2 sm:mt-3 text-xs sm:text-sm leading-relaxed text-gray-600">
                View and manage incoming orders from customers.
              </p>
              {!loadingStats && stats && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {stats.orders.active > 0 && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                      {stats.orders.active} active
                    </span>
                  )}
                  {stats.orders.today > 0 && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                      {stats.orders.today} today
                    </span>
                  )}
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                    {stats.orders.totalDelivered} delivered
                  </span>
                </div>
              )}
              <div className="mt-4 sm:mt-6 flex items-center text-xs sm:text-sm font-semibold text-orange-600">
                <span>View orders</span>
                <svg className="ml-1.5 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>

            {/* 3. Menu Management Card */}
            <button
              type="button"
              onClick={() => handleCardClick('/menu')}
              className="group relative overflow-hidden rounded-lg bg-white p-5 sm:p-8 text-left shadow-sm border border-gray-200 transition-all hover:shadow-md hover:border-orange-200 active:scale-[0.98]"
            >
              <div className="mb-3 sm:mb-4 inline-flex rounded-lg bg-orange-100 p-2 sm:p-3 text-orange-600 shadow-sm">
                <svg className="h-6 w-6 sm:h-8 sm:w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-gray-500">Manage</p>
              <h3 className="mt-1.5 sm:mt-2 text-lg sm:text-2xl font-bold text-gray-900">Menu Management</h3>
              <p className="mt-2 sm:mt-3 text-xs sm:text-sm leading-relaxed text-gray-600">
                Add, edit, view, and manage your meals and menu items.
              </p>
              {!loadingStats && stats && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                    {stats.menu.total} meals
                  </span>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                    {stats.menu.available} available
                  </span>
                </div>
              )}
              <div className="mt-4 sm:mt-6 flex items-center text-xs sm:text-sm font-semibold text-orange-600">
                <span>View menu</span>
                <svg className="ml-1.5 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>

            {/* 4. Chats Card */}
            <button
              type="button"
              onClick={() => handleCardClick('/chats')}
              className="group relative overflow-hidden rounded-lg bg-white p-5 sm:p-8 text-left shadow-sm border border-gray-200 transition-all hover:shadow-md hover:border-orange-200 active:scale-[0.98]"
            >
              {stats?.chats?.unread > 0 && (
                <span className="absolute top-3 right-3 sm:top-4 sm:right-4 flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-xs font-bold text-white animate-pulse">
                  {stats.chats.unread > 9 ? '9+' : stats.chats.unread}
                </span>
              )}
              <div className="mb-3 sm:mb-4 inline-flex rounded-lg bg-orange-100 p-2 sm:p-3 text-orange-600 shadow-sm">
                <svg className="h-6 w-6 sm:h-8 sm:w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-gray-500">Messages</p>
              <h3 className="mt-1.5 sm:mt-2 text-lg sm:text-2xl font-bold text-gray-900">Chats</h3>
              <p className="mt-2 sm:mt-3 text-xs sm:text-sm leading-relaxed text-gray-600">
                Chat with your customers and respond to inquiries.
              </p>
              {!loadingStats && stats && stats.chats.unread > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                    {stats.chats.unread} unread
                  </span>
                </div>
              )}
              <div className="mt-4 sm:mt-6 flex items-center text-xs sm:text-sm font-semibold text-orange-600">
                <span>View chats</span>
                <svg className="ml-1.5 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>

            {/* 5. Reviews Card */}
            <button
              type="button"
              onClick={() => handleCardClick('/reviews')}
              className="group relative overflow-hidden rounded-lg bg-white p-5 sm:p-8 text-left shadow-sm border border-gray-200 transition-all hover:shadow-md hover:border-orange-200 active:scale-[0.98]"
            >
              {stats?.reviews?.recentCount > 0 && (
                <span className="absolute top-3 right-3 sm:top-4 sm:right-4 flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-xs font-bold text-white">
                  {stats.reviews.recentCount > 9 ? '9+' : stats.reviews.recentCount}
                </span>
              )}
              <div className="mb-3 sm:mb-4 inline-flex rounded-lg bg-orange-100 p-2 sm:p-3 text-orange-600 shadow-sm">
                <svg className="h-6 w-6 sm:h-8 sm:w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </div>
              <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-gray-500">Feedback</p>
              <h3 className="mt-1.5 sm:mt-2 text-lg sm:text-2xl font-bold text-gray-900">Reviews</h3>
              <p className="mt-2 sm:mt-3 text-xs sm:text-sm leading-relaxed text-gray-600">
                See what customers are saying about you and your meals.
              </p>
              {!loadingStats && stats && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {stats.reviews.totalReviews > 0 && (
                    <>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                        ⭐ {stats.reviews.averageRating} avg
                      </span>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                        {stats.reviews.totalReviews} total
                      </span>
                    </>
                  )}
                </div>
              )}
              <div className="mt-4 sm:mt-6 flex items-center text-xs sm:text-sm font-semibold text-orange-600">
                <span>View reviews</span>
                <svg className="ml-1.5 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>

            {/* 6. Complaints Card */}
            <button
              type="button"
              onClick={() => handleCardClick('/complaints')}
              className="group relative overflow-hidden rounded-lg bg-white p-5 sm:p-8 text-left shadow-sm border border-gray-200 transition-all hover:shadow-md hover:border-orange-200 active:scale-[0.98]"
            >
              <div className="mb-3 sm:mb-4 inline-flex rounded-lg bg-orange-100 p-2 sm:p-3 text-orange-600 shadow-sm">
                <svg className="h-6 w-6 sm:h-8 sm:w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-gray-500">Support</p>
              <h3 className="mt-1.5 sm:mt-2 text-lg sm:text-2xl font-bold text-gray-900">Complaints</h3>
              <p className="mt-2 sm:mt-3 text-xs sm:text-sm leading-relaxed text-gray-600">
                File and track complaints regarding orders or customers.
              </p>
              <div className="mt-4 sm:mt-6 flex items-center text-xs sm:text-sm font-semibold text-orange-600">
                <span>View complaints</span>
                <svg className="ml-1.5 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>

            {/* 7. Payment Settings Card */}
            <button
              type="button"
              onClick={() => handleCardClick('/payment-settings')}
              className="group relative overflow-hidden rounded-lg bg-white p-5 sm:p-8 text-left shadow-sm border border-gray-200 transition-all hover:shadow-md hover:border-orange-200 active:scale-[0.98]"
            >
              <div className="mb-3 sm:mb-4 inline-flex rounded-lg bg-orange-100 p-2 sm:p-3 text-orange-600 shadow-sm">
                <svg className="h-6 w-6 sm:h-8 sm:w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-gray-500">Payments</p>
              <h3 className="mt-1.5 sm:mt-2 text-lg sm:text-2xl font-bold text-gray-900">Payment Settings</h3>
              <p className="mt-2 sm:mt-3 text-xs sm:text-sm leading-relaxed text-gray-600">
                Set up online payments and manage your Stripe account.
              </p>
              <div className="mt-4 sm:mt-6 flex items-center text-xs sm:text-sm font-semibold text-orange-600">
                <span>Manage payments</span>
                <svg className="ml-1.5 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>

            {/* 8. Subscription Card */}
            <button
              type="button"
              onClick={() => handleCardClick('/subscription')}
              className="group relative overflow-hidden rounded-lg bg-white p-5 sm:p-8 text-left shadow-sm border border-gray-200 transition-all hover:shadow-md hover:border-orange-200 active:scale-[0.98]"
            >
              <div className="mb-3 sm:mb-4 inline-flex rounded-lg bg-orange-100 p-2 sm:p-3 text-orange-600 shadow-sm">
                <svg className="h-6 w-6 sm:h-8 sm:w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V7m0 9v1m8-5a8 8 0 11-16 0 8 8 0 0116 0z" />
                </svg>
              </div>
              <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-gray-500">Billing</p>
              <h3 className="mt-1.5 sm:mt-2 text-lg sm:text-2xl font-bold text-gray-900">Subscription</h3>
              <p className="mt-2 sm:mt-3 text-xs sm:text-sm leading-relaxed text-gray-600">
                View plans, subscribe with Stripe, and track your expiry date.
              </p>
              <div className="mt-4 sm:mt-6 flex items-center text-xs sm:text-sm font-semibold text-orange-600">
                <span>Manage subscription</span>
                <svg className="ml-1.5 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>

            {/* 9. Profile Card */}
            <button
              type="button"
              onClick={() => handleCardClick('/profile')}
              className="group relative overflow-hidden rounded-lg bg-white p-5 sm:p-8 text-left shadow-sm border border-gray-200 transition-all hover:shadow-md hover:border-orange-200 active:scale-[0.98]"
            >
              <div className="mb-3 sm:mb-4 inline-flex rounded-lg bg-orange-100 p-2 sm:p-3 text-orange-600 shadow-sm">
                <svg className="h-6 w-6 sm:h-8 sm:w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-gray-500">Manage</p>
              <h3 className="mt-1.5 sm:mt-2 text-lg sm:text-2xl font-bold text-gray-900">Profile Settings</h3>
              <p className="mt-2 sm:mt-3 text-xs sm:text-sm leading-relaxed text-gray-600">
                Update your profile, contact info, and kitchen details.
              </p>
              <div className="mt-4 sm:mt-6 flex items-center text-xs sm:text-sm font-semibold text-orange-600">
                <span>View profile</span>
                <svg className="ml-1.5 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>

          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}

export default Dashboard
