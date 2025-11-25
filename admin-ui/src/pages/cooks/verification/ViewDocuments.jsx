import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import ProtectedLayout from '../../../components/ProtectedLayout'
import Loader from '../../../components/Loader'
import {
  approveAllCookDocuments,
  approveCookDocument,
  getCookDocuments,
  rejectCookDocument,
} from '../../../api/cookDocuments'

const rejectionFieldsWithIndex = new Set(['kitchenPhotos', 'kitchenPhoto', 'gallery'])

const pickUrl = (input) => {
  if (!input) return null
  if (typeof input === 'string') return input
  // Backend returns: { url: "...", status: "...", rejectedReason: "..." }
  return input.url || input.fileUrl || input.path || input.file?.url || input.file?.path || input.imageUrl || null
}

const looksLikeDocument = (value) => {
  if (!value) return false
  if (typeof value === 'string') return true
  if (typeof value === 'object') {
    return Boolean(pickUrl(value))
  }
  return false
}

const collectDocumentCollections = (payload) => {
  const visited = new Set()
  const collections = []

  const traverse = (node) => {
    if (!node || typeof node !== 'object') return
    if (visited.has(node)) return
    visited.add(node)

    if (Array.isArray(node)) {
      if (node.some(looksLikeDocument)) {
        collections.push(node)
        return
      }
      node.forEach(traverse)
      return
    }

    if (looksLikeDocument(node)) {
      collections.push([node])
      return
    }

    Object.values(node).forEach(traverse)
  }

  traverse(payload)
  return collections
}

const normalizeDocuments = (documents) => {
  if (!documents) return []

  if (Array.isArray(documents)) {
    return documents.map((doc, idx) => {
      const entry = typeof doc === 'string' ? { url: doc } : doc
      const fieldName = entry.field || entry.type || entry.name || `document-${idx}`
      return {
        key: entry.key || `${fieldName}-${idx}`,
        ...entry,
        index: entry.index ?? idx,
        url: pickUrl(entry),
        label: entry.label || entry.title || fieldName || `Document ${idx + 1}`,
        field: fieldName,
      }
    })
  }

  if (typeof documents === 'object') {
    const result = []
    const fieldLabels = {
      cnicFront: 'CNIC Front',
      cnicBack: 'CNIC Back',
      sfaLicense: 'SFA License',
      kitchenPhotos: 'Kitchen Photo',
      other: 'Other Document'
    }
    
    Object.entries(documents).forEach(([field, value]) => {
      // Skip metadata fields
      if (field === 'verifiedByAdmin' || field === 'verifiedAt') return
      if (!value) return
      
      if (Array.isArray(value)) {
        value.forEach((doc, idx) => {
          if (!doc || typeof doc !== 'object') return
          const url = pickUrl(doc)
          if (!url) return
          
          result.push({
            key: `${field}-${idx}`,
            field: field,
            label: `${fieldLabels[field] || field} ${value.length > 1 ? `#${idx + 1}` : ''}`.trim(),
            url: url,
            status: doc.status || 'pending',
            rejectedReason: doc.rejectedReason,
            index: idx,
          })
        })
      } else if (typeof value === 'object') {
        const url = pickUrl(value)
        if (!url) return
        
        result.push({
          key: field,
          field: field,
          label: fieldLabels[field] || field,
          url: url,
          status: value.status || 'pending',
          rejectedReason: value.rejectedReason,
        })
      }
    })
    return result
  }

  return []
}

