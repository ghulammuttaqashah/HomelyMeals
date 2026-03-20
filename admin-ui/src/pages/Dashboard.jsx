import { useNavigate } from 'react-router-dom'
import ProtectedLayout from '../components/ProtectedLayout'

const cards = [
  {
    title: 'Orders',
    description: 'View and manage all customer orders.',
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
    color: 'purple',
  },
  {
    title: 'Customers',
    description: 'Manage customer access and review account health.',
    path: '/customers',
    icon: (
      <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
        />
      </svg>
    ),
    color: 'orange',
  },
  {
    title: 'Cooks',
    description: 'Review cook activity and onboarding progress.',
    path: '/cooks',
    icon: (
      <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    color: 'green',
  },
  {
    title: 'Delivery Charges',
    description: 'Configure delivery pricing based on distance ranges.',
    path: '/delivery-charges',
    icon: (
      <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
    ),
    color: 'blue',
  },
  {
    title: 'Complaints',
    description: 'Review and manage user complaints and issue warnings.',
    path: '/complaints',
    icon: (
      <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
    ),
    color: 'red',
  },
]

const Dashboard = () => {
  const navigate = useNavigate()

  return (
    <ProtectedLayout title="Dashboard">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <button
            key={card.path}
            type="button"
            onClick={() => navigate(card.path)}
            className="group relative overflow-hidden rounded-lg bg-white p-8 text-left shadow-sm border border-gray-200"
          >
            <div className="mb-4 inline-flex rounded-lg bg-orange-100 p-3 text-orange-600 shadow-sm">
              {card.icon}
            </div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Manage</p>
            <h3 className="mt-2 text-2xl font-bold text-gray-900">
              {card.title}
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-gray-600">{card.description}</p>
            <div className="mt-6 flex items-center text-sm font-semibold text-orange-600">
              <span>View details</span>
              <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        ))}
      </div>
    </ProtectedLayout>
  )
}

export default Dashboard
