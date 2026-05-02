import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { getMealsByCookId, getTopSellingMeals } from '../api/meals'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import Header from '../components/Header'
import Footer from '../components/Footer'
import Container from '../components/Container'
import MealCard from '../components/MealCard'
import { SkeletonCard } from '../components/Loader'
import CookAnalytics from '../components/CookAnalytics'
import { getCookReviews } from '../api/review'

const CookMeals = () => {
  const { cookId } = useParams()
  const navigate = useNavigate()
  const { clearCart, cart } = useCart()
  const { customer } = useAuth()
  const [cook, setCook] = useState(null)
  const [meals, setMeals] = useState([])
  const [filteredMeals, setFilteredMeals] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All Categories')
  const [sortBy, setSortBy] = useState('default')
  const [cookServesArea, setCookServesArea] = useState(true)
  const [customerCity, setCustomerCity] = useState(null)

  // Top selling state
  const [topMeals, setTopMeals] = useState([])
  const [loadingTopMeals, setLoadingTopMeals] = useState(true)

  // Reviews state
  const [reviews, setReviews] = useState([])
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [showReviewsModal, setShowReviewsModal] = useState(false)
  const [averageRating, setAverageRating] = useState(0)
  const [totalReviews, setTotalReviews] = useState(0)
  const [reviewSearchQuery, setReviewSearchQuery] = useState('')
  const [filteredReviews, setFilteredReviews] = useState([])

  const categories = ['All Categories', 'Main Course', 'Beverages', 'Starter', 'Other']

  // Get selected address city
  const selectedAddress = customer?.addresses?.find(a => a.isDefault) || customer?.addresses?.[0]

  useEffect(() => {
    fetchCookMeals()
    fetchTopSellingMeals()
    fetchCookReviews()
  }, [cookId, selectedAddress?._id])

  useEffect(() => {
    filterAndSortMeals()
  }, [meals, searchQuery, selectedCategory, sortBy])

  useEffect(() => {
    filterReviews()
  }, [reviews, reviewSearchQuery])

  const fetchCookMeals = async () => {
    try {
      setLoading(true)
      const response = await getMealsByCookId(cookId)
      // Ensure cook has _id (API returns cookId, normalize to _id)
      const cookData = {
        ...response.cook,
        _id: response.cook._id || response.cook.cookId,
      }
      setCook(cookData)

      // Check if cook serves customer's area
      const customerCityName = selectedAddress?.city
      setCustomerCity(customerCityName)

      // Check if cook's city matches customer's city
      const servesArea = !customerCityName || cookData.city?.toLowerCase() === customerCityName?.toLowerCase()
      setCookServesArea(servesArea)

      const mealsData = response.meals.map(meal => ({
        id: meal.mealId,
        name: meal.name,
        price: meal.price,
        description: meal.description,
        image: meal.itemImage || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&h=300&fit=crop',
        category: meal.category,
        availability: meal.availability,
      }))
      setMeals(mealsData)
      setFilteredMeals(mealsData)
    } catch (error) {
      toast.error('Unable to load menu. Please try again.')
      console.error('Fetch cook meals error:', error)
      // Navigate back if cook not found
      if (error.response?.status === 404) {
        navigate('/dashboard', { replace: true })
      }
    } finally {
      setLoading(false)
    }
  }

  const fetchTopSellingMeals = async () => {
    try {
      setLoadingTopMeals(true)
      const response = await getTopSellingMeals(cookId)
      setTopMeals(response.topMeals || [])
    } catch (error) {
      console.error('Error fetching top selling meals:', error)
    } finally {
      setLoadingTopMeals(false)
    }
  }

  const fetchCookReviews = async () => {
    try {
      setReviewsLoading(true)
      const response = await getCookReviews(cookId)
      setReviews(response.reviews || [])
      setFilteredReviews(response.reviews || [])
      setAverageRating(response.averageRating || 0)
      setTotalReviews(response.totalReviews || 0)
    } catch (error) {
      console.error('Error fetching cook reviews:', error)
    } finally {
      setReviewsLoading(false)
    }
  }

  const filterReviews = () => {
    if (!reviewSearchQuery.trim()) {
      setFilteredReviews(reviews)
      return
    }

    const query = reviewSearchQuery.toLowerCase()
    const filtered = reviews.filter(review => {
      const customerName = review.customerId?.name?.toLowerCase() || ''
      const reviewText = review.reviewText?.toLowerCase() || ''
      const orderNumber = review.orderId?.orderNumber?.toLowerCase() || ''
      
      return customerName.includes(query) || 
             reviewText.includes(query) || 
             orderNumber.includes(query)
    })
    
    setFilteredReviews(filtered)
  }

  const filterAndSortMeals = () => {
    let result = [...meals]

    // Filter by search query
    if (searchQuery) {
      result = result.filter(meal =>
        meal.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        meal.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Filter by category
    if (selectedCategory !== 'All Categories') {
      result = result.filter(meal =>
        meal.category.toLowerCase() === selectedCategory.toLowerCase()
      )
    }

    // Sort meals
    if (sortBy === 'price-low') {
      result.sort((a, b) => a.price - b.price)
    } else if (sortBy === 'price-high') {
      result.sort((a, b) => b.price - a.price)
    } else if (sortBy === 'name') {
      result.sort((a, b) => a.name.localeCompare(b.name))
    }

    setFilteredMeals(result)
  }

  const handleBack = () => {
    navigate('/dashboard')
  }

  const handleAddressChange = async () => {
    // Check if cart has items from this cook
    const cookIdentifier = cook?._id || cook?.cookId
    if (cookIdentifier && cart.cookId === cookIdentifier && cart.items.length > 0) {
      clearCart()
      toast.info('Cart cleared - delivery address changed')
    }

    // Re-fetch cook data to check availability
    await fetchCookMeals()
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-gray-50">
        <Header />
        <main className="flex-1">
          <Container className="py-8">
            {/* Back Button Skeleton */}
            <div className="mb-6">
              <div className="mb-4 h-5 w-28 bg-gray-200 rounded animate-pulse" />

              {/* Cook Info Skeleton */}
              <div className="rounded-lg bg-white p-6 shadow-sm border border-gray-200">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-gray-200 animate-pulse" />
                  <div className="space-y-2">
                    <div className="h-6 w-40 bg-gray-200 rounded animate-pulse" />
                    <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
                  </div>
                </div>
              </div>
            </div>

            {/* Filters Skeleton */}
            <div className="mb-6 rounded-lg bg-white p-4 shadow-sm border border-gray-200">
              <div className="flex flex-wrap gap-4">
                <div className="h-10 w-64 bg-gray-200 rounded-lg animate-pulse" />
                <div className="h-10 w-40 bg-gray-200 rounded-lg animate-pulse" />
                <div className="h-10 w-36 bg-gray-200 rounded-lg animate-pulse" />
              </div>
            </div>

            {/* Meals Grid Skeleton */}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {[...Array(8)].map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          </Container>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Header onAddressChange={handleAddressChange} />

      <main className="flex-1">
        <Container className="py-8">
          {/* Back Button & Cook Info */}
          <div className="mb-6">
            <button
              onClick={handleBack}
              className="mb-4 flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-orange-600 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Cooks
            </button>

            <div className="rounded-xl bg-white p-6 sm:p-8 shadow-sm border border-orange-100/50">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                <div className="flex h-28 w-28 sm:h-32 sm:w-32 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-orange-100 shadow-md ring-4 ring-orange-50">
                  {cook?.profilePicture ? (
                    <img
                      src={cook.profilePicture}
                      alt={cook.name}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.target.src = 'https://via.placeholder.com/400x300?text=Image+Not+Found'
                      }}
                    />
                  ) : (
                    <svg
                      className="h-12 w-12 text-orange-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                  )}
                </div>
                <div className="text-center sm:text-left flex-1">
                  <h1 className="text-3xl font-bold text-gray-900">{cook?.name}</h1>
                  {cook.bio && <p className="text-gray-600 mt-2 max-w-2xl">{cook.bio}</p>}

                  <div className="flex items-center justify-center sm:justify-start gap-4 text-sm text-gray-600 mt-3">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    <span>{cook?.city}</span>
                  </div>

                  {/* Rating and Reviews */}
                  <div className="mt-4 flex items-center justify-center sm:justify-start gap-3">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <svg
                            key={star}
                            className={`h-5 w-5 ${
                              star <= Math.round(averageRating)
                                ? 'text-yellow-400 fill-current'
                                : 'text-gray-300'
                            }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                            />
                          </svg>
                        ))}
                      </div>
                      <span className="text-lg font-bold text-gray-900">{averageRating.toFixed(1)}</span>
                    </div>
                    <button
                      onClick={() => setShowReviewsModal(true)}
                      className="text-sm text-orange-600 hover:text-orange-700 font-medium underline"
                    >
                      {totalReviews} {totalReviews === 1 ? 'review' : 'reviews'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Warning Banner - Cook doesn't serve area */}
          {!loading && !cookServesArea && (
            <div className="mb-6 rounded-lg bg-yellow-50 border-2 border-yellow-200 p-4">
              <div className="flex items-start gap-3">
                <svg className="h-6 w-6 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-yellow-800">This cook doesn't serve your area</h3>
                  <p className="mt-1 text-sm text-yellow-700">
                    <span className="font-medium">{cook?.name}</span> is located in <span className="font-medium">{cook?.city}</span>, but your delivery address is in <span className="font-medium">{customerCity}</span>.
                  </p>
                  <p className="mt-2 text-xs text-yellow-600">
                    You cannot add items to cart from this cook. Try selecting a different address or browse other cooks.
                  </p>
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-yellow-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-yellow-700 transition-colors"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Browse Other Cooks
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Cook Analytics Section */}
          {cook && (
            <div className="mb-8">
              <CookAnalytics cookId={cook._id} />
            </div>
          )}

          {/* Filter Section */}
          <div className="mb-6 sm:mb-8 rounded-lg bg-white p-4 sm:p-6 shadow-sm border border-gray-200">
            <h2 className="mb-3 sm:mb-4 text-base sm:text-lg font-semibold text-gray-900">Filter Meals</h2>

            {/* Search Bar */}
            <div className="mb-3 sm:mb-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search meals by name or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 sm:py-3 pl-10 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <svg
                  className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
            </div>

            {/* Filters Row */}
            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
              {/* Category Filter */}
              <div>
                <label className="mb-2 block text-xs sm:text-sm font-medium text-gray-700">Category</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 sm:px-4 py-2.5 sm:py-3 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sort By */}
              <div>
                <label className="mb-2 block text-xs sm:text-sm font-medium text-gray-700">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 sm:px-4 py-2.5 sm:py-3 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="default">Default</option>
                  <option value="price-low">Price (Low to High)</option>
                  <option value="price-high">Price (High to Low)</option>
                  <option value="name">Name (A-Z)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Top Selling Meal - #1 Best Seller */}
          {!loadingTopMeals && topMeals.length > 0 && (() => {
            const topMeal = topMeals[0]
            return (
              <div className="mb-8 rounded-2xl bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50 border border-orange-200/80 p-5 sm:p-6 shadow-md">
                <div className="flex items-center gap-5 sm:gap-6">
                  {/* Image with Badge */}
                  <div className="relative flex-shrink-0">
                    <div className="h-28 w-28 sm:h-32 sm:w-32 rounded-2xl overflow-hidden bg-white shadow-md ring-2 ring-orange-100">
                      {topMeal.itemImage ? (
                        <img
                          src={topMeal.itemImage}
                          alt={topMeal.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50">
                          <svg className="h-12 w-12 text-orange-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                        </div>
                      )}
                    </div>
                    {/* #1 Badge */}
                    <div className="absolute -top-2.5 -left-2.5 flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 text-white text-xs font-extrabold shadow-lg ring-2 ring-white">
                      #1
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-orange-500 text-white shadow-sm">
                        🔥 Best Seller
                      </span>
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 truncate leading-tight">{topMeal.name}</h3>
                    <div className="mt-2 flex flex-wrap items-center gap-3 sm:gap-4">
                      <span className="text-lg sm:text-xl font-extrabold text-orange-600">Rs {topMeal.price}</span>
                      <div className="flex items-center gap-1.5 bg-white/80 px-3 py-1 rounded-full border border-orange-100 shadow-sm">
                        <svg className="h-4 w-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                        </svg>
                        <span className="text-sm font-semibold text-gray-700">{topMeal.totalQuantity} sold</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })()}

          {/* Meals Grid */}
          {filteredMeals.length > 0 ? (
            <>
              <div className="mb-3 sm:mb-4 flex items-center justify-between">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">Menu</h2>
                <p className="text-xs sm:text-sm text-gray-600">{filteredMeals.length} meals available</p>
              </div>
              <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {filteredMeals.map((meal) => (
                  <MealCard key={meal.id} meal={meal} cook={cook} cookServesArea={cookServesArea} />
                ))}
              </div>
            </>
          ) : (
            <div className="rounded-lg bg-white p-12 text-center shadow-sm border border-gray-200">
              <svg
                className="mx-auto h-16 w-16 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <h3 className="mt-4 text-lg font-semibold text-gray-900">No meals found</h3>
              <p className="mt-2 text-sm text-gray-600">
                {searchQuery || selectedCategory !== 'All Categories'
                  ? 'Try adjusting your search or filter criteria'
                  : 'This cook has no meals available right now'}
              </p>
            </div>
          )}
        </Container>
      </main>

      {/* Write Review - navigates to order details */}
      {/* Review is now done from the Order Details page */}

      {/* Reviews Modal */}
      {showReviewsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full my-4 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white z-10 rounded-t-2xl">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Customer Reviews</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xl font-bold text-yellow-500">{averageRating.toFixed(1)}</span>
                  <div className="flex items-center">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <svg
                        key={star}
                        className={`h-4 w-4 ${
                          star <= Math.round(averageRating)
                            ? 'text-yellow-400 fill-current'
                            : 'text-gray-300'
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                        />
                      </svg>
                    ))}
                  </div>
                  <span className="text-sm text-gray-500">
                    · {totalReviews} {totalReviews === 1 ? 'review' : 'reviews'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowReviewsModal(false)
                  setReviewSearchQuery('')
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                aria-label="Close"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Search Bar */}
            <div className="px-6 pt-4 pb-2 bg-white sticky top-[88px] z-10">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search reviews by customer name, review text, or order number..."
                  value={reviewSearchQuery}
                  onChange={(e) => setReviewSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 pl-10 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <svg
                  className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                {reviewSearchQuery && (
                  <button
                    onClick={() => setReviewSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              {reviewSearchQuery && (
                <p className="text-xs text-gray-500 mt-2">
                  Found {filteredReviews.length} {filteredReviews.length === 1 ? 'review' : 'reviews'}
                </p>
              )}
            </div>

            {/* Reviews List */}
            <div className="p-6">
              {reviewsLoading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
                </div>
              ) : filteredReviews.length > 0 ? (
                <div className="space-y-4">
                  {filteredReviews.map((review) => (
                    <div key={review._id} className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                      {/* Customer Info */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                            <span className="text-orange-600 font-semibold text-sm">
                              {review.customerId?.name?.charAt(0).toUpperCase() || 'C'}
                            </span>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">
                              {review.customerId?.name || 'Anonymous'}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(review.createdAt).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <svg
                              key={star}
                              className={`h-4 w-4 ${
                                star <= review.rating
                                  ? 'text-yellow-400 fill-current'
                                  : 'text-gray-300'
                              }`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                              />
                            </svg>
                          ))}
                        </div>
                      </div>

                      {/* Review Text */}
                      {review.reviewText && (
                        <p className="text-gray-700 text-sm leading-relaxed mb-3">
                          {review.reviewText}
                        </p>
                      )}

                      {/* Order Info */}
                      {review.orderId && (
                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-2 pt-2 border-t border-gray-200">
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                          </svg>
                          <span>Order #{review.orderId.orderNumber || review.orderId._id?.slice(-6)}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : reviewSearchQuery ? (
                <div className="text-center py-12">
                  <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <p className="mt-4 text-gray-500">No reviews found</p>
                  <p className="text-sm text-gray-400 mt-1">Try adjusting your search query</p>
                </div>
              ) : (
                <div className="text-center py-12">
                  <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                  <p className="mt-4 text-gray-500">No reviews yet</p>
                  <p className="text-sm text-gray-400 mt-1">Be the first to review this cook!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  )
}

export default CookMeals
