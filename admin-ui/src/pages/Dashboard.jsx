import { useNavigate } from 'react-router-dom'
import ProtectedLayout from '../components/ProtectedLayout'

const cards = [
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
]

const Dashboard = () => {
  const navigate = useNavigate()

  return (
    <ProtectedLayout title="Dashboard">
      <div className="grid gap-6 md:grid-cols-2">
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
