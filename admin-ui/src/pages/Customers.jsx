import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import ProtectedLayout from '../components/ProtectedLayout'
import { getCustomers, updateCustomerStatus } from '../api/customers'
import Loader from '../components/Loader'
import { TableSkeleton } from '../components/Skeleton'
import ProgressBar from '../components/ProgressBar'

const StatusBadge = ({ status }) => {
  const styles =
    status === 'active'
      ? 'bg-green-50 text-green-700 border-green-200'
      : 'bg-red-50 text-red-600 border-red-200'
  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold capitalize transition-all ${styles}`}>
      {status}
    </span>
  )
}

const Customers = () => {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [modalState, setModalState] = useState({ open: false, customer: null })
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [updatingId, setUpdatingId] = useState(null)
  const [error, setError] = useState(null)
  const [retryCount, setRetryCount] = useState(0)

  const fetchCustomers = async (showRefreshing = false) => {
    if (showRefreshing) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }
    setError(null)
    
    try {
      const data = await getCustomers()
      setCustomers(Array.isArray(data) ? data : data?.customers || [])
      setRetryCount(0)
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to load customers'
      setError(message)
      if (!showRefreshing) {
        toast.error(message)
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchCustomers()
  }, [])

  const handleRetry = () => {
    setRetryCount((prev) => prev + 1)
    fetchCustomers()
  }

  const openModal = (customer) => {
    setReason('')
    setModalState({ open: true, customer })
  }

  const closeModal = () => {
    setModalState({ open: false, customer: null })
  }

  const handleStatusChange = async (customer, action) => {
    const customerId = customer._id || customer.id
    if (!customerId) {
      toast.error('Customer ID is missing')
      return
    }
    const desiredStatus = action === 'suspend' ? 'suspended' : 'active'
    const payload = { status: desiredStatus }
    if (desiredStatus === 'suspended') {
      openModal(customer)
      return
    }
    
    // Optimistic update
    const previousCustomers = [...customers]
    setCustomers((prev) =>
      prev.map((c) => {
        const id = c._id || c.id
        return id === customerId ? { ...c, status: desiredStatus, statusReason: null } : c
      })
    )
    
    setUpdatingId(customerId)
    try {
      await updateCustomerStatus(customerId, payload)
      toast.success(`Customer ${desiredStatus}`)
      // Refresh to ensure consistency
      fetchCustomers(true)
    } catch (error) {
      // Revert optimistic update
      setCustomers(previousCustomers)
      const message = error.response?.data?.message || 'Update failed'
      toast.error(message)
    } finally {
      setUpdatingId(null)
    }
  }

  const confirmSuspension = async () => {
    if (!modalState.customer) return
    const customerId = modalState.customer._id || modalState.customer.id
    if (!customerId) {
      toast.error('Customer ID is missing')
      closeModal()
      return
    }
    
    // Optimistic update
    const previousCustomers = [...customers]
    setCustomers((prev) =>
      prev.map((c) => {
        const id = c._id || c.id
        return id === customerId ? { ...c, status: 'suspended', statusReason: reason } : c
      })
    )
    closeModal()
    
    setSubmitting(true)
    try {
      await updateCustomerStatus(customerId, { status: 'suspended', reason })
      toast.success('Customer suspended')
      fetchCustomers(true)
    } catch (error) {
      // Revert optimistic update
      setCustomers(previousCustomers)
      const message = error.response?.data?.message || 'Unable to suspend customer'
      toast.error(message)
      // Reopen modal on error
      openModal(modalState.customer)
    } finally {
      setSubmitting(false)
    }
  }

  const tableRows = useMemo(() => {
    if (!customers.length) return null
    return customers.map((customer) => {
      const customerId = customer._id || customer.id
      const isUpdating = updatingId === customerId
      return (
        <tr
          key={customerId}
          className="border-b border-slate-100 transition-colors hover:bg-slate-50/50"
        >
          <td className="px-6 py-4 text-sm font-medium text-slate-900">{customer.name}</td>
          <td className="px-6 py-4 text-sm text-slate-500">{customer.email}</td>
          <td className="px-6 py-4">
            <StatusBadge status={customer.status} />
          </td>
          <td className="px-6 py-4 text-sm text-slate-500">
            {customer.statusReason || customer.status === 'suspended' ? customer.statusReason : '-'}
          </td>
          <td className="px-6 py-4 text-right">
            <div className="flex justify-end gap-3">
              {customer.status === 'active' ? (
                <button
                  type="button"
                  onClick={() => handleStatusChange(customer, 'suspend')}
                  disabled={isUpdating}
                  className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 transition-all hover:bg-red-50 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Suspend
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleStatusChange(customer, 'activate')}
                  disabled={isUpdating}
                  className="rounded-lg border border-green-200 px-4 py-2 text-sm font-semibold text-green-600 transition-all hover:bg-green-50 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
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
  }, [customers, updatingId])

  return (
    <ProtectedLayout title="Customers">
      <ProgressBar isLoading={loading || refreshing} />
      <div className="rounded-2xl bg-white shadow-lg ring-1 ring-slate-200/50 transition-all">
        <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-600">Manage customer access levels</p>
            {!loading && (
              <button
                type="button"
                onClick={() => fetchCustomers(true)}
                disabled={refreshing}
                className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-all hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {refreshing ? (
                  <>
                    <Loader size="sm" />
                    Refreshing...
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh
                  </>
                )}
              </button>
            )}
          </div>
        </div>
        {loading ? (
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
        ) : error && !customers.length ? (
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
            <p className="mb-2 text-sm font-medium text-slate-900">Failed to load customers</p>
            <p className="mb-4 text-xs text-slate-500">{error}</p>
            <button
              type="button"
              onClick={handleRetry}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-brand-700"
            >
              {retryCount > 0 ? `Retry (${retryCount})` : 'Retry'}
            </button>
          </div>
        ) : customers.length ? (
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
            {refreshing && (
              <div className="border-t border-slate-100 bg-slate-50/50 px-6 py-3 text-center">
                <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
                  <Loader size="sm" />
                  Refreshing data...
                </div>
              </div>
            )}
          </div>
        ) : (
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
            <p className="text-sm font-medium text-slate-500">No customers found.</p>
          </div>
        )}
      </div>

      {modalState.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-200/50 animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-slate-900">Suspend customer</h3>
            <p className="mt-2 text-sm text-slate-600">
              Please provide a reason for suspending <span className="font-medium text-slate-900">{modalState.customer?.name}</span>.
            </p>
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={4}
              className="mt-4 w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-sm transition-all focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-100"
              placeholder="Add suspension reason..."
            />
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-xl border-2 border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-50 hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmSuspension}
                disabled={!reason.trim() || submitting}
                className="rounded-xl bg-gradient-to-r from-red-600 to-red-700 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-red-500/30 transition-all hover:from-red-700 hover:to-red-800 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <Loader size="sm" className="text-white" />
                    Processing…
                  </span>
                ) : (
                  'Suspend'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </ProtectedLayout>
  )
}

export default Customers
