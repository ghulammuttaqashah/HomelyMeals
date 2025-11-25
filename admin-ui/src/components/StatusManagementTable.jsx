import { useMemo } from 'react'
import StatusBadge from './StatusBadge'
import Loader from './Loader'
import { TableSkeleton } from './Skeleton'

const StatusManagementTable = ({ 
  data, 
  loading, 
  error, 
  updatingId, 
  onStatusChange, 
  onRetry, 
  retryCount,
  entityType = 'entity'
}) => {
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

  if (loading) {
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-100 text-left">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-6 py-4 font-semibold">Name</th>
              <th className="px-6 py-4 font-semibold">Email</th>
              <th className="px-6 py-4 font-semibold">Status</th>
              <th className="px-6 py-4 font-semibold">Status Reason</th>
              <th className="px-6 py-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white text-sm">
            <TableSkeleton rows={6} columns={5} />
          </tbody>
        </table>
      </div>
    )
  }

  if (error && !data.length) {
    return (
      <div className="px-6 py-20 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
          <svg className="h-8 w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <p className="mb-2 text-sm font-medium text-slate-900">Failed to load {entityType}s</p>
        <p className="mb-4 text-xs text-slate-500">{error}</p>
        <button
          type="button"
          onClick={onRetry}
          className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-sm"
        >
          {retryCount > 0 ? `Retry (${retryCount})` : 'Retry'}
        </button>
      </div>
    )
  }

  if (!data.length) {
    return (
      <div className="px-6 py-20 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
          <svg className="h-8 w-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
            />
          </svg>
        </div>
        <p className="text-sm font-medium text-slate-500">No {entityType}s found.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-100 text-left">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-6 py-4 font-semibold">Name</th>
            <th className="px-6 py-4 font-semibold">Email</th>
            <th className="px-6 py-4 font-semibold">Status</th>
            <th className="px-6 py-4 font-semibold">Status Reason</th>
            <th className="px-6 py-4 font-semibold text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white text-sm">{tableRows}</tbody>
      </table>
    </div>
  )
}

export default StatusManagementTable
