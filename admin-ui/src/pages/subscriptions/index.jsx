import { useNavigate } from 'react-router-dom'
import ProtectedLayout from '../../components/ProtectedLayout'
import BackButton from '../../components/BackButton'

const cards = [
  {
    title: 'Subscription Revenue',
    description: 'Track today, monthly, and total subscription earnings with per-plan breakdown.',
    path: '/subscriptions/revenue',
    icon: (
      <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V7m0 9v1m8-5a8 8 0 11-16 0 8 8 0 0116 0z" />
      </svg>
    ),
  },
  {
    title: 'Plan Management',
    description: 'Create, edit, activate/deactivate, and delete subscription plans.',
    path: '/subscriptions/plans',
    icon: (
      <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-6m3 6v-4m2 5H7a2 2 0 01-2-2V6a2 2 0 012-2h5.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V20a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    title: 'Active Subscriptions',
    description: 'Monitor cook subscriptions with plan/status filters and cook search.',
    path: '/subscriptions/active',
    icon: (
      <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5V4H2v16h5m10 0v-8H7v8m10 0H7" />
      </svg>
    ),
  },
]

const SubscriptionLanding = () => {
  const navigate = useNavigate()

  return (
    <ProtectedLayout title="Subscriptions">
      <div className="mb-6">
        <BackButton onClick={() => navigate('/dashboard')} label="Back to Dashboard" />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <button
            key={card.path}
            type="button"
            onClick={() => navigate(card.path)}
            className="group relative cursor-pointer overflow-hidden rounded-lg bg-white p-6 text-left shadow-sm border border-gray-200"
          >
            <div className="mb-4 inline-flex rounded-lg bg-orange-100 p-3 text-orange-600 shadow-sm">{card.icon}</div>
            <h3 className="text-xl font-bold text-gray-900">{card.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">{card.description}</p>
            <div className="mt-4 flex items-center text-sm font-semibold text-orange-600">
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

export default SubscriptionLanding
