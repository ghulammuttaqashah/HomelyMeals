import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { getCookReviews } from '../api/review'
import Header from '../components/Header'
import Footer from '../components/Footer'
import Loader from '../components/Loader'
import StarRating from '../components/StarRating'
import { FiStar, FiFilter, FiTrendingUp } from 'react-icons/fi'

const sentimentColors = {
    positive: { bg: 'bg-green-100', text: 'text-green-700', bar: 'bg-green-500' },
    negative: { bg: 'bg-red-100', text: 'text-red-700', bar: 'bg-red-500' },
    neutral: { bg: 'bg-gray-100', text: 'text-gray-600', bar: 'bg-gray-400' },
}

const sentimentEmoji = { positive: '😊', negative: '😟', neutral: '😐' }

const Reviews = () => {
    const navigate = useNavigate()
    const [reviews, setReviews] = useState([])
    const [stats, setStats] = useState(null)
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState('all')

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
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

        if (diffDays === 0) return 'Today'
        if (diffDays === 1) return 'Yesterday'
        if (diffDays < 7) return `${diffDays} days ago`
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
        return reviewDate.toLocaleDateString()
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Header showSignOut={true} />
                <div className="flex items-center justify-center h-[calc(100vh-64px)]">
                    <Loader />
                </div>
            </div>
        )
    }

    return (
        <div className="flex min-h-screen flex-col bg-gray-50">
            <Header showSignOut={true} />

            <main className="flex-1">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <h1 className="text-2xl font-bold text-gray-900 mb-6">My Reviews</h1>

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

                    {/* ABSA – Aspect-Based Sentiment Analysis */}
                    {stats && stats.aspectSummary && stats.aspectSummary.length > 0 && (
                        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                            <div className="flex items-center gap-2 mb-4">
                                <FiTrendingUp className="w-5 h-5 text-orange-600" />
                                <h2 className="text-lg font-semibold text-gray-900">Aspect Insights</h2>
                                <span className="ml-auto text-xs text-gray-500">Powered by ABSA</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {stats.aspectSummary.map((item) => {
                                    const dominant =
                                        item.positive >= item.negative && item.positive >= item.neutral
                                            ? 'positive'
                                            : item.negative >= item.neutral
                                            ? 'negative'
                                            : 'neutral'
                                    const colors = sentimentColors[dominant]
                                    return (
                                        <div key={item.aspect} className={`rounded-lg p-4 ${colors.bg}`}>
                                            <div className="flex items-center justify-between mb-2">
                                                <span className={`text-sm font-semibold ${colors.text}`}>
                                                    {item.label}
                                                </span>
                                                <span className="text-lg">{sentimentEmoji[dominant]}</span>
                                            </div>
                                            <div className="space-y-1">
                                                {[
                                                    { key: 'positive', label: 'Positive', count: item.positive, pct: item.positivePercent },
                                                    { key: 'negative', label: 'Negative', count: item.negative, pct: item.negativePercent },
                                                    { key: 'neutral', label: 'Neutral', count: item.neutral, pct: item.neutralPercent },
                                                ].map(({ key, label, count, pct }) => (
                                                    <div key={key} className="flex items-center gap-2 text-xs">
                                                        <span className="w-14 text-gray-600">{label}</span>
                                                        <div className="flex-1 bg-white bg-opacity-60 rounded-full h-1.5">
                                                            <div
                                                                className={`${sentimentColors[key].bar} h-1.5 rounded-full`}
                                                                style={{ width: `${pct}%` }}
                                                            />
                                                        </div>
                                                        <span className="w-6 text-right text-gray-600">{count}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            <p className="mt-2 text-xs text-gray-500">{item.total} mention{item.total !== 1 ? 's' : ''}</p>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {/* Filter */}
                    <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
                        <div className="flex items-center gap-3">
                            <FiFilter className="w-5 h-5 text-gray-600" />
                            <select
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                            >
                                <option value="all">All Reviews</option>
                                <option value="cook">Cook Reviews</option>
                                <option value="meal">Meal Reviews</option>
                            </select>
                        </div>
                    </div>

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

                                    {/* Aspect tags */}
                                    {review.aspects && review.aspects.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mb-3">
                                            {review.aspects.map((a) => {
                                                const colors = sentimentColors[a.sentiment]
                                                return (
                                                    <span
                                                        key={a.aspect}
                                                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}
                                                    >
                                                        {sentimentEmoji[a.sentiment]} {a.label}
                                                    </span>
                                                )
                                            })}
                                        </div>
                                    )}

                                    {review.reviewType === 'meal' && review.mealId && (
                                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-50 rounded-full text-xs font-medium text-orange-700">
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
                </div>
            </main>

            <Footer />
        </div>
    )
}

export default Reviews
