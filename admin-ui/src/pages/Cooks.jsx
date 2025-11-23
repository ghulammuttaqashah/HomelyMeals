import { useNavigate } from 'react-router-dom'
import ProtectedLayout from '../components/ProtectedLayout'

const cards = [
  {
    title: 'Manage Status of Cook',
    description: 'Suspend or activate cook accounts and manage their status.',
    path: '/cooks/status',
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
    gradient: 'from-blue-500 to-blue-600',
    hoverGradient: 'from-blue-600 to-blue-700',
  },
  {
    title: 'Document Verification of Cook',
    description: 'Verify and review cook documents and credentials.',
    path: '/cooks/verification',
    icon: (
      <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    ),
    gradient: 'from-emerald-500 to-emerald-600',
    hoverGradient: 'from-emerald-600 to-emerald-700',
  },
]

const Cooks = () => {
  const navigate = useNavigate()

  return (
    <ProtectedLayout title="Manage Cooks">
      <div className="grid gap-6 md:grid-cols-2">
        {cards.map((card) => (
          <button
            key={card.path}
            type="button"
            onClick={() => navigate(card.path)}
            className="group relative overflow-hidden rounded-xl bg-white p-6 text-left shadow transition cursor-pointer hover:shadow-lg"
          >
            <div className={`mb-4 inline-flex rounded-xl bg-gradient-to-r ${card.gradient} p-3 text-white shadow-lg transition-transform group-hover:scale-110`}>
              {card.icon}
            </div>
            <h3 className="text-xl font-bold text-slate-900 transition-colors group-hover:text-brand-600">
              {card.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{card.description}</p>
            <div className="mt-4 flex items-center text-sm font-semibold text-brand-600 transition-transform group-hover:translate-x-1">
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

export default Cooks
