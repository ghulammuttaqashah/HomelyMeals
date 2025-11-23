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
    gradient: 'from-blue-500 to-blue-600',
    hoverGradient: 'from-blue-600 to-blue-700',
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
    gradient: 'from-emerald-500 to-emerald-600',
    hoverGradient: 'from-emerald-600 to-emerald-700',
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
            className="group relative overflow-hidden rounded-2xl bg-white p-8 text-left shadow-lg ring-1 ring-slate-200/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:ring-brand-200"
          >
            <div className={`mb-4 inline-flex rounded-xl bg-gradient-to-r ${card.gradient} p-3 text-white shadow-lg transition-transform group-hover:scale-110`}>
              {card.icon}
            </div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Manage</p>
            <h3 className="mt-2 text-2xl font-bold text-slate-900 transition-colors group-hover:text-brand-600">
              {card.title}
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">{card.description}</p>
            <div className="mt-6 flex items-center text-sm font-semibold text-brand-600 transition-transform group-hover:translate-x-1">
              <span>View details</span>
              <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <div className={`absolute inset-0 bg-gradient-to-br ${card.hoverGradient} opacity-0 transition-opacity group-hover:opacity-5`} />
          </button>
        ))}
      </div>
    </ProtectedLayout>
  )
}

export default Dashboard
