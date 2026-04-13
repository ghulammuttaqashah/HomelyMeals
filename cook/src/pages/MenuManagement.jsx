import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { addMeal, getMeals, updateMeal, deleteMeal } from '../api/meals'
import { uploadToCloudinary } from '../utils/cloudinary'
import Header from '../components/Header'
import Footer from '../components/Footer'
import Loader from '../components/Loader'
import MealCard from '../components/MealCard'
import { FiArrowLeft } from 'react-icons/fi'

const MenuManagement = () => {
  const navigate = useNavigate()
  const { cook, isAuthenticated } = useAuth()
  const [meals, setMeals] = useState([])
  const [loading, setLoading] = useState(true)

  // Add Modal State
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [addFormData, setAddFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: 'main course',
    availability: 'Available',
  })
  const [addImageFile, setAddImageFile] = useState(null)
  const [addImagePreview, setAddImagePreview] = useState(null)
  const [addLoading, setAddLoading] = useState(false)
  const [addErrors, setAddErrors] = useState({})

  // Edit Modal State
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingMeal, setEditingMeal] = useState(null)
  const [editFormData, setEditFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: 'main course',
    availability: 'Available',
  })
  const [editImageFile, setEditImageFile] = useState(null)
  const [editImagePreview, setEditImagePreview] = useState(null)
  const [editLoading, setEditLoading] = useState(false)

  // Delete Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deletingMeal, setDeletingMeal] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const categories = ['main course', 'beverages', 'starter', 'other']
  const availabilityOptions = ['Available', 'OutOfStock']

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true })
      return
    }

    const status = cook?.verificationStatus
    if (status === 'not_started') {
      navigate('/upload-docs', { replace: true })
    } else if (status === 'pending' || status === 'rejected') {
      navigate('/status', { replace: true })
    }
  }, [isAuthenticated, cook, navigate])

  useEffect(() => {
    if (isAuthenticated) {
      fetchMeals()
    }
  }, [isAuthenticated])

  const fetchMeals = async () => {
    try {
      setLoading(true)
      const response = await getMeals()
      setMeals(response.meals || [])
    } catch (error) {
      toast.error('Unable to load your menu. Please try again.')
      console.error('Fetch meals error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (meal) => {
    setEditingMeal(meal)
    setEditFormData({
      name: meal.name || '',
      description: meal.description || '',
      price: meal.price || '',
      category: meal.category || 'main course',
      availability: meal.availability || 'Available',
    })
    setEditImagePreview(meal.itemImage || null)
    setEditImageFile(null)
    setEditModalOpen(true)
  }

  const openAddModal = () => {
    setAddFormData({
      name: '',
      description: '',
      price: '',
      category: 'main course',
      availability: 'Available',
    })
    setAddImageFile(null)
    setAddImagePreview(null)
    setAddErrors({})
    setAddModalOpen(true)
  }

  const handleAddFormChange = (event) => {
    const { name, value } = event.target
    setAddFormData((prev) => ({ ...prev, [name]: value }))
    if (addErrors[name]) {
      setAddErrors((prev) => ({ ...prev, [name]: '' }))
    }
  }

  const handleAddImageChange = (event) => {
    const file = event.target.files[0]
    if (file) {
      setAddImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setAddImagePreview(reader.result)
      }
      reader.readAsDataURL(file)
      if (addErrors.image) {
        setAddErrors((prev) => ({ ...prev, image: '' }))
      }
    }
  }

  const validateAddForm = () => {
    const newErrors = {}

    if (!addFormData.name.trim()) {
      newErrors.name = 'Meal name is required'
    }

    if (!addFormData.price || Number(addFormData.price) <= 0) {
      newErrors.price = 'Valid price is required'
    }

    if (!addImageFile) {
      newErrors.image = 'Meal image is required'
    }

    setAddErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleAddSubmit = async (event) => {
    event.preventDefault()

    if (!validateAddForm()) {
      toast.error('Please fix the errors in the form')
      return
    }

    setAddLoading(true)
    const loadingToast = toast.loading('Adding meal...', { duration: Infinity })

    try {
      toast.loading('Uploading image...', { id: loadingToast })
      const itemImage = await uploadToCloudinary(addImageFile)

      toast.loading('Saving meal...', { id: loadingToast })
      const payload = {
        name: addFormData.name.trim(),
        description: addFormData.description.trim(),
        price: parseFloat(addFormData.price),
        category: addFormData.category,
        availability: addFormData.availability,
        itemImage,
      }

      await addMeal(payload)

      toast.dismiss(loadingToast)
      toast.success('Meal added successfully!')
      setAddModalOpen(false)
      await fetchMeals()
    } catch (error) {
      toast.dismiss(loadingToast)
      const message = error.response?.data?.message || 'Failed to add meal'
      toast.error(message)
    } finally {
      setAddLoading(false)
    }
  }

  const handleEditFormChange = (event) => {
    const { name, value } = event.target
    setEditFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleEditImageChange = (event) => {
    const file = event.target.files[0]
    if (file) {
      setEditImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setEditImagePreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleEditSubmit = async (event) => {
    event.preventDefault()

    if (!editFormData.name.trim()) {
      toast.error('Meal name is required')
      return
    }
    if (!editFormData.price || editFormData.price <= 0) {
      toast.error('Valid price is required')
      return
    }

    setEditLoading(true)
    const loadingToast = toast.loading('Updating meal...', { duration: Infinity })

    try {
      let itemImage = editingMeal.itemImage

      // Upload new image if selected
      if (editImageFile) {
        toast.loading('Uploading image...', { id: loadingToast })
        itemImage = await uploadToCloudinary(editImageFile)
      }

      const payload = {
        name: editFormData.name.trim(),
        description: editFormData.description.trim(),
        price: parseFloat(editFormData.price),
        category: editFormData.category,
        availability: editFormData.availability,
        itemImage,
      }

      await updateMeal(editingMeal._id, payload)

      toast.dismiss(loadingToast)
      toast.success('Meal updated successfully!')
      setEditModalOpen(false)
      fetchMeals()
    } catch (error) {
      toast.dismiss(loadingToast)
      const message = error.response?.data?.message || 'Couldn\'t update meal. Please try again.'
      toast.error(message)
    } finally {
      setEditLoading(false)
    }
  }

  const handleDelete = (meal) => {
    setDeletingMeal(meal)
    setDeleteModalOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!deletingMeal) return

    setDeleteLoading(true)
    const loadingToast = toast.loading('Deleting meal...', { duration: Infinity })

    try {
      await deleteMeal(deletingMeal._id)
      toast.dismiss(loadingToast)
      toast.success('Meal deleted successfully!')
      setDeleteModalOpen(false)
      setDeletingMeal(null)
      fetchMeals()
    } catch (error) {
      toast.dismiss(loadingToast)
      const message = error.response?.data?.message || 'Couldn\'t delete meal. Please try again.'
      toast.error(message)
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Header showSignOut={true} />

      <main className="flex-1 py-6 sm:py-8 lg:py-12">
        <div className="mx-auto max-w-7xl px-3 sm:px-4 lg:px-6">
          {/* Back Button & Header Section */}
          <div className="mb-6 sm:mb-8">
            <button
              onClick={() => navigate('/dashboard')}
              className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-orange-600 transition-colors"
            >
              <FiArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </button>
            
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Menu Management</h1>
                <p className="mt-1 text-xs sm:text-sm text-gray-600">
                  Manage your meals - add, edit, view, or delete items
                </p>
              </div>
              <button
                onClick={openAddModal}
                className="flex items-center justify-center gap-1.5 sm:gap-2 rounded-lg bg-orange-600 px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-orange-700 transition-colors w-full sm:w-auto"
              >
                <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Meal
              </button>
            </div>
          </div>

          {/* Meals Grid */}
          {loading ? (
            <div className="flex items-center justify-center rounded-lg border border-gray-200 bg-white py-16">
              <div className="flex flex-col items-center gap-3">
                <Loader size="lg" />
                <p className="text-sm font-medium text-gray-600">Loading your meals...</p>
              </div>
            </div>
          ) : meals.length > 0 ? (
            <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {meals.map((meal) => (
                <MealCard
                  key={meal._id}
                  meal={meal}
                  showActions={true}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-lg bg-white p-8 sm:p-12 text-center shadow-sm border border-gray-200">
              <svg
                className="mx-auto h-12 w-12 sm:h-16 sm:w-16 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
              <h3 className="mt-3 sm:mt-4 text-base sm:text-lg font-semibold text-gray-900">No meals yet</h3>
              <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm text-gray-600">
                Start by adding your first meal to your menu
              </p>
              <button
                onClick={openAddModal}
                className="mt-4 sm:mt-6 rounded-lg bg-orange-600 px-5 py-2 sm:px-6 sm:py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-orange-700 transition-colors"
              >
                Add Your First Meal
              </button>
            </div>
          )}
        </div>
      </main>

      <Footer />

      {/* Add Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
            <button
              onClick={() => setAddModalOpen(false)}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
              disabled={addLoading}
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h2 className="text-xl font-bold text-gray-900 mb-6">Add New Meal</h2>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label htmlFor="add-name" className="block text-sm font-medium text-gray-700 mb-1">
                  Meal Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="add-name"
                  name="name"
                  value={addFormData.name}
                  onChange={handleAddFormChange}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="e.g., Chicken Biryani"
                  disabled={addLoading}
                />
                {addErrors.name && <p className="mt-1 text-xs text-red-500">{addErrors.name}</p>}
              </div>

              <div>
                <label htmlFor="add-description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  id="add-description"
                  name="description"
                  rows={3}
                  value={addFormData.description}
                  onChange={handleAddFormChange}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Describe your meal..."
                  disabled={addLoading}
                />
              </div>

              <div>
                <label htmlFor="add-price" className="block text-sm font-medium text-gray-700 mb-1">
                  Price (PKR) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="add-price"
                  name="price"
                  value={addFormData.price}
                  onChange={handleAddFormChange}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="e.g., 350"
                  disabled={addLoading}
                />
                {addErrors.price && <p className="mt-1 text-xs text-red-500">{addErrors.price}</p>}
              </div>

              <div>
                <label htmlFor="add-category" className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  id="add-category"
                  name="category"
                  value={addFormData.category}
                  onChange={handleAddFormChange}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500 capitalize"
                  disabled={addLoading}
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat} className="capitalize">
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="add-availability" className="block text-sm font-medium text-gray-700 mb-1">
                  Availability
                </label>
                <select
                  id="add-availability"
                  name="availability"
                  value={addFormData.availability}
                  onChange={handleAddFormChange}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  disabled={addLoading}
                >
                  {availabilityOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt === 'OutOfStock' ? 'Out of Stock' : opt}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Meal Image <span className="text-red-500">*</span>
                </label>
                {addImagePreview && (
                  <div className="mb-2 aspect-video w-full overflow-hidden rounded-lg bg-gray-100">
                    <img
                      src={addImagePreview}
                      alt="Preview"
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAddImageChange}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm file:mr-4 file:rounded file:border-0 file:bg-orange-50 file:px-4 file:py-1 file:text-sm file:font-medium file:text-orange-700 hover:file:bg-orange-100"
                  disabled={addLoading}
                />
                {addErrors.image && <p className="mt-1 text-xs text-red-500">{addErrors.image}</p>}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  disabled={addLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-700 transition-colors disabled:opacity-60"
                  disabled={addLoading}
                >
                  {addLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader size="sm" className="text-white" />
                      Adding...
                    </span>
                  ) : (
                    'Add Meal'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
            <button
              onClick={() => setEditModalOpen(false)}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
              disabled={editLoading}
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h2 className="text-xl font-bold text-gray-900 mb-6">Edit Meal</h2>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              {/* Meal Name */}
              <div>
                <label htmlFor="edit-name" className="block text-sm font-medium text-gray-700 mb-1">
                  Meal Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="edit-name"
                  name="name"
                  value={editFormData.name}
                  onChange={handleEditFormChange}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="e.g., Chicken Biryani"
                  disabled={editLoading}
                />
              </div>

              {/* Description */}
              <div>
                <label htmlFor="edit-description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  id="edit-description"
                  name="description"
                  rows={3}
                  value={editFormData.description}
                  onChange={handleEditFormChange}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Describe your meal..."
                  disabled={editLoading}
                />
              </div>

              {/* Price */}
              <div>
                <label htmlFor="edit-price" className="block text-sm font-medium text-gray-700 mb-1">
                  Price (PKR) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="edit-price"
                  name="price"
                  value={editFormData.price}
                  onChange={handleEditFormChange}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="e.g., 350"
                  disabled={editLoading}
                />
              </div>

              {/* Category */}
              <div>
                <label htmlFor="edit-category" className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  id="edit-category"
                  name="category"
                  value={editFormData.category}
                  onChange={handleEditFormChange}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500 capitalize"
                  disabled={editLoading}
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
                <label htmlFor="edit-availability" className="block text-sm font-medium text-gray-700 mb-1">
                  Availability
                </label>
                <select
                  id="edit-availability"
                  name="availability"
                  value={editFormData.availability}
                  onChange={handleEditFormChange}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  disabled={editLoading}
                >
                  {availabilityOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt === 'OutOfStock' ? 'Out of Stock' : opt}
                    </option>
                  ))}
                </select>
              </div>

              {/* Image */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Meal Image
                </label>
                {editImagePreview && (
                  <div className="mb-2 aspect-video w-full overflow-hidden rounded-lg bg-gray-100">
                    <img
                      src={editImagePreview}
                      alt="Preview"
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleEditImageChange}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm file:mr-4 file:rounded file:border-0 file:bg-orange-50 file:px-4 file:py-1 file:text-sm file:font-medium file:text-orange-700 hover:file:bg-orange-100"
                  disabled={editLoading}
                />
                <p className="mt-1 text-xs text-gray-500">Leave empty to keep current image</p>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  disabled={editLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-700 transition-colors disabled:opacity-60"
                  disabled={editLoading}
                >
                  {editLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader size="sm" className="text-white" />
                      Saving...
                    </span>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-gray-900">Delete Meal</h3>
              <p className="mt-2 text-sm text-gray-600">
                Are you sure you want to delete "<span className="font-medium">{deletingMeal?.name}</span>"? This action cannot be undone.
              </p>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  setDeleteModalOpen(false)
                  setDeletingMeal(null)
                }}
                className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                disabled={deleteLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-700 transition-colors disabled:opacity-60"
                disabled={deleteLoading}
              >
                {deleteLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader size="sm" className="text-white" />
                    Deleting...
                  </span>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MenuManagement
