import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import ProtectedLayout from '../../../components/ProtectedLayout'
import { getCooks, updateCookStatus, resetCookWarnings } from '../../../api/cooks'
import Loader from '../../../components/Loader'
import BackButton from '../../../components/BackButton'
import SuspensionModal from '../../../components/SuspensionModal'
import StatusManagementTable from '../../../components/StatusManagementTable'

const CookStatus = () => {
  const [cooks, setCooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [modalState, setModalState] = useState({ open: false, cook: null })
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [updatingId, setUpdatingId] = useState(null)
  const [error, setError] = useState(null)
  const [retryCount, setRetryCount] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [paymentFilter, setPaymentFilter] = useState('all')
  const [kycFilter, setKycFilter] = useState('all')

  const fetchCooks = async (showRefreshing = false) => {
    if (showRefreshing) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }
    setError(null)
    
    try {
      const data = await getCooks()
      setCooks(Array.isArray(data) ? data : data?.cooks || [])
      setRetryCount(0)
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to load cooks'
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
    fetchCooks()
  }, [])

  const handleRetry = () => {
    setRetryCount((prev) => prev + 1)
    fetchCooks()
  }

  const filteredCooks = cooks.filter((cook) => {
    const searchLower = searchTerm.toLowerCase()
    const name = cook.name || ''
    const email = cook.email || ''
    const matchesSearch = name.toLowerCase().includes(searchLower) || email.toLowerCase().includes(searchLower)
    const matchesStatus = statusFilter === 'all' || cook.status === statusFilter
    
    const matchesPayment = paymentFilter === 'all' || 
      (paymentFilter === 'enabled' && cook.isOnlinePaymentEnabled) || 
      (paymentFilter === 'disabled' && !cook.isOnlinePaymentEnabled)
    
    const matchesKyc = kycFilter === 'all' || cook.stripeAccountStatus === kycFilter
    
    return matchesSearch && matchesStatus && matchesPayment && matchesKyc
  })

  const openModal = (cook) => {
    setReason('')
    setModalState({ open: true, cook })
  }

  const closeModal = () => {
    setModalState({ open: false, cook: null })
  }

  const handleStatusChange = async (cook, action) => {
    const cookId = cook._id || cook.id
    if (!cookId) {
      toast.error('Cook ID is missing')
      return
    }
    const desiredStatus = action === 'suspend' ? 'suspended' : 'active'
    const payload = { status: desiredStatus }
    if (desiredStatus === 'suspended') {
      openModal(cook)
      return
    }
    
    // Optimistic update
    const previousCooks = [...cooks]
    setCooks((prev) =>
      prev.map((c) => {
        const id = c._id || c.id
        return id === cookId ? { ...c, status: desiredStatus, statusReason: null } : c
      })
    )
    
    setUpdatingId(cookId)
    try {
      await updateCookStatus(cookId, payload)
      toast.success(`Cook ${desiredStatus}`)
      fetchCooks(true)
    } catch (error) {
      // Revert optimistic update
      setCooks(previousCooks)
      const message = error.response?.data?.message || 'Update failed'
      toast.error(message)
    } finally {
      setUpdatingId(null)
    }
  }

  const confirmSuspension = async () => {
    if (!modalState.cook) return
    const cookId = modalState.cook._id || modalState.cook.id
    if (!cookId) {
      toast.error('Cook ID is missing')
      closeModal()
      return
    }
    
    // Optimistic update
    const previousCooks = [...cooks]
    setCooks((prev) =>
      prev.map((c) => {
        const id = c._id || c.id
        return id === cookId ? { ...c, status: 'suspended', statusReason: reason } : c
      })
    )
    closeModal()
    
    setSubmitting(true)
    try {
      await updateCookStatus(cookId, { status: 'suspended', reason })
      toast.success('Cook suspended')
      fetchCooks(true)
    } catch (error) {
      // Revert optimistic update
      setCooks(previousCooks)
      const message = error.response?.data?.message || 'Unable to suspend cook'
      toast.error(message)
      // Reopen modal on error
      openModal(modalState.cook)
    } finally {
      setSubmitting(false)
    }
  }



  const handleResetWarnings = async (cook, newCount) => {
    const cookId = cook._id || cook.id
    try {
      const res = await resetCookWarnings(cookId, newCount)
      toast.success(res.message || 'Warnings updated')
      fetchCooks(true)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reset warnings')
    }
  }

  return (
    <ProtectedLayout title="Manage Cook Status">
      <div className="rounded-lg bg-white shadow-sm border border-gray-200">
        <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <div className="flex items-center gap-3">
              <BackButton />
              <p className="text-sm font-medium text-gray-600">Manage cook account status</p>
            </div>
            {!loading && (
              <button
                type="button"
                onClick={() => fetchCooks(true)}
                disabled={refreshing}
                className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
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
          <div className="flex items-center gap-3">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm placeholder-gray-500 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="inline-flex items-center rounded-lg p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                title="Clear search"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 sm:gap-4 mt-6">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
              <label htmlFor="statusFilter" className="text-sm font-semibold text-gray-700 whitespace-nowrap sm:min-w-fit">Account:</label>
              <select
                id="statusFilter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="flex-1 sm:flex-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:border-gray-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all cursor-pointer"
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
              <label htmlFor="paymentFilter" className="text-sm font-semibold text-gray-700 whitespace-nowrap sm:min-w-fit">Payments:</label>
              <select
                id="paymentFilter"
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="flex-1 sm:flex-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:border-gray-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all cursor-pointer"
              >
                <option value="all">All</option>
                <option value="enabled">Enabled</option>
                <option value="disabled">Disabled</option>
              </select>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
              <label htmlFor="kycFilter" className="text-sm font-semibold text-gray-700 whitespace-nowrap sm:min-w-fit">KYC Status:</label>
              <select
                id="kycFilter"
                value={kycFilter}
                onChange={(e) => setKycFilter(e.target.value)}
                className="flex-1 sm:flex-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:border-gray-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all cursor-pointer"
              >
                <option value="all">All</option>
                <option value="not_started">Not Started</option>
                <option value="pending">Pending</option>
                <option value="active">Active (Verified)</option>
                <option value="restricted">Restricted</option>
                <option value="disabled">Disabled</option>
              </select>
            </div>

            {(searchTerm || statusFilter !== 'all' || paymentFilter !== 'all' || kycFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchTerm('')
                  setStatusFilter('all')
                  setPaymentFilter('all')
                  setKycFilter('all')
                }}
                className="text-xs font-bold text-orange-600 hover:text-orange-700 transition-colors self-start sm:self-center"
              >
                Clear All
              </button>
            )}
          </div>
        </div>
        {(searchTerm || statusFilter !== 'all' || paymentFilter !== 'all' || kycFilter !== 'all') && (
          <div className="border-b border-gray-200 bg-blue-50 px-6 py-2">
            <p className="text-xs font-medium text-blue-700">
              Showing {filteredCooks.length} of {cooks.length} cooks
            </p>
          </div>
        )}
        <StatusManagementTable
          data={filteredCooks}
          loading={loading}
          error={error}
          updatingId={updatingId}
          onStatusChange={handleStatusChange}
          onResetWarnings={handleResetWarnings}
          onRetry={handleRetry}
          retryCount={retryCount}
          entityType="cook"
          showPaymentStatus={true}
        />
        {refreshing && !loading && cooks.length > 0 && (
          <div className="border-t border-slate-100 bg-slate-50/50 px-6 py-3 text-center">
            <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
              <Loader size="sm" />
              Refreshing data...
            </div>
          </div>
        )}
      </div>

      <SuspensionModal
        isOpen={modalState.open}
        entityName={modalState.cook?.name}
        entityType="cook"
        reason={reason}
        onReasonChange={setReason}
        onConfirm={confirmSuspension}
        onCancel={closeModal}
        isSubmitting={submitting}
      />
    </ProtectedLayout>
  )
}

export default CookStatus
