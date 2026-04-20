import { useState } from 'react'
import { FiX } from 'react-icons/fi'
import toast from 'react-hot-toast'
import { submitReview } from '../api/review'
import StarRating from './StarRating'
import Button from './Button'

const ReviewModal = ({ isOpen, onClose, orderId, cookId, cookName, mealId, mealName, reviewType, onReviewSubmitted }) => {
    const [rating, setRating] = useState(0)
    const [reviewText, setReviewText] = useState('')
    const [submitting, setSubmitting] = useState(false)

    if (!isOpen) return null

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (rating === 0) {
            toast.error('Please select a rating')
            return
        }

        if (!reviewText || reviewText.trim().length === 0) {
            toast.error('Please write a review')
            return
        }

        if (reviewText.trim().length < 10) {
            toast.error('Review must be at least 10 characters')
            return
        }

        try {
            setSubmitting(true)

            await submitReview({
                orderId,
                cookId,
                mealId: reviewType === 'meal' ? mealId : undefined,
                rating,
                reviewText,
                reviewType,
            })

            toast.success('Review submitted successfully!')
            setRating(0)
            setReviewText('')
            onClose()

            if (onReviewSubmitted) {
                onReviewSubmitted()
            }
        } catch (error) {
            console.error('Submit review error:', error)
            toast.error(error.response?.data?.message || error.message || 'Failed to submit review')
        } finally {
            setSubmitting(false)
        }
    }

    const handleClose = () => {
        if (!submitting) {
            setRating(0)
            setReviewText('')
            onClose()
        }
    }

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black bg-opacity-50" style={{ zIndex: 10001 }} onClick={handleClose} />

            {/* Modal */}
            <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 10001 }}>
                <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-gray-200">
                        <h2 className="text-xl font-bold text-gray-900">
                            Write a Review
                        </h2>
                        <button
                            onClick={handleClose}
                            disabled={submitting}
                            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
                        >
                            <FiX className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Content */}
                    <form onSubmit={handleSubmit} className="p-6">
                        {/* Review Target */}
                        <div className="mb-6">
                            <p className="text-sm text-gray-600 mb-1">You're reviewing:</p>
                            <p className="text-lg font-semibold text-gray-900">
                                {reviewType === 'meal' ? mealName : cookName}
                            </p>
                            {reviewType === 'cook' && (
                                <p className="text-xs text-gray-500 mt-1">Overall experience with this cook</p>
                            )}
                        </div>

                        {/* Rating */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Rating <span className="text-red-500">*</span>
                            </label>
                            <StarRating
                                rating={rating}
                                onChange={setRating}
                                size="xl"
                                interactive={true}
                            />
                            {rating > 0 && (
                                <p className="mt-2 text-sm text-gray-600">
                                    {rating === 5 && '⭐ Excellent!'}
                                    {rating === 4 && '👍 Very Good'}
                                    {rating === 3 && '😊 Good'}
                                    {rating === 2 && '😐 Fair'}
                                    {rating === 1 && '😞 Poor'}
                                </p>
                            )}
                        </div>

                        {/* Review Text */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Your Review <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                value={reviewText}
                                onChange={(e) => setReviewText(e.target.value)}
                                maxLength={500}
                                rows={4}
                                placeholder="Share your experience... (minimum 10 characters)"
                                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                                required
                            />
                            <p className="mt-1 text-xs text-gray-500 text-right">
                                {reviewText.length}/500 characters
                            </p>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3">
                            <Button
                                type="button"
                                onClick={handleClose}
                                variant="outline"
                                disabled={submitting}
                                className="flex-1"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={submitting || rating === 0 || !reviewText || reviewText.trim().length < 10}
                                className="flex-1"
                            >
                                {submitting ? 'Submitting...' : 'Submit Review'}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    )
}

export default ReviewModal
