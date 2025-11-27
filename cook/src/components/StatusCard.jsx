const StatusCard = ({ type = 'pending', onBackToLogin }) => {
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
      message: 'Your documents were rejected. Please contact admin for more information or resubmit your documents.',
      statusBoxBg: 'bg-red-50',
      statusBoxBorder: 'border-red-200',
      statusText: 'text-red-900',
      statusSubtext: 'text-red-800',
      statusLabel: 'Rejected',
      statusDescription: 'Please contact admin or resubmit your documents with correct information.',
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

      {onBackToLogin && (
        <div className="mt-8 flex justify-center gap-4">
          <button
            onClick={onBackToLogin}
            className="rounded-lg border border-gray-300 bg-white px-6 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
          >
            Back to Login
          </button>
        </div>
      )}
    </div>
  )
}

export default StatusCard
