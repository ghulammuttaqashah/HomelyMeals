import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { getDocumentStatus, resubmitDocuments } from '../api/documents'
import { uploadToCloudinary } from '../utils/cloudinary'
import Header from '../components/Header'
import Footer from '../components/Footer'
import Loader from '../components/Loader'
import FileUploadField from '../components/FileUploadField'

const ResubmitDocuments = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [documentStatus, setDocumentStatus] = useState(null)
  const [files, setFiles] = useState({
    cnicFront: null,
    cnicBack: null,
    kitchenPhotos: [],
    profilePicture: null,
    sfaLicense: null,
    other: null,
  })
  const [previews, setPreviews] = useState({
    cnicFront: null,
    cnicBack: null,
    kitchenPhotos: [],
    profilePicture: null,
    sfaLicense: null,
    other: null,
  })

  useEffect(() => {
    fetchDocumentStatus()
  }, [])

  const fetchDocumentStatus = async () => {
    try {
      const response = await getDocumentStatus()
      setDocumentStatus(response.documents)
      console.log('Document status:', response.documents)
    } catch (error) {
      console.error('Error fetching document status:', error)
      toast.error('Failed to load document status')
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = (event, fieldName) => {
    const selectedFiles = Array.from(event.target.files)
    
    if (fieldName === 'kitchenPhotos') {
      setFiles(prev => ({ ...prev, kitchenPhotos: [...prev.kitchenPhotos, ...selectedFiles] }))
      selectedFiles.forEach(file => {
        const reader = new FileReader()
        reader.onloadend = () => {
          setPreviews(prev => ({ ...prev, kitchenPhotos: [...prev.kitchenPhotos, reader.result] }))
        }
        reader.readAsDataURL(file)
      })
    } else {
      const file = selectedFiles[0]
      setFiles(prev => ({ ...prev, [fieldName]: file }))
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreviews(prev => ({ ...prev, [fieldName]: reader.result }))
      }
      reader.readAsDataURL(file)
    }
  }

  const removeKitchenPhoto = (index) => {
    setFiles(prev => ({
      ...prev,
      kitchenPhotos: prev.kitchenPhotos.filter((_, i) => i !== index)
    }))
    setPreviews(prev => ({
      ...prev,
      kitchenPhotos: prev.kitchenPhotos.filter((_, i) => i !== index)
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!documentStatus) {
      toast.error('Document status not loaded')
      return
    }

    // Check if any rejected documents have new files
    const hasRejectedUpdates = 
      (documentStatus.cnicFront?.status === 'rejected' && files.cnicFront) ||
      (documentStatus.cnicBack?.status === 'rejected' && files.cnicBack) ||
      (documentStatus.profilePicture?.status === 'rejected' && files.profilePicture) ||
      (documentStatus.sfaLicense?.status === 'rejected' && files.sfaLicense) ||
      (documentStatus.other?.status === 'rejected' && files.other) ||
      (documentStatus.kitchenPhotos?.some(p => p.status === 'rejected') && files.kitchenPhotos.length > 0)

    if (!hasRejectedUpdates) {
      toast.error('Please upload new files for rejected documents')
      return
    }

    setSubmitting(true)
    const loadingToast = toast(
      (t) => (
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900"></div>
          <span>Uploading documents to Cloudinary...</span>
          <button
            onClick={() => toast.dismiss(t.id)}
            className="ml-2 text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>
      ),
      { duration: Infinity }
    )

    try {
      const payload = {}

      // Upload only rejected documents
      if (documentStatus.cnicFront?.status === 'rejected' && files.cnicFront) {
        toast.loading('Uploading CNIC Front...', { id: loadingToast })
        payload.cnicFront = await uploadToCloudinary(files.cnicFront, 'cook-documents/cnic')
      }

      if (documentStatus.cnicBack?.status === 'rejected' && files.cnicBack) {
        toast.loading('Uploading CNIC Back...', { id: loadingToast })
        payload.cnicBack = await uploadToCloudinary(files.cnicBack, 'cook-documents/cnic')
      }

      if (documentStatus.profilePicture?.status === 'rejected' && files.profilePicture) {
        toast.loading('Uploading Profile Picture...', { id: loadingToast })
        payload.profilePicture = await uploadToCloudinary(files.profilePicture, 'cook-profiles')
      }

      if (documentStatus.sfaLicense?.status === 'rejected' && files.sfaLicense) {
        toast.loading('Uploading SFA License...', { id: loadingToast })
        payload.sfaLicense = await uploadToCloudinary(files.sfaLicense, 'cook-documents/licenses')
      }

      if (documentStatus.other?.status === 'rejected' && files.other) {
        toast.loading('Uploading Other Document...', { id: loadingToast })
        payload.other = await uploadToCloudinary(files.other, 'cook-documents/other')
      }

      // Upload rejected kitchen photos
      if (documentStatus.kitchenPhotos?.some(p => p.status === 'rejected') && files.kitchenPhotos.length > 0) {
        toast.loading('Uploading Kitchen Photos...', { id: loadingToast })
        const kitchenPhotosUrls = []
        for (let i = 0; i < files.kitchenPhotos.length; i++) {
          const url = await uploadToCloudinary(files.kitchenPhotos[i], 'cook-documents/kitchen')
          kitchenPhotosUrls.push(url)
        }
        payload.kitchenPhotos = kitchenPhotosUrls
      }

      // Submit to backend
      toast.loading('Saving to database...', { id: loadingToast })
      await resubmitDocuments(payload)
      
      toast.dismiss(loadingToast)
      toast.success('Documents resubmitted successfully! Waiting for admin review.')
      
      setTimeout(() => {
        navigate('/status', { replace: true })
      }, 1500)
    } catch (error) {
      toast.dismiss(loadingToast)
      console.error('Resubmit error:', error)
      const message = error.response?.data?.message || error.message || 'Failed to resubmit documents'
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-gray-50">
        <Header showSignOut={true} />
        <main className="flex-1 flex items-center justify-center">
          <Loader />
        </main>
        <Footer />
      </div>
    )
  }

  if (!documentStatus) {
    return (
      <div className="flex min-h-screen flex-col bg-gray-50">
        <Header showSignOut={true} />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-600 mb-4">Failed to load document status</p>
            <button
              onClick={() => navigate('/status')}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
            >
              Back to Status
            </button>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  // Check if there are any rejected documents
  const rejectedDocs = []
  const approvedDocs = []

  if (documentStatus.cnicFront?.status === 'rejected') {
    rejectedDocs.push({ field: 'cnicFront', label: 'CNIC Front', reason: documentStatus.cnicFront.rejectedReason })
  } else if (documentStatus.cnicFront?.status === 'approved') {
    approvedDocs.push({ field: 'cnicFront', label: 'CNIC Front', url: documentStatus.cnicFront.url })
  }

  if (documentStatus.cnicBack?.status === 'rejected') {
    rejectedDocs.push({ field: 'cnicBack', label: 'CNIC Back', reason: documentStatus.cnicBack.rejectedReason })
  } else if (documentStatus.cnicBack?.status === 'approved') {
    approvedDocs.push({ field: 'cnicBack', label: 'CNIC Back', url: documentStatus.cnicBack.url })
  }

  if (documentStatus.profilePicture?.status === 'rejected') {
    rejectedDocs.push({ field: 'profilePicture', label: 'Profile Picture / Logo', reason: documentStatus.profilePicture.rejectedReason })
  } else if (documentStatus.profilePicture?.status === 'approved') {
    approvedDocs.push({ field: 'profilePicture', label: 'Profile Picture / Logo', url: documentStatus.profilePicture.url })
  }

  if (documentStatus.sfaLicense?.status === 'rejected') {
    rejectedDocs.push({ field: 'sfaLicense', label: 'SFA License', reason: documentStatus.sfaLicense.rejectedReason })
  } else if (documentStatus.sfaLicense?.status === 'approved') {
    approvedDocs.push({ field: 'sfaLicense', label: 'SFA License', url: documentStatus.sfaLicense.url })
  }

  if (documentStatus.other?.status === 'rejected') {
    rejectedDocs.push({ field: 'other', label: 'Other Document', reason: documentStatus.other.rejectedReason })
  } else if (documentStatus.other?.status === 'approved') {
    approvedDocs.push({ field: 'other', label: 'Other Document', url: documentStatus.other.url })
  }

  // Kitchen photos
  const rejectedKitchenPhotos = documentStatus.kitchenPhotos?.filter(p => p.status === 'rejected') || []
  const approvedKitchenPhotos = documentStatus.kitchenPhotos?.filter(p => p.status === 'approved') || []

  if (rejectedDocs.length === 0 && rejectedKitchenPhotos.length === 0) {
    return (
      <div className="flex min-h-screen flex-col bg-gray-50">
        <Header showSignOut={true} />
        <main className="flex-1 py-6 sm:py-8 lg:py-12">
          <div className="mx-auto max-w-4xl px-3 sm:px-4 lg:px-6">
            <div className="rounded-lg bg-white p-5 sm:p-8 shadow-sm border border-gray-200">
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-800 mb-2">No Rejected Documents</h2>
                <p className="text-gray-600 mb-6">All your documents are either approved or pending review.</p>
                
                {/* Debug information */}
                <div className="mt-6 p-4 bg-gray-50 rounded-lg text-left">
                  <p className="text-sm font-semibold text-gray-700 mb-2">Document Status (Debug):</p>
                  <pre className="text-xs text-gray-600 overflow-auto">
                    {JSON.stringify({
                      cnicFront: documentStatus.cnicFront?.status,
                      cnicBack: documentStatus.cnicBack?.status,
                      profilePicture: documentStatus.profilePicture?.status,
                      kitchenPhotos: documentStatus.kitchenPhotos?.map(p => p.status),
                      sfaLicense: documentStatus.sfaLicense?.status,
                      other: documentStatus.other?.status,
                    }, null, 2)}
                  </pre>
                </div>

                <button
                  onClick={() => navigate('/status')}
                  className="mt-6 px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                >
                  Back to Status
                </button>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Header showSignOut={true} />
      
      <main className="flex-1 py-6 sm:py-8 lg:py-12">
        <div className="mx-auto max-w-4xl px-3 sm:px-4 lg:px-6">
          <div className="rounded-lg bg-white p-5 sm:p-8 shadow-sm border border-gray-200">
            <div className="mb-6 sm:mb-8">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Resubmit Rejected Documents</h1>
              <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm text-gray-600">
                Please upload corrected versions of the rejected documents. Approved documents are shown below and cannot be changed.
              </p>
            </div>

            {/* Approved Documents (Read-only) */}
            {approvedDocs.length > 0 && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="text-sm font-semibold text-green-800 mb-3">✓ Approved Documents</h3>
                <div className="space-y-3">
                  {approvedDocs.map((doc) => (
                    <div key={doc.field} className="flex items-center justify-between">
                      <span className="text-sm text-green-700">{doc.label}</span>
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                        Approved
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Approved Kitchen Photos */}
            {approvedKitchenPhotos.length > 0 && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="text-sm font-semibold text-green-800 mb-3">✓ Approved Kitchen Photos</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {approvedKitchenPhotos.map((photo, index) => (
                    <div key={index} className="relative">
                      <img 
                        src={photo.url} 
                        alt={`Approved Kitchen ${index + 1}`} 
                        className="h-24 sm:h-32 w-full rounded-lg border-2 border-green-300 object-cover" 
                      />
                      <div className="absolute top-1 right-1 bg-green-500 text-white px-1.5 py-0.5 rounded text-xs">
                        ✓
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
              {/* Rejected Documents */}
              {rejectedDocs.map((doc) => (
                <div key={doc.field} className="rounded-lg border-2 border-red-200 bg-red-50 p-4">
                  <div className="mb-3">
                    <div className="flex items-start justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        {doc.label} <span className="text-red-500">*</span>
                      </label>
                      <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">
                        Rejected
                      </span>
                    </div>
                    {doc.reason && (
                      <p className="text-sm text-red-600 mb-3">
                        <strong>Reason:</strong> {doc.reason}
                      </p>
                    )}
                  </div>
                  <FileUploadField
                    label=""
                    required={false}
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, doc.field)}
                    preview={previews[doc.field]}
                  />
                </div>
              ))}

              {/* Rejected Kitchen Photos */}
              {rejectedKitchenPhotos.length > 0 && (
                <div className="rounded-lg border-2 border-red-200 bg-red-50 p-4">
                  <div className="mb-3">
                    <div className="flex items-start justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Kitchen Photos <span className="text-red-500">*</span>
                      </label>
                      <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">
                        {rejectedKitchenPhotos.length} Rejected
                      </span>
                    </div>
                    <div className="space-y-2 mb-3">
                      {rejectedKitchenPhotos.map((photo, index) => (
                        <p key={index} className="text-sm text-red-600">
                          <strong>Photo {index + 1}:</strong> {photo.rejectedReason || 'No reason provided'}
                        </p>
                      ))}
                    </div>
                    <p className="text-xs text-gray-600 mb-3">
                      Please upload {rejectedKitchenPhotos.length} new kitchen {rejectedKitchenPhotos.length === 1 ? 'photo' : 'photos'} to replace the rejected ones.
                    </p>
                  </div>
                  <FileUploadField
                    label=""
                    required={false}
                    accept="image/*"
                    multiple
                    onChange={(e) => handleFileChange(e, 'kitchenPhotos')}
                    preview={previews.kitchenPhotos}
                    onRemove={removeKitchenPhoto}
                  />
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/status')}
                  className="flex-1 rounded-lg border-2 border-gray-300 px-6 py-3.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-lg bg-orange-600 px-6 py-3.5 text-sm font-semibold text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="flex items-center justify-center gap-2">
                    {submitting ? (
                      <>
                        <Loader size="sm" className="text-white" />
                        Submitting...
                      </>
                    ) : (
                      'Resubmit Documents'
                    )}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}

export default ResubmitDocuments
