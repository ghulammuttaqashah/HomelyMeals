import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { toggleServiceStatus } from '../api/auth'
import Loader from '../components/Loader'
import Header from '../components/Header'
import Footer from '../components/Footer'

const cards = [
  {
    title: 'Menu Management',
    description: 'Add, edit, view, and manage your meals and menu items.',
    path: '/menu',
    icon: (
      <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
        />
      </svg>
    ),
    color: 'orange',
  },
  {
    title: 'Orders',
    description: 'View and manage incoming orders from customers.',
    path: '/orders',
    icon: (
      <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
        />
      </svg>
    ),
    color: 'green',
    comingSoon: true,
  },
  {
    title: 'Profile Settings',
    description: 'Update your profile, contact info, and kitchen details.',
    path: '/profile',
    icon: (
      <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
        />
      </svg>
    ),
    color: 'blue',
  },
]

const Dashboard = () => {
  const navigate = useNavigate()
  const { cook, isAuthenticated, refreshCook } = useAuth()
  const [toggling, setToggling] = useState(false)

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

  const handleCardClick = (card) => {
    if (card.comingSoon) {
      return
    }
    navigate(card.path)
  }

  const handleToggleService = async () => {
    setToggling(true)
    try {
      const response = await toggleServiceStatus()
      toast.success(response.message)
      // Refresh cook data to update the UI
      if (refreshCook) {
        await refreshCook()
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to update service status'
      toast.error(message)
    } finally {
      setToggling(false)
    }
  }

  const isOpen = cook?.serviceStatus === 'open'

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Header showSignOut={true} />
     
      <main className="flex-1 py-6 sm:py-8 lg:py-12">
        <div className="mx-auto max-w-7xl px-3 sm:px-4 lg:px-6">
          {/* Header Section */}
          <div className="mb-6 sm:mb-8 flex flex-col gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Dashboard</h1>
              <p className="mt-1 text-xs sm:text-sm text-gray-600">Welcome back, {cook?.name}!</p>
            </div>

            {/* Service Status Toggle */}
            <div className={`flex items-center justify-between gap-3 sm:gap-4 rounded-xl p-3 sm:p-4 shadow-sm border-2 transition-all duration-300 ${
              isOpen 
                ? 'bg-green-50 border-green-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex flex-col">
                <span className="text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wide">Kitchen Status</span>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`relative flex h-2.5 w-2.5 sm:h-3 sm:w-3`}>
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isOpen ? 'bg-green-400' : 'bg-red-400'}`}></span>
                    <span className={`relative inline-flex rounded-full h-2.5 w-2.5 sm:h-3 sm:w-3 ${isOpen ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  </span>
                  <span className={`text-xs sm:text-sm font-bold ${isOpen ? 'text-green-700' : 'text-red-700'}`}>
                    {isOpen ? 'Open for Orders' : 'Closed'}
                  </span>
                </div>
              </div>
              <button
                onClick={handleToggleService}
                disabled={toggling}
                className={`relative inline-flex h-7 w-12 sm:h-8 sm:w-14 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed ${
                  isOpen 
                    ? 'bg-green-500 focus:ring-green-500 hover:bg-green-600' 
                    : 'bg-gray-300 focus:ring-gray-400 hover:bg-gray-400'
                } ${toggling ? 'opacity-70' : ''}`}
                role="switch"
                aria-checked={isOpen}
                aria-label="Toggle kitchen status"
              >
                <span
                  className={`pointer-events-none inline-flex h-6 w-6 sm:h-7 sm:w-7 transform items-center justify-center rounded-full bg-white shadow-lg ring-0 transition-all duration-300 ease-in-out ${
                    isOpen ? 'translate-x-5 sm:translate-x-6' : 'translate-x-0'
                  }`}
                >
                  {toggling ? (
                    <Loader size="sm" />
                  ) : isOpen ? (
                    <svg className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </span>
              </button>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((card) => (
              <button
                key={card.path}
                type="button"
                onClick={() => handleCardClick(card)}
                disabled={card.comingSoon}
                className={`group relative overflow-hidden rounded-lg bg-white p-5 sm:p-8 text-left shadow-sm border border-gray-200 transition-all ${
                  card.comingSoon 
                    ? 'cursor-not-allowed opacity-60' 
                    : 'hover:shadow-md hover:border-orange-200 active:scale-[0.98]'
                }`}
              >
                {card.comingSoon && (
                  <span className="absolute top-3 right-3 sm:top-4 sm:right-4 rounded-full bg-gray-100 px-2 py-0.5 sm:px-2.5 text-[10px] sm:text-xs font-medium text-gray-600">
                    Coming Soon
                  </span>
                )}
                <div className="mb-3 sm:mb-4 inline-flex rounded-lg bg-orange-100 p-2 sm:p-3 text-orange-600 shadow-sm">
                  <div className="h-6 w-6 sm:h-8 sm:w-8">
                    {card.icon}
                  </div>
                </div>
                <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Manage
                </p>
                <h3 className="mt-1.5 sm:mt-2 text-lg sm:text-2xl font-bold text-gray-900">{card.title}</h3>
                <p className="mt-2 sm:mt-3 text-xs sm:text-sm leading-relaxed text-gray-600">
                  {card.description}
                </p>
                {!card.comingSoon && (
                  <div className="mt-4 sm:mt-6 flex items-center text-xs sm:text-sm font-semibold text-orange-600">
                    <span>View details</span>
                    <svg
                      className="ml-1.5 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4 transition-transform group-hover:translate-x-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}

export default Dashboard
