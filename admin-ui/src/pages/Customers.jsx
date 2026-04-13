import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import ProtectedLayout from '../components/ProtectedLayout'
import { getCustomers, updateCustomerStatus } from '../api/customers'
import Loader from '../components/Loader'
import BackButton from '../components/BackButton'
import SuspensionModal from '../components/SuspensionModal'
import StatusManagementTable from '../components/StatusManagementTable'

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
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

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

  const filteredCustomers = customers.filter((customer) => {
    const searchLower = searchTerm.toLowerCase()
    const name = customer.name || ''
    const email = customer.email || ''
    const matchesSearch = name.toLowerCase().includes(searchLower) || email.toLowerCase().includes(searchLower)
    const matchesStatus = statusFilter === 'all' || customer.status === statusFilter
    return matchesSearch && matchesStatus
  })

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



  return (
    <ProtectedLayout title="Customers">
      <div className="mb-6">
        <BackButton to="/dashboard" label="Back to Dashboard" />
      </div>

      <div className="rounded-lg bg-white shadow-sm border border-gray-200">
        <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <p className="text-sm font-medium text-gray-600">Manage customer access levels</p>
            {!loading && (
              <button
                type="button"
                onClick={() => fetchCustomers(true)}
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
          <div className="flex items-center gap-3 mt-4">
            <label htmlFor="statusFilter" className="text-sm font-semibold text-gray-700 whitespace-nowrap">Filter by:</label>
            <select
              id="statusFilter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:border-gray-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all cursor-pointer"
            >
              <option value="all">All Customers</option>
              <option value="active">Active Only</option>
              <option value="suspended">Suspended Only</option>
            </select>
          </div>
        </div>
        {(searchTerm || statusFilter !== 'all') && (
          <div className="border-b border-gray-200 bg-blue-50 px-6 py-2">
            <p className="text-xs font-medium text-blue-700">
              Showing {filteredCustomers.length} of {customers.length} customers
            </p>
          </div>
        )}
        <StatusManagementTable
          data={filteredCustomers}
          loading={loading}
          error={error}
          updatingId={updatingId}
          onStatusChange={handleStatusChange}
          onRetry={handleRetry}
          retryCount={retryCount}
          entityType="customer"
        />
        {refreshing && !loading && customers.length > 0 && (
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
        entityName={modalState.customer?.name}
        entityType="customer"
        reason={reason}
        onReasonChange={setReason}
        onConfirm={confirmSuspension}
        onCancel={closeModal}
        isSubmitting={submitting}
      />
    </ProtectedLayout>
  )
}

export default Customers
