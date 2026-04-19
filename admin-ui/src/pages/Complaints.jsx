import { useState, useEffect, useCallback } from 'react'
import { toast } from 'react-hot-toast'
import {
  getAllComplaints,
  getComplaintById,
  updateComplaint,
  sendWarning,
  getWarningHistory,
  deleteComplaint,
} from '../api/complaints'
import Header from '../components/Header'
import Footer from '../components/Footer'
import Loader from '../components/Loader'
import BackButton from '../components/BackButton'
import StatusBadge from '../components/StatusBadge'
import {
  FiAlertTriangle,
  FiX,
  FiImage,
  FiAlertCircle,
  FiUser,
  FiShield,
  FiMessageSquare,
  FiSend,
  FiTrash2,
} from 'react-icons/fi'

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'rejected', label: 'Rejected' },
]

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-blue-100 text-blue-800',
  resolved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
}

const Complaints = () => {
  const [complaints, setComplaints] = useState([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 })
  const [filterStatus, setFilterStatus] = useState('')
  const [filterType, setFilterType] = useState('')

  // Detail view state
  const [selectedComplaint, setSelectedComplaint] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [adminResponse, setAdminResponse] = useState('')
  const [newStatus, setNewStatus] = useState('')
  const [updating, setUpdating] = useState(false)

  // Warning state
  const [warningMessage, setWarningMessage] = useState('')
  const [sendingWarning, setSendingWarning] = useState(false)
  const [showWarningForm, setShowWarningForm] = useState(false)
  const [warningTarget, setWarningTarget] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  const handleDelete = async () => {
    if (!confirmDeleteId) return
    setDeletingId(confirmDeleteId)
    setConfirmDeleteId(null)
    try {
      const res = await deleteComplaint(confirmDeleteId)
      toast.success(`Complaint deleted${res.data.warningsRemoved > 0 ? ` · ${res.data.warningsRemoved} warning(s) removed` : ''}`)
      closeDetail()
      fetchComplaints(pagination.page)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete complaint')
    } finally {
      setDeletingId(null)
    }
  }
  const fetchComplaints = useCallback(async (page = 1) => {
    setLoading(true)
    try {
      const params = { page, limit: 10 }
      if (filterStatus) params.status = filterStatus
      if (filterType) params.complainantType = filterType

      const res = await getAllComplaints(params)
      setComplaints(res.data.complaints)
      setPagination(res.data.pagination)
    } catch (error) {
      console.error('Fetch complaints error:', error)
      toast.error('Failed to load complaints')
    } finally {
      setLoading(false)
    }
  }, [filterStatus, filterType])

  useEffect(() => {
    fetchComplaints()
  }, [fetchComplaints])

  const openDetail = async (id) => {
    setDetailLoading(true)
    try {
      const res = await getComplaintById(id)
      const c = res.data.complaint
      setSelectedComplaint(c)
      setAdminResponse(c.adminResponse || '')
      setNewStatus(c.status)
    } catch (error) {
      toast.error('Failed to load complaint details')
    } finally {
      setDetailLoading(false)
    }
  }

  const handleUpdate = async () => {
    if (!selectedComplaint) return
    setUpdating(true)
    try {
      await updateComplaint(selectedComplaint._id, {
        status: newStatus,
        adminResponse: adminResponse.trim(),
      })
      toast.success('Complaint updated successfully')
      // Refresh detail and list
      await openDetail(selectedComplaint._id)
      fetchComplaints(pagination.page)
    } catch (error) {
      toast.error('Failed to update complaint')
    } finally {
      setUpdating(false)
    }
  }

  const handleSendWarning = async () => {
    if (!warningTarget || !warningMessage.trim()) {
      toast.error('Please enter a warning message')
      return
    }
    setSendingWarning(true)
    try {
      const res = await sendWarning(selectedComplaint._id, {
        userId: warningTarget.userId,
        userType: warningTarget.userType,
        message: warningMessage.trim(),
      })
      const data = res.data
      toast.success(
        `Warning sent! Total warnings: ${data.warningsCount}${data.suspended ? ' (Account suspended)' : ''}`
      )
      setWarningMessage('')
      setShowWarningForm(false)
      // Refresh detail
      await openDetail(selectedComplaint._id)
    } catch (error) {
      toast.error('Failed to send warning')
    } finally {
      setSendingWarning(false)
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-PK', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }


  const closeDetail = () => {
    setSelectedComplaint(null)
    setShowWarningForm(false)
    setWarningMessage('')
    setWarningTarget(null)
  }

  // Detail modal content is rendered inline below (not as a nested component)
  // to prevent React from remounting the modal on every state change.

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-6 max-w-6xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Complaints Management</h1>
          <p className="text-gray-500 text-sm mt-1">Review, respond to, and manage complaints from customers and cooks.</p>
          <div className="mt-3">
            <BackButton to="/dashboard" label="Back to Dashboard" />
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 mb-6">
          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="flex-1 sm:flex-none px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 font-medium"
            >
              <option value="">All Status</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="flex-1 sm:flex-none px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 font-medium"
            >
              <option value="">All Users</option>
              <option value="customer">From Customers</option>
              <option value="cook">From Cooks</option>
            </select>
            <div className="sm:ml-auto px-3 py-1.5 bg-orange-50 text-orange-700 rounded-full text-sm font-semibold text-center">
              {pagination.total} complaint{pagination.total !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="relative">
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-white/70 backdrop-blur-[1px]">
              <Loader label="Loading Complaints" />
            </div>
          )}
          {complaints.length === 0 && !loading ? (
          <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-100">
            <FiAlertTriangle className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 font-medium">No complaints found</p>
            <p className="text-gray-400 text-sm mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden min-h-[300px]">
            {/* Mobile cards */}
            <div className="lg:hidden divide-y divide-gray-100">
              {complaints.map((c) => (
                <div
                  key={c._id}
                  onClick={() => openDetail(c._id)}
                  className="p-4 cursor-pointer hover:bg-gray-50 active:bg-gray-100 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="text-sm font-semibold text-gray-800 leading-snug">{c.type}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0 ${STATUS_COLORS[c.status]}`}>
                      {c.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500 mb-1">
                    <span><span className="text-gray-400">From:</span> {c.complainantName} <span className="capitalize text-gray-400">({c.complainantType})</span></span>
                    <span><span className="text-gray-400">Against:</span> {c.againstUserName || '—'}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>Order #{c.orderId?.orderNumber || 'N/A'}</span>
                    <div className="flex items-center gap-2">
                      <span>{formatDate(c.createdAt)}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(c._id) }}
                        disabled={deletingId === c._id}
                        className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50"
                        title="Delete complaint"
                      >
                        <FiTrash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-sm" style={{minWidth: '700px'}}>
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">From</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Against</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Order</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Type</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Date</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {complaints.map((c) => (
                    <tr key={c._id} onClick={() => openDetail(c._id)} className="hover:bg-gray-50 cursor-pointer transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-800 whitespace-nowrap">{c.complainantName}</p>
                        <p className="text-xs text-gray-400 capitalize">{c.complainantType}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-800 whitespace-nowrap">{c.againstUserName || '—'}</p>
                        <p className="text-xs text-gray-400 capitalize">{c.againstUserType || ''}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">#{c.orderId?.orderNumber || 'N/A'}</td>
                      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{c.type}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1 items-center">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${STATUS_COLORS[c.status]}`}>
                            {c.status.replace('_', ' ')}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{formatDate(c.createdAt)}</td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setConfirmDeleteId(c._id)}
                          disabled={deletingId === c._id}
                          className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50"
                          title="Delete complaint"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="mt-4 px-4 py-3 bg-white rounded-lg shadow-sm border border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-sm text-gray-500">
              Page <span className="font-semibold text-gray-700">{pagination.page}</span> of <span className="font-semibold text-gray-700">{pagination.pages}</span>
              <span className="ml-2 text-gray-400">({pagination.total} total)</span>
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => fetchComplaints(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => fetchComplaints(pagination.page + 1)}
                disabled={pagination.page === pagination.pages}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
        </div>
      </main>
      <Footer />

      {/* Loading overlay for detail */}
      {detailLoading && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm">
          <Loader size="lg" label="Loading Details" />
        </div>
      )}
      {/* Inline Detail Modal */}
      {selectedComplaint && (() => {
        const c = selectedComplaint
        return (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white rounded-t-xl z-10">
                <h2 className="text-lg font-bold text-gray-800">Complaint Details</h2>
                <button
                  onClick={closeDetail}
                  className="p-1 hover:bg-gray-100 rounded-full"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 space-y-5">
                {/* Status + Type Header */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[c.status]}`}>
                    {c.status.replace('_', ' ').toUpperCase()}
                  </span>
                  <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
                    {c.type}
                  </span>
                  <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                    From: {c.complainantType}
                  </span>
                </div>

                {/* Users Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <FiUser className="w-4 h-4 text-gray-500" />
                      <p className="text-sm text-gray-500">Complainant ({c.complainantType})</p>
                    </div>
                    <p className="font-semibold">{c.complainant?.name || 'N/A'}</p>
                    <p className="text-sm text-gray-600">{c.complainant?.email}</p>
                    <p className="text-xs text-gray-400">
                      Warnings: {c.complainant?.warningsCount || 0}
                    </p>
                  </div>

                  {c.againstUser && (
                    <div className="bg-red-50 p-3 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <FiAlertCircle className="w-4 h-4 text-red-500" />
                        <p className="text-sm text-gray-500">Against ({c.againstUserType})</p>
                      </div>
                      <p className="font-semibold">{c.againstUser.name}</p>
                      <p className="text-sm text-gray-600">{c.againstUser.email}</p>
                      <p className="text-xs text-gray-400">
                        Warnings: {c.againstUser.warningsCount || 0}
                      </p>
                    </div>
                  )}
                </div>

                {/* Order Info */}
                {c.orderId && (
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-500">Order</p>
                    <p className="font-semibold">#{c.orderId.orderNumber}</p>
                    <p className="text-sm text-gray-600">
                      Rs. {c.orderId.totalAmount} — Status: {c.orderId.status}
                    </p>
                  </div>
                )}

                {/* Related Complaints (Conflict View) */}
                {c.relatedComplaints && c.relatedComplaints.length > 0 && (
                  <div className="border border-yellow-300 bg-yellow-50 p-3 rounded-lg">
                    <p className="text-sm font-semibold text-yellow-800 mb-2 flex items-center gap-1">
                      <FiAlertTriangle className="w-4 h-4" />
                      Conflict: {c.relatedComplaints.length} other complaint(s) on this order
                    </p>
                    {c.relatedComplaints.map((rc) => (
                      <div key={rc._id} className="flex items-center gap-2 text-sm text-yellow-700">
                        <span>• {rc.complainantType}: {rc.type}</span>
                        <span className={`px-2 py-0.5 rounded text-xs ${STATUS_COLORS[rc.status]}`}>
                          {rc.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Description */}
                <div>
                  <p className="text-sm text-gray-500 mb-1">Description</p>
                  <p className="text-gray-800 bg-gray-50 p-3 rounded-lg">{c.description}</p>
                </div>

                {/* Proof Images */}
                {c.proofUrls && c.proofUrls.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-500 mb-2 flex items-center gap-1">
                      <FiImage className="w-4 h-4" /> Proof Images ({c.proofUrls.length})
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {c.proofUrls.map((proof, i) => (
                        <a key={i} href={proof.url} target="_blank" rel="noopener noreferrer">
                          <img
                            src={proof.url}
                            alt={`Proof ${i + 1}`}
                            className="w-full h-28 object-cover rounded-lg border hover:opacity-80 transition-opacity"
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Open Response Thread */}
                <div className="border-t pt-4 space-y-4">
                  <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                    <FiMessageSquare className="w-5 h-5 text-orange-500" />
                    Response Thread
                  </h3>
                  
                  {c.responses && c.responses.length > 0 ? (
                    <div className="space-y-4">
                      {c.responses.map((res, index) => {
                        const isComplainant = res.senderId === c.complainantId;
                        return (
                          <div 
                            key={index} 
                            className={`p-4 rounded-xl border ${isComplainant ? 'bg-orange-50 border-orange-100' : 'bg-gray-50 border-gray-200'}`}
                          >
                            <div className="flex justify-between items-center mb-2">
                              <div>
                                <span className="font-semibold text-gray-800">{res.senderName}</span>
                                <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-white border text-gray-500 uppercase tracking-wide">
                                  {res.senderRole} {isComplainant ? '(Complainant)' : '(Accused)'}
                                </span>
                              </div>
                              <span className="text-xs text-gray-400">{formatDate(res.createdAt)}</span>
                            </div>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">{res.text}</p>
                            
                            {res.proofUrls && res.proofUrls.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-gray-200/50">
                                <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                                  <FiImage className="w-3 h-3" /> Attached Proof
                                </p>
                                <div className="flex gap-2 overflow-x-auto pb-2">
                                  {res.proofUrls.map((proof, i) => (
                                    <a key={i} href={proof.url} target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
                                      <img
                                        src={proof.url}
                                        alt={`Proof ${i + 1}`}
                                        className="h-20 w-32 object-cover rounded border hover:opacity-80 transition-opacity"
                                      />
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg flex items-center gap-3 text-gray-500">
                      <FiMessageSquare className="w-5 h-5 opacity-50" />
                      <p className="text-sm">No responses have been submitted on this thread yet.</p>
                    </div>
                  )}
                </div>

                {/* Admin Actions */}
                <div className="border-t pt-4 space-y-4">
                  <h3 className="font-semibold text-gray-800">Admin Actions</h3>

                  {/* Status Update */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Update Status
                    </label>
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Admin Response */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Admin Response
                    </label>
                    <textarea
                      value={adminResponse}
                      onChange={(e) => setAdminResponse(e.target.value)}
                      rows={3}
                      placeholder="Write your response to the complainant..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none"
                    />
                  </div>

                  <button
                    onClick={handleUpdate}
                    disabled={updating}
                    className="w-full py-2.5 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                  >
                    {updating ? (
                      <>
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Updating...
                      </>
                    ) : 'Save Changes'}
                  </button>

                  <button
                    onClick={() => setConfirmDeleteId(c._id)}
                    disabled={deletingId === c._id}
                    className="w-full py-2.5 bg-white border border-red-300 text-red-600 font-semibold rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                  >
                    <FiTrash2 className="w-4 h-4" />
                    {deletingId === c._id ? 'Deleting...' : 'Delete Complaint'}
                  </button>
                </div>

                {/* Warning Section */}
                <div className="border-t pt-4 space-y-3">
                  <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                    <FiShield className="w-4 h-4 text-red-500" />
                    Warning Actions
                  </h3>

                  {/* Warning buttons for both users */}
                  <div className="flex flex-wrap gap-2">
                    {c.againstUser && (
                      <button
                        onClick={() => {
                          setWarningTarget({
                            userId: c.againstUser._id,
                            userType: c.againstUserType,
                            userName: c.againstUser.name,
                          })
                          setShowWarningForm(true)
                        }}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                      >
                        ⚠️ Warn {c.againstUser.name} ({c.againstUserType})
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setWarningTarget({
                          userId: c.complainant?._id,
                          userType: c.complainantType,
                          userName: c.complainant?.name,
                        })
                        setShowWarningForm(true)
                      }}
                      className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium"
                    >
                      ⚠️ Warn {c.complainant?.name} ({c.complainantType})
                    </button>
                  </div>

                  {/* Warning Form */}
                  {showWarningForm && warningTarget && (
                    <div className="bg-red-50 border border-red-200 p-4 rounded-lg space-y-3">
                      <p className="text-sm font-medium text-red-800">
                        Send warning to: <strong>{warningTarget.userName}</strong> ({warningTarget.userType})
                      </p>
                      <textarea
                        value={warningMessage}
                        onChange={(e) => setWarningMessage(e.target.value)}
                        rows={2}
                        maxLength={500}
                        placeholder="Warning reason/message..."
                        className="w-full px-3 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 resize-none"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleSendWarning}
                          disabled={sendingWarning || !warningMessage.trim()}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors text-sm font-medium flex items-center gap-1.5"
                        >
                          {sendingWarning ? (
                            <>
                              <svg className="animate-spin -ml-1 h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Sending...
                            </>
                          ) : 'Send Warning'}
                        </button>
                        <button
                          onClick={() => {
                            setShowWarningForm(false)
                            setWarningMessage('')
                          }}
                          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Warning History for against user */}
                  {c.againstUserWarnings && c.againstUserWarnings.length > 0 && (
                    <div>
                      <p className="text-sm text-gray-500 mb-2">
                        Warning History ({c.againstUser?.name})
                      </p>
                      <div className="space-y-2">
                        {c.againstUserWarnings.map((w) => (
                          <div key={w._id} className="bg-gray-50 p-2 rounded text-sm">
                            <p className="text-gray-800">{w.message}</p>
                            <p className="text-xs text-gray-400">{formatDate(w.createdAt)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Filed Date */}
                <p className="text-xs text-gray-400 text-center pt-2">
                  Filed on {formatDate(c.createdAt)}
                </p>
              </div>
            </div>
          </div>
        )
      })()}
      {/* Delete Confirmation Modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 px-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-200/50 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-red-100">
                <FiTrash2 className="h-5 w-5 text-red-600" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Delete Complaint</h3>
            </div>
            <p className="text-sm text-slate-600 mb-1">
              This will permanently delete the complaint and remove any warnings linked to it. Affected user warning counts will be adjusted automatically.
            </p>
            <p className="text-xs text-slate-400 mb-6">This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                <FiTrash2 className="h-4 w-4" />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Complaints
