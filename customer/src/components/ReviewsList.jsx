import { useState } from 'react'
import { FiStar, FiX, FiSearch } from 'react-icons/fi'
import StarRating from './StarRating'

const ReviewsList = ({ reviews, isOpen, onClose, title }) => {
    const [searchQuery, setSearchQuery] = useState('')

    if (!isOpen) return null

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

    // Filter reviews based on search query
    const filteredReviews = searchQuery
        ? reviews.filter(review => 
            review.reviewText?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            review.customerId?.name?.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : reviews

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black bg-opacity-50" style={{ zIndex: 10001 }} onClick={onClose} />

            {/* Modal */}
            <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 10001 }}>
                <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                    {/* Header */}
                    <div className="p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-gray-900">{title}</h2>
                            <button
                                onClick={onClose}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <FiX className="w-6 h-6" />
                            </button>
                        </div>
                        
                        {/* Total Reviews Count */}
                        <p className="text-sm text-gray-600 mb-3">
                            {reviews.length} {reviews.length === 1 ? 'Review' : 'Reviews'}
                        </p>

                        {/* Search Bar */}
                        {reviews.length > 0 && (
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Search reviews..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full px-4 py-2 pl-10 pr-10 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200 transition-all"
                                />
                                <FiSearch className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        <FiX className="w-5 h-5" />
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Reviews */}
                    <div className="p-6">
                        {filteredReviews.length > 0 ? (
                            <>
                                {searchQuery && (
                                    <p className="text-sm text-gray-600 mb-4">
                                        Found {filteredReviews.length} {filteredReviews.length === 1 ? 'review' : 'reviews'} matching "{searchQuery}"
                                    </p>
                                )}
                                <div className="space-y-4">
                                    {filteredReviews.map((review) => (
                                        <div key={review._id} className="border-b border-gray-100 pb-4 last:border-0">
                                            <div className="flex items-start justify-between mb-2">
                                                <div>
                                                    <p className="font-semibold text-gray-900">
                                                        {review.customerId?.name || 'Customer'}
                                                    </p>
                                                    <p className="text-xs text-gray-500">{formatDate(review.createdAt)}</p>
                                                </div>
                                                <StarRating rating={review.rating} size="sm" />
                                            </div>
                                            {review.reviewText && (
                                                <p className="text-gray-700 text-sm">{review.reviewText}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="text-center py-8">
                                <FiStar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                <p className="text-gray-500">
                                    {searchQuery ? `No reviews found matching "${searchQuery}"` : 'No reviews yet'}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    )
}

export default ReviewsList
