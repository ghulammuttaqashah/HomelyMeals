import { useNavigate } from 'react-router-dom'
import ProtectedLayout from '../../components/ProtectedLayout'

const cards = [
  {
    title: 'Manage Status of Cook',
    description: 'Suspend or activate cook accounts and manage their status.',
    path: '/cooks/status',
    icon: (
      <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    title: 'Document Verification of Cook',
    description: 'Verify and review cook documents and credentials.',
    path: '/cooks/verification',
    icon: (
      <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
]

const CookManagementLanding = () => {
  const navigate = useNavigate()

  return (
    <ProtectedLayout title="Manage Cooks">
      <div className="grid gap-6 md:grid-cols-2">
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

export default CookManagementLanding

