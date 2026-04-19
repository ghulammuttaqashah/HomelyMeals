import { useMemo, useState } from 'react'
import StatusBadge from './StatusBadge'
import Loader from './Loader'

const StatusManagementTable = ({ 
  data, 
  loading, 
  error, 
  updatingId, 
  onStatusChange, 
  onResetWarnings,
  onRetry, 
  retryCount,
  entityType = 'entity',
  showPaymentStatus = false
}) => {
  const [resetingId, setResetingId] = useState(null)
  const [resetInput, setResetInput] = useState({})
  const [confirmReset, setConfirmReset] = useState(null) // { item, newCount }

  const handleResetWarnings = async (item) => {
    const itemId = item._id || item.id
    const currentCount = item.warningsCount ?? 0
    const rawVal = resetInput[itemId] !== undefined ? resetInput[itemId] : String(currentCount)
    const val = parseInt(rawVal)
    const newCount = isNaN(val) ? 0 : Math.max(0, val)
    // Show confirmation before proceeding
    setConfirmReset({ item, newCount, currentCount })
  }

  const confirmAndReset = async () => {
    if (!confirmReset) return
    const { item, newCount } = confirmReset
    const itemId = item._id || item.id
    setConfirmReset(null)
    setResetingId(itemId)
    try {
      await onResetWarnings(item, newCount)
      setResetInput(prev => { const n = { ...prev }; delete n[itemId]; return n })
    } finally {
      setResetingId(null)
    }
  }

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

  const WarningsCell = ({ item }) => {
    const itemId = item._id || item.id
    const isReseting = resetingId === itemId
    const warningsCount = item.warningsCount ?? 0
    const inputVal = resetInput[itemId] !== undefined ? resetInput[itemId] : String(warningsCount)
    const isDirty = inputVal !== String(warningsCount)

    return (
      <div className="flex flex-col gap-1.5">
        <span className={`inline-flex items-center gap-1 self-start rounded-full px-2.5 py-0.5 text-xs font-bold border ${
          warningsCount >= 3
            ? 'bg-red-100 text-red-700 border-red-200'
            : warningsCount > 0
              ? 'bg-amber-100 text-amber-700 border-amber-200'
              : 'bg-gray-100 text-gray-500 border-gray-200'
        }`}>
          ⚠️ {warningsCount} warning{warningsCount !== 1 ? 's' : ''}
        </span>
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            min="0"
            value={inputVal}
            onChange={e => setResetInput(prev => ({ ...prev, [itemId]: e.target.value }))}
            className={`w-14 rounded-md border px-2 py-1 text-xs font-semibold text-center focus:outline-none focus:ring-2 transition-colors ${
              isDirty
                ? 'border-orange-400 bg-orange-50 text-orange-700 focus:ring-orange-400'
                : 'border-gray-300 bg-white text-gray-700 focus:ring-gray-300'
            }`}
          />
          <button
            type="button"
            onClick={() => handleResetWarnings(item)}
            disabled={isReseting || !isDirty}
            title={isDirty ? `Set warnings to ${inputVal}` : 'Change the value to enable'}
            className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all shadow-sm ${
              isDirty && !isReseting
                ? 'bg-orange-500 text-white hover:bg-orange-600 cursor-pointer'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isReseting ? <Loader size="sm" /> : (
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            )}
            {isReseting ? '' : 'Apply'}
          </button>
        </div>
      </div>
    )
  }

  const ActionButton = ({ item }) => {
    const itemId = item._id || item.id
    const isUpdating = updatingId === itemId
    return item.status === 'active' ? (
      <button
        type="button"
        onClick={() => onStatusChange(item, 'suspend')}
        disabled={isUpdating}
        className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap"
      >
        Suspend
      </button>
    ) : (
      <button
        type="button"
        onClick={() => onStatusChange(item, 'activate')}
        disabled={isUpdating}
        className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap"
      >
        {isUpdating ? <span className="flex items-center gap-1"><Loader size="sm" />...</span> : 'Activate'}
      </button>
    )
  }

  const rows = useMemo(() => data, [data])

  if (loading) {
    return (
      <div className="relative min-h-[200px] bg-white">
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/60 backdrop-blur-[1.5px]">
          <Loader size="lg" label={`Loading ${entityType}s`} />
        </div>
      </div>
    )
  }

  if (error && !data.length) {
    return (
      <div className="px-6 py-20 text-center bg-white">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
          <svg className="h-8 w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="mb-2 text-sm font-bold text-slate-900">Failed to load {entityType}s</p>
        <p className="mb-4 text-xs text-slate-500">{error}</p>
        <button type="button" onClick={onRetry} className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-bold text-white shadow-md hover:bg-orange-700 transition-all">
          {retryCount > 0 ? `Retry Action (${retryCount})` : 'Retry Loading'}
        </button>
      </div>
    )
  }

  if (!data.length) {
    return (
      <div className="px-6 py-20 text-center bg-white">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
          <svg className="h-8 w-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        </div>
        <p className="text-sm font-bold text-slate-500">No {entityType}s found matching your filters.</p>
      </div>
    )
  }

  return (
  <>
    <div className="relative rounded-b-lg">
      {/* ── Mobile card list (< lg) ── */}
      <div className="lg:hidden divide-y divide-slate-100 bg-white">
        {rows.map((item) => {
          const itemId = item._id || item.id
          const statusReason = item.statusReason || (item.status === 'suspended' ? item.statusReason : null)
          return (
            <div key={itemId} className="p-4 space-y-3">
              {/* Name + status row */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{item.name}</p>
                  <p className="text-xs text-slate-500 truncate">{item.email}</p>
                </div>
                <StatusBadge status={item.status || 'active'} />
              </div>

              {/* Payment info (cooks only) */}
              {showPaymentStatus && (
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="text-slate-500">Payments:</span>
                  {item.isOnlinePaymentEnabled ? (
                    <span className="rounded border border-green-200 bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700">Enabled</span>
                  ) : (
                    <span className="rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs font-semibold text-gray-600">Disabled</span>
                  )}
                  <span className="text-slate-400">·</span>
                  <span className="text-slate-500">KYC:</span>
                  {getPaymentStatusBadge(item.stripeAccountStatus || 'not_started')}
                  {item.stripeAccountId && (
                    <span className="text-slate-400">· ***{item.stripeAccountId.slice(-4)}</span>
                  )}
                </div>
              )}

              {/* Warnings */}
              <WarningsCell item={item} />

              {/* Status reason */}
              {statusReason && (
                <p className="text-xs text-slate-500 bg-slate-50 rounded px-2 py-1">
                  <span className="font-medium">Reason:</span> {statusReason}
                </p>
              )}

              {/* Action */}
              <div className="pt-1">
                <ActionButton item={item} />
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Desktop table (≥ lg) ── */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full divide-y divide-slate-100 text-left" style={{minWidth: showPaymentStatus ? '1100px' : '800px'}}>
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
              <th className="px-6 py-4">Warnings</th>
              <th className="px-6 py-4">Status Reason</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white text-sm divide-y divide-slate-50">
            {rows.map((item) => {
              const itemId = item._id || item.id
              const isUpdating = updatingId === itemId
              return (
                <tr key={itemId} className="border-b border-slate-100 transition-colors hover:bg-slate-50/50">
                  <td className="px-6 py-4 text-sm font-medium text-slate-900">{item.name}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">{item.email}</td>
                  <td className="px-6 py-4"><StatusBadge status={item.status || 'active'} /></td>
                  {showPaymentStatus && (
                    <>
                      <td className="px-6 py-4">
                        {item.isOnlinePaymentEnabled ? (
                          <span className="inline-flex rounded-lg border border-green-200 bg-green-50 px-2 py-1 text-xs font-semibold text-green-700">Enabled</span>
                        ) : (
                          <span className="inline-flex rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-xs font-semibold text-gray-700">Disabled</span>
                        )}
                      </td>
                      <td className="px-6 py-4">{getPaymentStatusBadge(item.stripeAccountStatus || 'not_started')}</td>
                      <td className="px-6 py-4 text-sm text-slate-500">{item.stripeAccountId ? `***${item.stripeAccountId.slice(-4)}` : '-'}</td>
                    </>
                  )}
                  <td className="px-6 py-4"><WarningsCell item={item} /></td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {item.statusReason || item.status === 'suspended' ? item.statusReason : '-'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <ActionButton item={item} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>

    {/* ── Warning Reset Confirmation Modal ── */}
    {confirmReset && (
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 px-4 backdrop-blur-sm">
        <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-200/50">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-amber-100">
              <svg className="h-5 w-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-slate-900">Reset Warnings</h3>
          </div>
          <p className="text-sm text-slate-600 mb-1">
            You are about to change <span className="font-semibold text-slate-800">{confirmReset.item.name}</span>'s warnings from{' '}
            <span className="font-bold text-red-600">{confirmReset.currentCount}</span> to{' '}
            <span className="font-bold text-orange-600">{confirmReset.newCount}</span>.
          </p>
          <p className="text-xs text-slate-500 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-3 mb-5">
            ⚠️ The oldest warning messages will be permanently deleted to match the new count. This cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setConfirmReset(null)}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmAndReset}
              className="rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 transition-colors"
            >
              Confirm Reset
            </button>
          </div>
        </div>
      </div>
    )}
  </>
  )
}

export default StatusManagementTable
