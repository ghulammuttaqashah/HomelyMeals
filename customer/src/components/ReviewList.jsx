import { useState, useEffect } from 'react'
import { getMealReviewsByKeyword, getCookReviewsByKeyword } from '../api/analytics'
import StarRating from './StarRating'

const ReviewList = ({ type, entityId, aspect, sentiment, keyword, onBack }) => {
    const [reviews, setReviews] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchReviews()
    }, [type, entityId, aspect, sentiment, keyword])

    const fetchReviews = async () => {
        try {
            setLoading(true)
            const data = type === 'meal'
                ? await getMealReviewsByKeyword(entityId, aspect, sentiment, keyword)
                : await getCookReviewsByKeyword(entityId, aspect, sentiment, keyword)
            
            setReviews(data.reviews || [])
        } catch (error) {
            console.error('Error fetching reviews:', error)
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

    const highlightKeyword = (text, keyword) => {
        if (!text || !keyword) return text
        
        const regex = new RegExp(`(${keyword})`, 'gi')
        const parts = text.split(regex)
        
        return parts.map((part, index) => 
            regex.test(part) ? (
                <span key={index} className="bg-yellow-200 font-semibold">{part}</span>
            ) : (
                part
            )
        )
    }

    if (loading) {
        return (
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                <div className="animate-pulse space-y-4">
                    <div className="h-6 bg-gray-200 rounded w-1/3" />
                    <div className="h-20 bg-gray-200 rounded" />
                    <div className="h-20 bg-gray-200 rounded" />
                </div>
            </div>
        )
    }

    const sentimentColor = sentiment === 'Positive' ? 'green' : 'red'

    return (
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            {/* Header */}
            <div className="mb-6">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-orange-600 hover:text-orange-700 font-medium mb-4"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to Keywords
                </button>
                <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="text-xl font-bold text-gray-900">Reviews</h3>
                    <span className="px-3 py-1 bg-gray-100 rounded-full text-sm font-medium text-gray-700 capitalize">
                        {aspect}
                    </span>
                    <span className={`px-3 py-1 bg-${sentimentColor}-100 rounded-full text-sm font-medium text-${sentimentColor}-700`}>
                        {sentiment}
                    </span>
                    <span className="px-3 py-1 bg-yellow-100 rounded-full text-sm font-medium text-yellow-700">
                        "{keyword}"
                    </span>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                    {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'} found
                </p>
            </div>

            {/* Reviews List */}
            {reviews.length > 0 ? (
                <div className="space-y-4">
                    {reviews.map((review) => (
                        <div 
                            key={review._id} 
                            className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                        >
                            <div className="flex items-start justify-between mb-2">
                                <div>
                                    <p className="font-semibold text-gray-900">
                                        {review.customerId?.name || 'Anonymous'}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {formatDate(review.createdAt)}
                                    </p>
                                </div>
                                <StarRating rating={review.rating} size="sm" />
                            </div>
                            {review.reviewText && (
                                <p className="text-gray-700 text-sm leading-relaxed">
                                    {highlightKeyword(review.reviewText, keyword)}
                                </p>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12">
                    <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-gray-600">No reviews found</p>
                </div>
            )}
        </div>
    )
}

export default ReviewList