const ViewDocuments = () => {
  const { cookId } = useParams()
  const navigate = useNavigate()
  const [cook, setCook] = useState(null)
  const [documents, setDocuments] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [rejectModal, setRejectModal] = useState({ open: false, doc: null, reason: '' })
  const [direction, setDirection] = useState(0) // 1 for next, -1 for prev

  const currentDocument = useMemo(() => documents[currentIndex] || null, [documents, currentIndex])

  const goToNext = () => {
    if (currentIndex < documents.length - 1) {
      setDirection(1)
      setCurrentIndex((prev) => prev + 1)
    }
  }

  const goToPrev = () => {
    if (currentIndex > 0) {
      setDirection(-1)
      setCurrentIndex((prev) => prev - 1)
    }
  }

  const loadDocuments = async () => {
    if (!cookId || cookId === 'undefined') {
      toast.error('Cook ID is missing')
      navigate('/cooks/verification', { replace: true })
      return
    }
    setLoading(true)
    try {
      const data = await getCookDocuments(cookId)
      
      // Backend returns: { cookDocument: { cook: {...}, documents: {...} } }
      const cookData = data?.cookDocument?.cook || data?.cook
      const documentsData = data?.cookDocument?.documents || data?.documents
      
      setCook(cookData || {
        name: data?.name || data?.fullName || `${data?.firstName || ''} ${data?.lastName || ''}`.trim(),
        email: data?.email,
        phone: data?.phone,
        id: cookId,
      })
      
      let normalized = normalizeDocuments(documentsData)
      if (!normalized.length) {
        const collections = collectDocumentCollections(data)
        for (const collection of collections) {
          normalized = normalizeDocuments(collection)
          if (normalized.length) break
        }
      }
      setDocuments(normalized)
      setCurrentIndex(0)
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to load documents'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDocuments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cookId])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (rejectModal.open) return // Don't navigate when modal is open
      
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault()
        goToNext()
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault()
        goToPrev()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentIndex, documents.length, rejectModal.open])

  const cookIdentifier = cook?.id || cook?._id || cookId
  const cookName = cook?.name || 'Unnamed Cook'
  const cookEmail = cook?.email || 'N/A'
  const cookContact = cook?.contact || cook?.phone
  
  // Format address object to string
  const formatAddress = (addr) => {
    if (!addr) return null
    if (typeof addr === 'string') return addr
    if (typeof addr === 'object') {
      const parts = [addr.houseNo, addr.street, addr.city, addr.postalCode].filter(Boolean)
      return parts.length > 0 ? parts.join(', ') : null
    }
    return null
  }
  const cookAddress = formatAddress(cook?.address)

  const handleApprove = async (doc) => {
    setSubmitting(true)
    try {
      await approveCookDocument(cookId, { field: doc.field, index: doc.index })
      toast.success(`${doc.label || doc.field} approved`)
      loadDocuments()
    } catch (error) {
      const message = error.response?.data?.message || 'Unable to approve document'
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleReject = async () => {
    const { doc, reason } = rejectModal
    if (!doc) return
    if (!reason.trim()) {
      toast.error('Please provide a reason for rejection')
      return
    }
    setSubmitting(true)
    try {
      await rejectCookDocument(cookId, {
        field: doc.field,
        index: doc.index,
        reason,
      })
      toast.success(`${doc.label || doc.field} rejected`)
      setRejectModal({ open: false, doc: null, reason: '' })
      loadDocuments()
    } catch (error) {
      const message = error.response?.data?.message || 'Unable to reject document'
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleApproveAll = async () => {
    setSubmitting(true)
    try {
      await approveAllCookDocuments(cookId)
      toast.success('All documents approved')
      loadDocuments()
    } catch (error) {
      const message = error.response?.data?.message || 'Unable to approve all documents'
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  const openRejectModal = (doc) => {
    setRejectModal({ open: true, doc, reason: '' })
  }

  if (loading) {
    return (
      <ProtectedLayout title="Document Viewer">
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader size="lg" />
        </div>
      </ProtectedLayout>
    )
  }

  if (!cook) {
    return (
      <ProtectedLayout title="Document Viewer">
        <div className="rounded-2xl bg-white p-10 text-center shadow">
          <p className="text-sm font-semibold text-slate-900">Cook not found.</p>
          <button
            type="button"
            onClick={() => navigate('/cooks/verification')}
            className="mt-6 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Back to Submissions
          </button>
        </div>
      </ProtectedLayout>
    )
  }

  return (
    <ProtectedLayout title="Cook Document Viewer">
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Cook Info Card */}
        <div className="rounded-lg bg-white p-6 shadow-sm border border-gray-200">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
                  <svg className="h-6 w-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-orange-600">Cook Profile</p>
                  <h2 className="text-2xl font-bold text-slate-900">{cookName}</h2>
                </div>
              </div>
              <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  <span className="font-mono text-xs">{cookIdentifier}</span>
                </div>
                {cookEmail && cookEmail !== 'N/A' && (
                  <div className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span>{cookEmail}</span>
                  </div>
                )}
                {cookContact && (
                  <div className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span>{cookContact}</span>
                  </div>
                )}
                {cookAddress && (
                  <div className="flex items-center gap-2 sm:col-span-2">
                    <svg className="h-4 w-4 flex-shrink-0 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="line-clamp-1">{cookAddress}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => navigate('/cooks/verification')}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={handleApproveAll}
                disabled={submitting || !documents.length}
                className="rounded-lg bg-green-600 px-5 py-2 text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <Loader size="sm" className="text-white" />
                    Processing...
                  </span>
                ) : (
                  '✓ Approve All'
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Document Carousel */}
        {documents.length ? (
          <div className="rounded-lg bg-white shadow-sm border border-gray-200 overflow-hidden">
            {/* Carousel Container with Sliding Animation */}
            <div className="relative w-full overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800">
              {/* Slides Wrapper */}
              <div 
                className="flex transition-transform duration-700 ease-in-out"
                style={{ transform: `translateX(-${currentIndex * 100}%)` }}
              >
                {documents.map((doc, idx) => (
                  <div 
                    key={doc.key} 
                    className="w-full flex-shrink-0 relative"
                  >
                    {/* Document Label Overlay */}
                    <div className="absolute left-6 top-6 z-20 rounded-xl bg-black/70 px-4 py-2 backdrop-blur-sm pointer-events-none">
                      <p className="text-sm font-bold text-white">{doc.label || doc.field}</p>
                    </div>

                    {/* Status Badge */}
                    <div className="absolute right-6 top-6 z-20 pointer-events-none">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wide shadow-lg ${
                        doc.status === 'approved' 
                          ? 'bg-emerald-500 text-white' 
                          : doc.status === 'rejected' 
                            ? 'bg-red-500 text-white' 
                            : doc.status === 'submitted' 
                              ? 'bg-blue-500 text-white' 
                              : 'bg-amber-500 text-white'
                      }`}>
                        {doc.status === 'approved' && '✓'}
                        {doc.status === 'rejected' && '✕'}
                        {doc.status}
                      </span>
                    </div>

                    {/* Image Container */}
                    <div className="flex items-center justify-center p-8 w-full" style={{ minHeight: '500px' }}>
                      {doc.url ? (
                        <img
                          src={doc.url}
                          alt={doc.label || doc.field}
                          className="max-h-[600px] w-auto rounded-xl object-contain shadow-2xl"
                          loading="eager"
                        />
                      ) : (
                        <div className="flex h-96 w-full items-center justify-center rounded-xl bg-slate-800/50">
                          <div className="text-center">
                            <svg className="mx-auto h-16 w-16 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <p className="mt-2 text-sm text-slate-400">No preview available</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Navigation Buttons */}
              <button
                type="button"
                onClick={goToPrev}
                disabled={currentIndex === 0}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-10 rounded-full bg-white/90 p-3 shadow-xl backdrop-blur-sm transition-all duration-300 hover:bg-white hover:scale-110 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <svg className="h-6 w-6 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                type="button"
                onClick={goToNext}
                disabled={currentIndex === documents.length - 1}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-10 rounded-full bg-white/90 p-3 shadow-xl backdrop-blur-sm transition-all duration-300 hover:bg-white hover:scale-110 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <svg className="h-6 w-6 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </button>

              {/* Counter */}
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
                <div className="rounded-full bg-white/90 px-4 py-2 backdrop-blur-sm shadow-lg">
                  <span className="text-sm font-bold text-slate-900">
                    {currentIndex + 1} / {documents.length}
                  </span>
                </div>
              </div>
            </div>

            {/* Thumbnail Navigation */}
            {documents.length > 1 && (
              <div className="border-t border-slate-200 bg-slate-100/50 px-6 py-4">
                <div className="flex items-center justify-center gap-2 overflow-x-auto pb-2">
                  {documents.map((doc, idx) => (
                    <button
                      key={doc.key}
                      type="button"
                      onClick={() => {
                        setDirection(idx > currentIndex ? 1 : -1)
                        setCurrentIndex(idx)
                      }}
                      className={`group relative flex-shrink-0 overflow-hidden rounded-lg transition-all duration-300 ${
                        idx === currentIndex
                          ? 'ring-4 ring-orange-500 scale-110'
                          : 'ring-2 ring-gray-300'
                      }`}
                    >
                      <div className="h-16 w-20 bg-slate-200">
                        {doc.url ? (
                          <img
                            src={doc.url}
                            alt={doc.label}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <svg className="h-6 w-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                      </div>
                      {/* Status indicator */}
                      <div className={`absolute bottom-0 left-0 right-0 h-1 ${
                        doc.status === 'approved' 
                          ? 'bg-emerald-500' 
                          : doc.status === 'rejected' 
                            ? 'bg-red-500' 
                            : doc.status === 'submitted'
                              ? 'bg-blue-500'
                              : 'bg-amber-500'
                      }`} />
                      {/* Tooltip */}
                      <div className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                        {doc.label}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Document Info & Actions */}
            <div className="border-t border-slate-100 bg-slate-50/50 p-6">
              {currentDocument?.rejectedReason && (
                <div className="mb-4 rounded-xl border-2 border-red-200 bg-red-50 p-4">
                  <div className="flex items-start gap-3">
                    <svg className="h-5 w-5 flex-shrink-0 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="text-sm font-semibold text-red-900">Rejection Reason</p>
                      <p className="mt-1 text-sm text-red-700">{currentDocument.rejectedReason}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={() => handleApprove(currentDocument)}
                  disabled={submitting || currentDocument?.status === 'approved'}
                  className="group flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 px-8 py-4 text-base font-bold text-white shadow-lg shadow-emerald-500/30 transition-all hover:from-emerald-700 hover:to-emerald-800 hover:shadow-xl hover:scale-105 active:scale-100 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  {currentDocument?.status === 'approved' ? 'Approved' : 'Approve Document'}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    rejectionFieldsWithIndex.has(currentDocument?.field)
                      ? openRejectModal(currentDocument)
                      : openRejectModal({ ...currentDocument, index: null })
                  }
                  disabled={submitting}
                  className="group flex items-center gap-2 rounded-xl border-2 border-red-200 bg-white px-8 py-4 text-base font-bold text-red-600 transition-all hover:border-red-300 hover:bg-red-50 hover:scale-105 active:scale-100 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Reject Document
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl bg-white p-16 text-center shadow-lg">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-slate-100">
              <svg className="h-10 w-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-lg font-semibold text-slate-900">No documents submitted</p>
            <p className="mt-2 text-sm text-slate-500">This cook hasn't uploaded any documents yet.</p>
          </div>
        )}
      </div>

      {rejectModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-slate-900">Reject Document</h3>
            <p className="mt-1 text-sm text-slate-600">
              Provide a reason for rejecting{' '}
              <span className="font-medium text-slate-900">{rejectModal.doc?.label || rejectModal.doc?.field}</span>
            </p>
            <textarea
              value={rejectModal.reason}
              onChange={(event) => setRejectModal((prev) => ({ ...prev, reason: event.target.value }))}
              rows={4}
              className="mt-4 w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-sm transition focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-100"
              placeholder="Add rejection reason"
            />
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setRejectModal({ open: false, doc: null, reason: '' })}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReject}
                disabled={submitting}
                className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-red-700 disabled:opacity-50"
              >
                {submitting ? 'Processing…' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ProtectedLayout>
  )
}

export default ViewDocuments

