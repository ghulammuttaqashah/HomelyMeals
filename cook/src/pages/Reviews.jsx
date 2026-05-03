import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { getCookReviews } from '../api/review'
import { getCookAnalytics } from '../api/analytics'
import Header from '../components/Header'
import Footer from '../components/Footer'
import Loader from '../components/Loader'
import StarRating from '../components/StarRating'
import AnalyticsOverview from '../components/AnalyticsOverview'
import { FiStar, FiArrowLeft, FiBarChart2 } from 'react-icons/fi'

const Reviews = () => {
    const navigate = useNavigate()
    const [reviews, setReviews] = useState([])
    const [stats, setStats] = useState(null)
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState('all')
    const [showAnalyticsMenu, setShowAnalyticsMenu] = useState(false)
    const [showCookAnalytics, setShowCookAnalytics] = useState(false)
    const [cookAnalytics, setCookAnalytics] = useState(null)

    useEffect(() => {
        fetchReviews()
    }, [filter])

    const fetchReviews = async () => {
        try {
            setLoading(true)
            const data = await getCookReviews(filter)
            setReviews(data.reviews)
            setStats(data.stats)
        } catch (error) {
            console.error('Fetch reviews error:', error)
            toast.error('Failed to load reviews')
        } finally {
            setLoading(false)
        }
    }

    const formatDate = (date) => {
        const now = new Date()
        const reviewDate = new Date(date)
        const diffTime = Math.abs(now - reviewDate)
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

        if (diffDays === 0) return 'Today'
        if (diffDays === 1) return 'Yesterday'
        if (diffDays < 7) return `${diffDays} days ago`
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
        return reviewDate.toLocaleDateString()
    }

    const handleViewCookAnalytics = async () => {
        try {
            setLoading(true)
            const data = await getCookAnalytics()
            setCookAnalytics(data)
            setShowCookAnalytics(true)
            setShowAnalyticsMenu(false)
        } catch (error) {
            console.error('Fetch cook analytics error:', error)
            toast.error('Failed to load analytics')
        } finally {
            setLoading(false)
        }
    }

    const handleViewMealsAnalytics = () => {
        navigate('/menu')
        setShowAnalyticsMenu(false)
    }

    return (
        <div className="flex min-h-screen flex-col bg-gray-50">
            <Header showSignOut={true} />

            <main className="flex-1">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="mb-6 sm:mb-8">
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-orange-600 transition-colors"
                        >
                            <FiArrowLeft className="w-4 h-4" />
                            Back to Dashboard
                        </button>
                        <h1 className="text-2xl font-bold text-gray-900 text-center">My Reviews</h1>
                    </div>

                    {/* View Analytics Button - Centered */}
                    <div className="flex justify-center mb-6">
                        <button
                            onClick={() => setShowAnalyticsMenu(true)}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium text-sm shadow-md"
                        >
                            <FiBarChart2 className="w-5 h-5" />
                            View Analytics
                        </button>
                    </div>

                    {loading ? (
                        <div className="rounded-lg border border-gray-200 bg-white py-16 shadow-sm">
                            <div className="flex flex-col items-center gap-3">
                                <Loader size="lg" />
                                <p className="text-sm font-medium text-gray-600">Loading reviews...</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Stats Overview */}
                            {stats && (
                            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {/* Average Rating */}
                                    <div className="text-center">
                                        <div className="text-4xl font-bold text-orange-600 mb-2">
                                            {stats.averageRating.toFixed(1)}
                                        </div>
                                        <StarRating rating={stats.averageRating} size="lg" />
                                        <p className="text-sm text-gray-600 mt-2">Average Rating</p>
                                    </div>

                                    {/* Total Reviews */}
                                    <div className="text-center">
                                        <div className="text-4xl font-bold text-gray-900 mb-2">
                                            {stats.totalReviews}
                                        </div>
                                        <p className="text-sm text-gray-600">Total Reviews</p>
                                    </div>

                                    {/* Rating Distribution */}
                                    <div className="space-y-2">
                                        <p className="text-sm font-medium text-gray-700 mb-3">Rating Distribution</p>
                                        {[5, 4, 3, 2, 1].map((star) => (
                                            <div key={star} className="flex items-center gap-2">
                                                <span className="text-xs text-gray-600 w-8">{star} ⭐</span>
                                                <div className="flex-1 bg-gray-200 rounded-full h-2">
                                                    <div
                                                        className="bg-orange-500 h-2 rounded-full"
                                                        style={{
                                                            width: `${stats.totalReviews > 0 ? (stats.ratingDistribution[star] / stats.totalReviews) * 100 : 0}%`,
                                                        }}
                                                    />
                                                </div>
                                                <span className="text-xs text-gray-600 w-8">{stats.ratingDistribution[star]}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Reviews List */}
                        {reviews.length > 0 ? (
                            <div className="space-y-4">
                                {reviews.map((review) => (
                                    <div key={review._id} className="bg-white rounded-lg shadow-sm p-6">
                                        <div className="flex items-start justify-between mb-3">
                                            <div>
                                                <p className="font-semibold text-gray-900">{review.customerId?.name || 'Customer'}</p>
                                                <p className="text-xs text-gray-500">{formatDate(review.createdAt)}</p>
                                            </div>
                                            <StarRating rating={review.rating} size="md" />
                                        </div>

                                        {review.reviewText && (
                                            <p className="text-gray-700 mb-3">{review.reviewText}</p>
                                    )}

                                    {/* Show ABSA aspects if available */}
                                    {review.aspects && review.aspects.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 mt-2">
                                            {review.aspects.slice(0, 5).map((aspect, ai) => (
                                                <span
                                                    key={ai}
                                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                                                        aspect.sentiment === 'positive' || aspect.sentiment === 'Positive'
                                                            ? 'bg-green-100 text-green-700'
                                                            : 'bg-red-100 text-red-700'
                                                    }`}
                                                >
                                                    {aspect.sentiment === 'positive' || aspect.sentiment === 'Positive' ? '✓' : '✗'} {aspect.aspect || aspect.category}
                                                </span>
                                            ))}
                                            {review.aspects.length > 5 && (
                                                <span className="text-xs text-gray-400">+{review.aspects.length - 5} more</span>
                                            )}
                                        </div>
                                    )}

                                    {review.reviewType === 'meal' && review.mealId && (
                                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-50 rounded-full text-xs font-medium text-orange-700 mt-2">
                                            <FiStar className="w-3 h-3" />
                                            {review.mealId.name}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <FiStar className="w-8 h-8 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Reviews Yet</h3>
                            <p className="text-gray-600">
                                {filter === 'all'
                                    ? 'You haven\'t received any reviews yet.'
                                    : `No ${filter} reviews found.`}
                            </p>
                        </div>
                    )}
                        </>
                    )}
                </div>
            </main>

            {/* Analytics Menu Modal */}
            {showAnalyticsMenu && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">View Analytics</h2>
                        <p className="text-sm text-gray-600 mb-6">Choose which analytics you want to view:</p>
                        
                        <div className="space-y-3">
                            <button
                                onClick={handleViewCookAnalytics}
                                className="w-full flex items-center gap-3 p-4 border-2 border-gray-200 rounded-xl hover:border-orange-500 hover:bg-orange-50 transition-all"
                            >
                                <div className="flex-shrink-0 w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                                    <span className="text-2xl">👨‍🍳</span>
                                </div>
                                <div className="text-left">
                                    <h3 className="font-semibold text-gray-900">Cook's Analytics</h3>
                                    <p className="text-xs text-gray-600">View your overall performance</p>
                                </div>
                            </button>

                            <button
                                onClick={handleViewMealsAnalytics}
                                className="w-full flex items-center gap-3 p-4 border-2 border-gray-200 rounded-xl hover:border-orange-500 hover:bg-orange-50 transition-all"
                            >
                                <div className="flex-shrink-0 w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                                    <span className="text-2xl">🍽️</span>
                                </div>
                                <div className="text-left">
                                    <h3 className="font-semibold text-gray-900">Meals Analytics</h3>
                                    <p className="text-xs text-gray-600">View individual meal performance</p>
                                </div>
                            </button>
                        </div>

                        <button
                            onClick={() => setShowAnalyticsMenu(false)}
                            className="w-full mt-4 px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Cook Analytics Modal */}
            {showCookAnalytics && cookAnalytics && (
                <AnalyticsOverview
                    analytics={cookAnalytics}
                    type="cook"
                    onClose={() => setShowCookAnalytics(false)}
                />
            )}

            <Footer />
        </div>
    )
}

export default Reviews
