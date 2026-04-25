import { useNavigate } from 'react-router-dom'
import Loader from './Loader'

const StatusCard = ({ type = 'pending', onSignOut, signingOut = false }) => {
  const navigate = useNavigate()
  
  const statusConfig = {
    pending: {
      icon: (
        <svg className="h-16 w-16 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      iconBg: 'bg-yellow-100',
      title: 'Verification Pending',
      message: 'Your documents are under review by our admin team. This usually takes 24-48 hours.',
      statusBoxBg: 'bg-yellow-50',
      statusBoxBorder: 'border-yellow-200',
      statusText: 'text-yellow-900',
      statusSubtext: 'text-yellow-800',
      statusLabel: 'Pending Review',
      statusDescription: 'You will receive an email notification once your documents are reviewed.',
    },
    rejected: {
      icon: (
        <svg className="h-16 w-16 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      iconBg: 'bg-red-100',
      title: 'Verification Rejected',
      message: 'Some of your documents were rejected. Please review the rejection reasons and resubmit the corrected documents.',
      statusBoxBg: 'bg-red-50',
      statusBoxBorder: 'border-red-200',
      statusText: 'text-red-900',
      statusSubtext: 'text-red-800',
      statusLabel: 'Rejected',
      statusDescription: 'Check your email for specific rejection reasons, then resubmit the rejected documents.',
    },
    approved: {
      icon: (
        <svg className="h-16 w-16 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      iconBg: 'bg-green-100',
      title: 'Verification Approved',
      message: 'Your documents have been approved. You can now start serving customers!',
      statusBoxBg: 'bg-green-50',
      statusBoxBorder: 'border-green-200',
      statusText: 'text-green-900',
      statusSubtext: 'text-green-800',
      statusLabel: 'Approved',
      statusDescription: 'You can now access your dashboard and start adding meals.',
    },
  }

  const config = statusConfig[type] || statusConfig.pending

  return (
    <div className="rounded-lg bg-white p-8 shadow-sm border border-gray-200 text-center">
      <div className={`mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full ${config.iconBg}`}>
        {config.icon}
      </div>
      
      <h1 className="text-2xl font-bold text-gray-900">{config.title}</h1>
      <p className="mt-4 text-gray-600">{config.message}</p>

      <div className={`mt-8 rounded-lg ${config.statusBoxBg} p-6 border ${config.statusBoxBorder}`}>
        <p className={`text-sm ${config.statusText}`}>
          <span className="font-semibold">Status:</span> {config.statusLabel}
        </p>
        <p className={`mt-2 text-sm ${config.statusSubtext}`}>
          {config.statusDescription}
        </p>
      </div>

      {type === 'rejected' && (
        <>
          <div className="mt-6 rounded-lg bg-orange-50 p-4 border border-orange-200">
            <p className="text-sm text-orange-800 font-medium mb-3">
              📧 Check your email for detailed rejection reasons
            </p>
            <button
              onClick={() => navigate('/resubmit-documents')}
              className="w-full sm:w-auto rounded-lg bg-orange-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-700 transition-colors"
            >
              Resubmit Documents
            </button>
          </div>
          
          <div className="mt-4 rounded-lg bg-gray-50 p-4 border border-gray-200">
            <p className="text-sm text-gray-600">
              <span className="font-medium">Need help?</span>{' '}
              <a 
                href="mailto:homelymeals4@gmail.com" 
                className="text-orange-600 hover:text-orange-700 hover:underline font-medium"
              >
                homelymeals4@gmail.com
              </a>
            </p>
          </div>
        </>
      )}

      {onSignOut && (
        <div className="mt-8 flex justify-center">
          <button
            onClick={onSignOut}
            disabled={signingOut}
            className="rounded-lg border border-gray-300 bg-white px-6 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {signingOut && <Loader size="sm" className="text-gray-700" />}
            {signingOut ? 'Signing Out...' : 'Sign Out'}
          </button>
        </div>
      )}
    </div>
  )
}

export default StatusCard
