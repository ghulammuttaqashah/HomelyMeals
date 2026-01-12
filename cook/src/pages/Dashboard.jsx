import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
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
    comingSoon: true,
  },
]

const Dashboard = () => {
  const navigate = useNavigate()
  const { cook, isAuthenticated } = useAuth()

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

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Header showSignOut={true} />

      <main className="flex-1 py-12">
        <div className="mx-auto max-w-7xl px-4 lg:px-6">
          {/* Header Section */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="mt-1 text-sm text-gray-600">Welcome back, {cook?.name}!</p>
          </div>

          {/* Cards Grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {cards.map((card) => (
              <button
                key={card.path}
                type="button"
                onClick={() => handleCardClick(card)}
                disabled={card.comingSoon}
                className={`group relative overflow-hidden rounded-lg bg-white p-8 text-left shadow-sm border border-gray-200 transition-all ${
                  card.comingSoon 
                    ? 'cursor-not-allowed opacity-60' 
                    : 'hover:shadow-md hover:border-orange-200'
                }`}
              >
                {card.comingSoon && (
                  <span className="absolute top-4 right-4 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                    Coming Soon
                  </span>
                )}
                <div className="mb-4 inline-flex rounded-lg bg-orange-100 p-3 text-orange-600 shadow-sm">
                  {card.icon}
                </div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Manage
                </p>
                <h3 className="mt-2 text-2xl font-bold text-gray-900">{card.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-gray-600">
                  {card.description}
                </p>
                {!card.comingSoon && (
                  <div className="mt-6 flex items-center text-sm font-semibold text-orange-600">
                    <span>View details</span>
                    <svg
                      className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1"
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
