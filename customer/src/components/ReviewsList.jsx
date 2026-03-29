import { FiStar, FiX } from 'react-icons/fi'
import StarRating from './StarRating'

const sentimentColors = {
    positive: { bg: 'bg-green-100', text: 'text-green-700' },
    negative: { bg: 'bg-red-100', text: 'text-red-700' },
    neutral: { bg: 'bg-gray-100', text: 'text-gray-600' },
}

const sentimentEmoji = { positive: '😊', negative: '😟', neutral: '😐' }

const ReviewsList = ({ reviews, isOpen, onClose, title }) => {
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

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-50 bg-black bg-opacity-50" onClick={onClose} />

            {/* Modal */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
                        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <FiX className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Reviews */}
                    <div className="p-6">
                        {reviews.length > 0 ? (
                            <div className="space-y-4">
                                {reviews.map((review) => (
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
                                        {review.aspects && review.aspects.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5 mt-2">
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
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <FiStar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                <p className="text-gray-500">No reviews yet</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    )
}

export default ReviewsList
