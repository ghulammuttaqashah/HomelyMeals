import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { submitDocuments } from '../api/documents'
import { uploadToCloudinary } from '../utils/cloudinary'
import axios from 'axios'
import Header from '../components/Header'
import Footer from '../components/Footer'
import Loader from '../components/Loader'
import FileUploadField from '../components/FileUploadField'

const UploadDocuments = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [useDefaultProfile, setUseDefaultProfile] = useState(false)
  const [defaultImageUrl, setDefaultImageUrl] = useState(null)
  const [loadingDefaultImage, setLoadingDefaultImage] = useState(true)
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

  // Fetch default profile image from admin settings
  useEffect(() => {
    const fetchDefaultImage = async () => {
      try {
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
        const response = await axios.get(`${API_URL}/admin/settings/default-profile-image`)
        setDefaultImageUrl(response.data.defaultImageUrl)
      } catch (error) {
        console.log('No default image set by admin')
        setDefaultImageUrl(null)
      } finally {
        setLoadingDefaultImage(false)
      }
    }
    fetchDefaultImage()
  }, [])

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

    if (!useDefaultProfile && !files.profilePicture) {
      toast.error('Please upload a profile picture or select "Use Default Image"')
      return
    }

    if (files.kitchenPhotos.length === 0) {
      toast.error('At least one kitchen photo is required')
      return
    }

    setLoading(true)
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
      // Step 1: Upload files to Cloudinary and get URLs
      toast.loading('Uploading CNIC Front...', { id: loadingToast })
      const cnicFrontUrl = await uploadToCloudinary(files.cnicFront, 'cook-documents/cnic')
      
      toast.loading('Uploading CNIC Back...', { id: loadingToast })
      const cnicBackUrl = await uploadToCloudinary(files.cnicBack, 'cook-documents/cnic')

      // Handle profile picture - use default or uploaded
      let profilePictureUrl
      if (useDefaultProfile) {
        // Use the default image URL from admin settings
        if (!defaultImageUrl) {
          toast.error('Default profile image not available. Please upload a custom image.', { id: loadingToast })
          return
        }
        profilePictureUrl = defaultImageUrl
        toast.loading('Using default profile image...', { id: loadingToast })
      } else {
        toast.loading('Uploading Profile Picture...', { id: loadingToast })
        profilePictureUrl = await uploadToCloudinary(files.profilePicture, 'cook-profiles')
      }
      
      toast.loading('Uploading Kitchen Photos...', { id: loadingToast })
      const kitchenPhotosUrls = []
      for (let i = 0; i < files.kitchenPhotos.length; i++) {
        const url = await uploadToCloudinary(files.kitchenPhotos[i], 'cook-documents/kitchen')
        kitchenPhotosUrls.push(url)
      }

      let sfaLicenseUrl = null
      if (files.sfaLicense) {
        toast.loading('Uploading SFA License...', { id: loadingToast })
        sfaLicenseUrl = await uploadToCloudinary(files.sfaLicense, 'cook-documents/licenses')
      }

      let otherUrl = null
      if (files.other) {
        toast.loading('Uploading Other Document...', { id: loadingToast })
        otherUrl = await uploadToCloudinary(files.other, 'cook-documents/other')
      }

      // Step 2: Send URLs to backend
      toast.loading('Saving to database...', { id: loadingToast })
      const payload = {
        cnicFront: cnicFrontUrl,
        cnicBack: cnicBackUrl,
        profilePicture: profilePictureUrl,
        kitchenPhotos: kitchenPhotosUrls,
        sfaLicense: sfaLicenseUrl,
        other: otherUrl,
      }

      const response = await submitDocuments(payload)
      console.log('Document submission response:', response)
      
      toast.dismiss(loadingToast)
      toast.success('Documents submitted successfully!')
      
      // Redirect after short delay
      setTimeout(() => {
        console.log('Redirecting to /status...')
        navigate('/status', { replace: true })
      }, 1500)
    } catch (error) {
      toast.dismiss(loadingToast)
      console.error('Upload error details:', error)
      console.error('Error response:', error.response)
      const message = error.response?.data?.message || error.message || 'Couldn\'t upload documents. Please try smaller files.'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const isSubmitDisabled = !files.cnicFront || !files.cnicBack || (!useDefaultProfile && !files.profilePicture) || files.kitchenPhotos.length === 0 || loading

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Header showSignOut={true} />
      
      <main className="flex-1 py-6 sm:py-8 lg:py-12">
        <div className="mx-auto max-w-4xl px-3 sm:px-4 lg:px-6">
          <div className="rounded-lg bg-white p-5 sm:p-8 shadow-sm border border-gray-200">
            <div className="mb-6 sm:mb-8">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Upload Verification Documents</h1>
              <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm text-gray-600">
                Please upload the required documents to verify your account. All required fields must be completed.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
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

              {/* Profile Picture / Logo */}
              <div className="rounded-lg border border-orange-100 bg-orange-50/50 p-4">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Profile Picture / Logo <span className="text-red-500">*</span>
                  </label>
                  
                  {/* Option Toggle */}
                  <div className="flex gap-3 mb-4">
                    <button
                      type="button"
                      onClick={() => {
                        setUseDefaultProfile(false)
                        setPreviews(prev => ({ ...prev, profilePicture: null }))
                      }}
                      className={`flex-1 px-4 py-2.5 rounded-lg border-2 font-medium text-sm transition-all ${
                        !useDefaultProfile
                          ? 'border-orange-500 bg-orange-50 text-orange-700'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      Upload Custom
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!defaultImageUrl) {
                          toast.error('Default image not available. Please upload a custom image.')
                          return
                        }
                        setUseDefaultProfile(true)
                        setFiles(prev => ({ ...prev, profilePicture: null }))
                        setPreviews(prev => ({ ...prev, profilePicture: defaultImageUrl }))
                      }}
                      disabled={loadingDefaultImage || !defaultImageUrl}
                      className={`flex-1 px-4 py-2.5 rounded-lg border-2 font-medium text-sm transition-all ${
                        useDefaultProfile
                          ? 'border-orange-500 bg-orange-50 text-orange-700'
                          : loadingDefaultImage || !defaultImageUrl
                            ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {loadingDefaultImage ? 'Loading...' : !defaultImageUrl ? 'Default Not Available' : 'Use Default Image'}
                    </button>
                  </div>

                  {/* Show upload field or default preview */}
                  {!useDefaultProfile ? (
                    <FileUploadField
                      label=""
                      required={false}
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, 'profilePicture')}
                      preview={previews.profilePicture}
                      helperText={
                        <span className="text-orange-600 font-medium">
                          This will be visible to your customers. Please upload a clear photo of yourself or your brand logo.
                        </span>
                      }
                    />
                  ) : (
                    <div className="space-y-3">
                      {defaultImageUrl ? (
                        <>
                          <div className="relative w-full aspect-video rounded-lg overflow-hidden border-2 border-dashed border-orange-300 bg-white">
                            <img
                              src={defaultImageUrl}
                              alt="Default Profile"
                              className="w-full h-full object-contain"
                              onError={(e) => {
                                e.target.src = "https://via.placeholder.com/400x300?text=Image+Not+Found"
                              }}
                            />
                            <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                              ✓ Default Selected
                            </div>
                          </div>
                          <p className="text-sm text-gray-600">
                            Using default profile image set by admin. You can change this later from your profile settings.
                          </p>
                        </>
                      ) : (
                        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <p className="text-sm text-yellow-800">
                            Default image is not available. Please upload a custom profile picture.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

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
