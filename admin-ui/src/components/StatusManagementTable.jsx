import { useMemo } from 'react'
import StatusBadge from './StatusBadge'
import Loader from './Loader'

const StatusManagementTable = ({ 
  data, 
  loading, 
  error, 
  updatingId, 
  onStatusChange, 
  onRetry, 
  retryCount,
  entityType = 'entity',
  showPaymentStatus = false
}) => {
  const getPaymentStatusBadge = (status) => {
    const badges = {
      not_started: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Not Started' },
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Pending' },
      active: { bg: 'bg-green-100', text: 'text-green-700', label: 'Active' },
      restricted: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Restricted' },
      disabled: { bg: 'bg-red-100', text: 'text-red-700', label: 'Disabled' },
    }
    const badge = badges[status] || badges.not_started
    return (
      <span className={`inline-flex rounded-lg border px-2 py-1 text-xs font-semibold ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    )
  }

  const tableRows = useMemo(() => {
    if (!data.length) return null
    return data.map((item) => {
      const itemId = item._id || item.id
      const isUpdating = updatingId === itemId
      return (
        <tr
          key={itemId}
          className="border-b border-slate-100 transition-colors hover:bg-slate-50/50"
        >
          <td className="px-6 py-4 text-sm font-medium text-slate-900">{item.name}</td>
          <td className="px-6 py-4 text-sm text-slate-500">{item.email}</td>
          <td className="px-6 py-4">
            <StatusBadge status={item.status || 'active'} />
          </td>
          {showPaymentStatus && (
            <>
              <td className="px-6 py-4">
                {item.isOnlinePaymentEnabled ? (
                  <span className="inline-flex rounded-lg border border-green-200 bg-green-50 px-2 py-1 text-xs font-semibold text-green-700">
                    Enabled
                  </span>
                ) : (
                  <span className="inline-flex rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-xs font-semibold text-gray-700">
                    Disabled
                  </span>
                )}
              </td>
              <td className="px-6 py-4">
                {getPaymentStatusBadge(item.stripeAccountStatus || 'not_started')}
              </td>
              <td className="px-6 py-4 text-sm text-slate-500">
                {item.stripeAccountId ? `***${item.stripeAccountId.slice(-4)}` : '-'}
              </td>
            </>
          )}
          <td className="px-6 py-4 text-sm text-slate-500">
            {item.statusReason || item.status === 'suspended' ? item.statusReason : '-'}
          </td>
          <td className="px-6 py-4 text-right">
            <div className="flex justify-end gap-3">
              {item.status === 'active' ? (
                <button
                  type="button"
                  onClick={() => onStatusChange(item, 'suspend')}
                  disabled={isUpdating}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Suspend
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onStatusChange(item, 'activate')}
                  disabled={isUpdating}
                  className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isUpdating ? (
                    <span className="flex items-center gap-2">
                      <Loader size="sm" />
                      Updating...
                    </span>
                  ) : (
                    'Activate'
                  )}
                </button>
              )}
            </div>
          </td>
        </tr>
      )
    })
  }, [data, updatingId, onStatusChange])

  return (
    <div className="relative overflow-hidden rounded-b-lg">
      {/* Loading Overlay - Consistent with Orders page */}
      {loading && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/60 backdrop-blur-[1.5px] transition-all">
          <Loader size="lg" label={`Loading ${entityType}s`} />
        </div>
      )}

      {error && !data.length ? (
        <div className="px-6 py-20 text-center bg-white">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <svg className="h-8 w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="mb-2 text-sm font-bold text-slate-900">Failed to load {entityType}s</p>
          <p className="mb-4 text-xs text-slate-500">{error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-bold text-white shadow-md hover:bg-orange-700 transition-all"
          >
            {retryCount > 0 ? `Retry Action (${retryCount})` : 'Retry Loading'}
          </button>
        </div>
      ) : !data.length && !loading ? (
        <div className="px-6 py-20 text-center bg-white">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
            <svg className="h-8 w-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <p className="text-sm font-bold text-slate-500">No {entityType}s found matching your filters.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-left">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-widest text-slate-500 font-black">
              <tr>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Status</th>
                {showPaymentStatus && (
                  <>
                    <th className="px-6 py-4">Online Payments</th>
                    <th className="px-6 py-4">KYC Status</th>
                    <th className="px-6 py-4">Stripe Account</th>
                  </>
                )}
                <th className="px-6 py-4">Status Reason</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white text-sm divide-y divide-slate-50">
              {tableRows || (
                // Minimal empty rows for backdrop blur during initial load
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="invisible pointer-events-none">
                    <td colSpan={showPaymentStatus ? 8 : 5} className="px-6 py-4 whitespace-nowrap">&nbsp;</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default StatusManagementTable
