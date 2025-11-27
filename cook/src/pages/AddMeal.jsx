import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { addMeal } from '../api/meals'
import { uploadToCloudinary } from '../utils/cloudinary'
import Header from '../components/Header'
import Footer from '../components/Footer'
import Loader from '../components/Loader'
import FormInput from '../components/FormInput'

const AddMeal = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: 'main course',
    availability: 'Available',
  })
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [errors, setErrors] = useState({})

  const categories = ['main course', 'beverages', 'starter', 'other']
  const availabilityOptions = ['Available', 'OutOfStock']

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }))
    }
  }

  const handleImageChange = (event) => {
    const file = event.target.files[0]
    if (file) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Meal name is required'
    }

    if (!formData.price || formData.price <= 0) {
      newErrors.price = 'Valid price is required'
    }

    if (!imageFile) {
      newErrors.image = 'Meal image is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!validateForm()) {
      toast.error('Please fix the errors in the form')
      return
    }

    setLoading(true)
    const loadingToast = toast.loading('Adding meal...', { duration: Infinity })

    try {
      // Upload image to Cloudinary
      toast.loading('Uploading image...', { id: loadingToast })
      const itemImage = await uploadToCloudinary(imageFile)

      // Add meal
      toast.loading('Saving meal...', { id: loadingToast })
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        price: parseFloat(formData.price),
        category: formData.category,
        availability: formData.availability,
        itemImage,
      }

      await addMeal(payload)

      toast.dismiss(loadingToast)
      toast.success('Meal added successfully!')
      navigate('/dashboard', { replace: true })
    } catch (error) {
      toast.dismiss(loadingToast)
      const message = error.response?.data?.message || 'Failed to add meal'
      toast.error(message)
      console.error('Add meal error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Header showSignOut={true} />

      <main className="flex-1 py-12">
        <div className="mx-auto max-w-2xl px-4 lg:px-6">
          <div className="rounded-lg bg-white p-8 shadow-sm border border-gray-200">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-gray-900">Add New Meal</h1>
              <p className="mt-2 text-sm text-gray-600">
                Fill in the details to add a new meal to your menu
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Meal Name */}
              <FormInput
                label="Meal Name"
                id="name"
                name="name"
                type="text"
                required
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g., Chicken Biryani"
                error={errors.name}
              />

              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={3}
                  value={formData.description}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Describe your meal..."
                />
              </div>

              {/* Price */}
              <FormInput
                label="Price (PKR)"
                id="price"
                name="price"
                type="number"
                required
                value={formData.price}
                onChange={handleChange}
                placeholder="e.g., 350"
                error={errors.price}
              />

              {/* Category */}
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500 capitalize"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat} className="capitalize">
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Availability */}
              <div>
                <label htmlFor="availability" className="block text-sm font-medium text-gray-700 mb-2">
                  Availability <span className="text-red-500">*</span>
                </label>
                <select
                  id="availability"
                  name="availability"
                  value={formData.availability}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  {availabilityOptions.map((option) => (
                    <option key={option} value={option}>
                      {option === 'OutOfStock' ? 'Out of Stock' : option}
                    </option>
                  ))}
                </select>
              </div>

              {/* Meal Image */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Meal Image <span className="text-red-500">*</span>
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
                />
                {errors.image && <p className="mt-1 text-xs text-red-500">{errors.image}</p>}
                {imagePreview && (
                  <div className="mt-3">
                    <img src={imagePreview} alt="Preview" className="h-48 w-full rounded-lg border object-cover" />
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  disabled={loading}
                  className="flex-1 rounded-lg border border-gray-300 bg-white px-6 py-3.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 rounded-lg bg-orange-600 px-6 py-3.5 text-sm font-semibold text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="flex items-center justify-center gap-2">
                    {loading ? (
                      <>
                        <Loader size="sm" className="text-white" />
                        Adding...
                      </>
                    ) : (
                      'Add Meal'
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

export default AddMeal
