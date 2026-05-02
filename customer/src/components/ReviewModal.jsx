import { useState } from 'react'
import { FiX, FiStar, FiLoader } from 'react-icons/fi'
import toast from 'react-hot-toast'
import { submitReview } from '../api/review'
import StarRating from './StarRating'
import Button from './Button'
import Loader from './Loader'

/**
 * Unified order review modal.
 * Customer writes ONE free-text review per order.
 * AI (Groq ABSA) automatically classifies aspects for meal and cook.
 */
const ReviewModal = ({ isOpen, onClose, orderId, cookId, cookName, onReviewSubmitted }) => {
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

        if (!reviewText || reviewText.trim().length < 10) {
            toast.error('Review must be at least 10 characters')
            return
        }

        try {
            setSubmitting(true)

            await submitReview({
                orderId,
                cookId,
                rating,
                reviewText: reviewText.trim(),
            })

            toast.success('Review submitted! Our AI is analyzing your feedback.')
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

    const ratingLabels = {
        1: '😞 Poor',
        2: '😐 Fair',
        3: '😊 Good',
        4: '👍 Very Good',
        5: '⭐ Excellent!'
    }

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black bg-opacity-50"
                style={{ zIndex: 10001 }}
                onClick={handleClose}
            />

            {/* Modal */}
            <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 10001 }}>
                <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                    {/* Header */}
                    <div className="flex items-center justify-between p-5 border-b border-gray-100">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Review Your Order</h2>
                            <p className="text-sm text-gray-500 mt-0.5">from {cookName}</p>
                        </div>
                        <button
                            onClick={handleClose}
                            disabled={submitting}
                            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50 p-1"
                        >
                            <FiX className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="p-5 space-y-5">
                        {/* AI badge */}
                        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg border border-blue-100">
                            <span className="text-blue-600 text-lg">🤖</span>
                            <p className="text-xs text-blue-700">
                                <span className="font-semibold">AI-powered analysis</span> — just write naturally.
                                Our AI will automatically identify what you liked or disliked about the food, packaging, cook behavior, and more.
                            </p>
                        </div>

                        {/* Rating */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Overall Rating <span className="text-red-500">*</span>
                            </label>
                            <StarRating
                                rating={rating}
                                onChange={setRating}
                                size="xl"
                                interactive={true}
                            />
                            {rating > 0 && (
                                <p className="mt-2 text-sm text-gray-600">{ratingLabels[rating]}</p>
                            )}
                        </div>

                        {/* Review Text */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Your Review <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                value={reviewText}
                                onChange={(e) => setReviewText(e.target.value)}
                                maxLength={1000}
                                rows={5}
                                placeholder={`Share your experience with this order...\n\nExamples:\n• "Food was tasty but packaging was bad"\n• "Cook was very polite and delivery was on time"\n• "Portion was small but the taste was amazing"`}
                                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200 resize-none transition-colors"
                                required
                            />
                            <div className="flex justify-between mt-1">
                                <p className="text-xs text-gray-400">Minimum 10 characters</p>
                                <p className="text-xs text-gray-400">{reviewText.length}/1000</p>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 pt-1">
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
                                className="flex-1 flex items-center justify-center gap-2"
                            >
                                {submitting && <Loader size="sm" className="text-white" />}
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
