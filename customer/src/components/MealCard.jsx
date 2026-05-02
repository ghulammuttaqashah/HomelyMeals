import { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import Card from './Card'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { getMealReviews, checkCanReviewMeal } from '../api/review'
import StarRating from './StarRating'
import ReviewsList from './ReviewsList'
import { FiShoppingCart, FiPlus, FiMinus, FiCheck, FiStar, FiArrowRight } from 'react-icons/fi'
import DishAnalytics from './DishAnalytics'

const MealCard = ({ meal, cook, cookServesArea = true }) => {
  const navigate = useNavigate()
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const [showQuantity, setShowQuantity] = useState(false)
  const [added, setAdded] = useState(false)

  // Review states
  const [mealReviews, setMealReviews] = useState([])
  const [mealRating, setMealRating] = useState(0)
  const [showReviewsModal, setShowReviewsModal] = useState(false)
  const [checkingEligibility, setCheckingEligibility] = useState(false)

  const { addToCart, canAddFromCook, cart } = useCart()
  const { isAuthenticated } = useAuth()

  const imageSrc = meal.image || meal.itemImage || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&h=300&fit=crop'

  // Fetch meal reviews
  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const mealId = meal.id || meal.mealId
        if (mealId) {
          const data = await getMealReviews(mealId)
          setMealReviews(data.reviews || [])
          setMealRating(data.averageRating || 0)
        }
      } catch (error) {
        console.error('Error fetching meal reviews:', error)
      }
    }
    fetchReviews()
  }, [meal.id, meal.mealId])

  const handleAddToCart = () => {
    if (!cook) {
      toast.error('Cook information not available')
      return
    }

    // Handle both _id and cookId formats
    const cookIdentifier = cook._id || cook.cookId

    if (!cookIdentifier) {
      toast.error('Cook ID not available')
      console.error('Cook object missing _id:', cook)
      return
    }

    if (!canAddFromCook(cookIdentifier)) {
      toast.error(`You can only order from one cook at a time. Clear your cart first to order from ${cook.name}.`)
      return
    }

    addToCart(
      {
        mealId: meal.id,
        name: meal.name,
        price: meal.price,
        imageUrl: meal.image || meal.itemImage,
        quantity,
      },
      { _id: cookIdentifier, name: cook.name }
    )

    setAdded(true)
    toast(
      (t) => (
        <div className="flex items-center gap-3">
          <FiShoppingCart className="w-5 h-5 text-orange-500 flex-shrink-0" />
          <span className="text-sm font-medium text-gray-800 flex-1">
            <span className="font-semibold text-orange-600">{meal.name}</span> added to cart
          </span>
          <button
            onClick={() => {
              toast.dismiss(t.id)
              navigate('/cart')
            }}
            className="flex items-center gap-1 bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors flex-shrink-0"
          >
            Go to Cart
            <FiArrowRight className="w-3 h-3" />
          </button>
        </div>
      ),
      {
        duration: 5000,
        style: { padding: '12px 16px', maxWidth: '380px' },
        icon: null,
      }
    )

    setTimeout(() => {
      setAdded(false)
      setShowQuantity(false)
      setQuantity(1)
    }, 1500)
  }

  const handleReviewClick = async () => {
    if (!isAuthenticated) {
      toast.error('Please sign in to leave a review')
      return
    }

    try {
      setCheckingEligibility(true)
      const mealId = meal.id || meal.mealId
      const eligibility = await checkCanReviewMeal(mealId)

      if (!eligibility.canReview) {
        toast.error(eligibility.message || 'Cannot review this meal')
        return
      }

      // Navigate to the order details page to write the unified review
      navigate(`/orders/${eligibility.eligibleOrderId}`)
    } catch (error) {
      console.error('Error checking review eligibility:', error)
      toast.error('Failed to check review eligibility')
    } finally {
      setCheckingEligibility(false)
    }
  }

  const handleReviewSubmitted = () => {
    const mealId = meal.id || meal.mealId
    const fetchReviews = async () => {
      try {
        if (mealId) {
          const data = await getMealReviews(mealId)
          setMealReviews(data.reviews || [])
          setMealRating(data.averageRating || 0)
        }
      } catch (error) {
        console.error('Error refreshing reviews:', error)
      }
    }
    fetchReviews()
  }

  const isInCart = cart.items.some(item => item.mealId === meal.id)
  const isOutOfStock = meal.availability === 'OutOfStock'
  const isDisabled = isOutOfStock || !cookServesArea

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <div className="aspect-video w-full overflow-hidden bg-gray-100 relative">
        {/* Skeleton loader for image */}
        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 bg-gray-200 animate-pulse" />
        )}
        <img
          src={imageError ? 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&h=300&fit=crop' : imageSrc}
          alt={meal.name}
          className={`h-full w-full object-cover ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setImageLoaded(true)}
          onError={() => {
            setImageError(true)
            setImageLoaded(true)
          }}
        />
        {isInCart && (
          <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
            <FiCheck className="w-3 h-3" />
            In Cart
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-lg font-semibold text-gray-900 line-clamp-1">{meal.name}</h3>
          <span className="text-lg font-bold text-orange-600">Rs {meal.price}</span>
        </div>

        <p className="mt-2 text-sm text-gray-600 line-clamp-2">{meal.description}</p>

        {/* Meal Rating */}
        {mealRating > 0 && (
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <StarRating rating={mealRating} size="sm" />
            <span className="text-xs font-medium text-gray-700">
              {mealRating.toFixed(1)}
            </span>
            <button
              onClick={() => setShowReviewsModal(true)}
              className="text-xs text-orange-600 hover:text-orange-700 font-medium"
            >
              ({mealReviews.length} {mealReviews.length === 1 ? 'review' : 'reviews'})
            </button>
            {mealReviews.length >= 5 && mealRating >= 4.0 && (
              <span className="bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full font-semibold">
                Popular
              </span>
            )}
          </div>
        )}

        {/* Dish Analytics — always shown, handles its own empty state */}
        <div className="mt-3">
          <DishAnalytics mealId={meal.id || meal.mealId} />
        </div>

        {/* Write Review Button */}
        {isAuthenticated && (
          <button
            onClick={handleReviewClick}
            disabled={checkingEligibility}
            className="mt-3 w-full py-2 px-4 text-sm font-medium text-orange-600 hover:text-white hover:bg-orange-600 border-2 border-orange-600 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FiStar className="w-4 h-4" />
            {checkingEligibility ? 'Checking...' : 'Write Review'}
          </button>
        )}

        {/* Category & Availability */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-700 capitalize">
            {meal.category}
          </span>
          {meal.availability && (
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${meal.availability === 'Available'
              ? 'bg-green-100 text-green-700'
              : 'bg-red-100 text-red-700'
              }`}>
              {meal.availability}
            </span>
          )}
        </div>

        <div className="mt-4">
          {showQuantity ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center border rounded-lg">
                <button
                  onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  className="p-2 hover:bg-gray-100 transition-colors"
                >
                  <FiMinus className="w-4 h-4" />
                </button>
                <span className="w-10 text-center font-medium">{quantity}</span>
                <button
                  onClick={() => setQuantity(q => q + 1)}
                  className="p-2 hover:bg-gray-100 transition-colors"
                >
                  <FiPlus className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={handleAddToCart}
                disabled={added || !cookServesArea}
                className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-colors ${added
                  ? 'bg-green-500'
                  : 'bg-orange-600 hover:bg-orange-700'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {added ? (
                  <span className="flex items-center justify-center gap-2">
                    <FiCheck /> Added
                  </span>
                ) : (
                  'Add'
                )}
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                if (!isAuthenticated) {
                  toast.error('Please login to add items to cart')
                  return
                }
                if (!cookServesArea) {
                  toast.error('This cook doesn\'t serve your delivery area')
                  return
                }
                if (!isDisabled) setShowQuantity(true)
              }}
              className="w-full rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-orange-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              disabled={isDisabled}
              title={!cookServesArea ? 'Cook doesn\'t serve your area' : isOutOfStock ? 'Out of stock' : ''}
            >
              <FiShoppingCart className="w-4 h-4" />
              {isOutOfStock ? 'Out of Stock' : !cookServesArea ? 'Not Available' : 'Add to Cart'}
            </button>
          )}
        </div>
      </div>

      {/* Reviews Modal */}
      <ReviewsList
        reviews={mealReviews}
        isOpen={showReviewsModal}
        onClose={() => setShowReviewsModal(false)}
        title={`Reviews for ${meal.name}`}
      />

      {/* Write Review - navigates to order details page */}
      {/* Review is now done from the Order Details page (unified per-order review) */}
    </Card>
  )
}

export default MealCard
