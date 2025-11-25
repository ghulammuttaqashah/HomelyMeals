import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import ProtectedLayout from '../../../components/ProtectedLayout'
import { getCooks, updateCookStatus } from '../../../api/cooks'
import Loader from '../../../components/Loader'
import ProgressBar from '../../../components/ProgressBar'
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



  return (
    <ProtectedLayout title="Manage Cook Status">
      <ProgressBar isLoading={loading || refreshing} />
      <div className="rounded-lg bg-white shadow-sm border border-gray-200">
        <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
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
        </div>
        <StatusManagementTable
          data={cooks}
          loading={loading}
          error={error}
          updatingId={updatingId}
          onStatusChange={handleStatusChange}
          onRetry={handleRetry}
          retryCount={retryCount}
          entityType="cook"
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
