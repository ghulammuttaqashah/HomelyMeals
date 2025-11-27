import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { submitDocuments } from '../api/documents'
import { uploadToCloudinary } from '../utils/cloudinary'
import Header from '../components/Header'
import Footer from '../components/Footer'
import Loader from '../components/Loader'
import FileUploadField from '../components/FileUploadField'

const UploadDocuments = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [files, setFiles] = useState({
    cnicFront: null,
    cnicBack: null,
    kitchenPhotos: [],
    sfaLicense: null,
    other: null,
  })
  const [previews, setPreviews] = useState({
    cnicFront: null,
    cnicBack: null,
    kitchenPhotos: [],
    sfaLicense: null,
    other: null,
  })

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

    if (!files.cnicFront || !files.cnicBack) {
      toast.error('CNIC front and back are required')
      return
    }

    if (files.kitchenPhotos.length === 0) {
      toast.error('At least one kitchen photo is required')
      return
    }

    setLoading(true)
    const loadingToast = toast.loading('Uploading documents to Cloudinary...', { duration: Infinity })

    try {
      // Step 1: Upload files to Cloudinary and get URLs
      toast.loading('Uploading CNIC Front...', { id: loadingToast })
      const cnicFrontUrl = await uploadToCloudinary(files.cnicFront)
      
      toast.loading('Uploading CNIC Back...', { id: loadingToast })
      const cnicBackUrl = await uploadToCloudinary(files.cnicBack)
      
      toast.loading('Uploading Kitchen Photos...', { id: loadingToast })
      const kitchenPhotosUrls = []
      for (let i = 0; i < files.kitchenPhotos.length; i++) {
        const url = await uploadToCloudinary(files.kitchenPhotos[i])
        kitchenPhotosUrls.push(url)
      }

      let sfaLicenseUrl = null
      if (files.sfaLicense) {
        toast.loading('Uploading SFA License...', { id: loadingToast })
        sfaLicenseUrl = await uploadToCloudinary(files.sfaLicense)
      }

      let otherUrl = null
      if (files.other) {
        toast.loading('Uploading Other Document...', { id: loadingToast })
        otherUrl = await uploadToCloudinary(files.other)
      }

      // Step 2: Send URLs to backend
      toast.loading('Saving to database...', { id: loadingToast })
      const payload = {
        cnicFront: cnicFrontUrl,
        cnicBack: cnicBackUrl,
        kitchenPhotos: kitchenPhotosUrls,
        sfaLicense: sfaLicenseUrl,
        other: otherUrl,
      }

      await submitDocuments(payload)
      
      toast.dismiss(loadingToast)
      toast.success('Documents submitted successfully!')
      setTimeout(() => {
        navigate('/status', { replace: true })
      }, 1500)
    } catch (error) {
      toast.dismiss(loadingToast)
      const message = error.message || 'Failed to upload documents'
      toast.error(message)
      console.error('Upload error:', error)
    } finally {
      setLoading(false)
    }
  }

  const isSubmitDisabled = !files.cnicFront || !files.cnicBack || files.kitchenPhotos.length === 0 || loading

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Header showSignOut={true} />
      
      <main className="flex-1 py-12">
        <div className="mx-auto max-w-4xl px-4 lg:px-6">
          <div className="rounded-lg bg-white p-8 shadow-sm border border-gray-200">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-gray-900">Upload Verification Documents</h1>
              <p className="mt-2 text-sm text-gray-600">
                Please upload the required documents to verify your account. All required fields must be completed.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* CNIC Front */}
              <FileUploadField
                label="CNIC Front"
                required
                accept="image/*"
                onChange={(e) => handleFileChange(e, 'cnicFront')}
                preview={previews.cnicFront}
              />

              {/* CNIC Back */}
              <FileUploadField
                label="CNIC Back"
                required
                accept="image/*"
                onChange={(e) => handleFileChange(e, 'cnicBack')}
                preview={previews.cnicBack}
              />

              {/* Kitchen Photos */}
              <FileUploadField
                label="Kitchen Photos (At least 1 required)"
                required
                accept="image/*"
                multiple
                onChange={(e) => handleFileChange(e, 'kitchenPhotos')}
                preview={previews.kitchenPhotos}
                onRemove={removeKitchenPhoto}
              />

              {/* Optional Documents */}
              <div className="border-t border-gray-200 pt-6">
                <h3 className="mb-4 text-sm font-semibold text-gray-700">Optional Documents</h3>
                
                <div className="space-y-4">
                  <FileUploadField
                    label="SFA License (Optional)"
                    accept="image/*,application/pdf"
                    onChange={(e) => handleFileChange(e, 'sfaLicense')}
                    fileName={files.sfaLicense?.name}
                  />

                  <FileUploadField
                    label="Other Document (Optional)"
                    accept="image/*,application/pdf"
                    onChange={(e) => handleFileChange(e, 'other')}
                    fileName={files.other?.name}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitDisabled}
                className="w-full rounded-lg bg-orange-600 px-6 py-3.5 text-sm font-semibold text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="flex items-center justify-center gap-2">
                  {loading ? (
                    <>
                      <Loader size="sm" className="text-white" />
                      Uploading...
                    </>
                  ) : (
                    'Submit Documents'
                  )}
                </span>
              </button>
            </form>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}

export default UploadDocuments
