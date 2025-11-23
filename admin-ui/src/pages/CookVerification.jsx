import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import ProtectedLayout from '../components/ProtectedLayout'

const CookVerification = () => {
  const navigate = useNavigate()

  const handleComingSoon = () => {
    toast('Coming Soon!', {
      icon: '🚀',
      duration: 3000,
    })
  }

  return (
    <ProtectedLayout title="Document Verification of Cook">
      <div className="rounded-2xl bg-white shadow-lg ring-1 ring-slate-200/50 transition-all">
        <div className="px-6 py-20 text-center">
          <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-brand-100 to-brand-200">
            <svg
              className="h-12 w-12 text-brand-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h3 className="mb-3 text-2xl font-bold text-slate-900">Coming Soon</h3>
          <p className="mb-8 text-sm leading-relaxed text-slate-600 max-w-md mx-auto">
            The document verification feature is currently under development. You'll be able to review and verify cook documents and credentials here soon.
          </p>
          <div className="flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => navigate('/cooks')}
              className="rounded-xl border-2 border-slate-200 px-6 py-3 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50 hover:border-slate-300"
            >
              Back to Cook Management
            </button>
            <button
              type="button"
              onClick={handleComingSoon}
              className="rounded-xl bg-gradient-to-r from-brand-600 to-brand-700 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/30 transition-all hover:from-brand-700 hover:to-brand-800 hover:shadow-xl"
            >
              Learn More
            </button>
          </div>
        </div>
      </div>
    </ProtectedLayout>
  )
}

export default CookVerification

