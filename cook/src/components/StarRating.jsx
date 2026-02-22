import { FiStar } from 'react-icons/fi'
import { FaStar, FaStarHalfAlt } from 'react-icons/fa'

const StarRating = ({ rating = 0, size = 'md', showCount = false, count = 0 }) => {
    const sizes = {
        sm: 'w-3 h-3',
        md: 'w-5 h-5',
        lg: 'w-6 h-6',
        xl: 'w-8 h-8',
    }

    const sizeClass = sizes[size] || sizes.md

    const renderStars = () => {
        const stars = []
        const fullStars = Math.floor(rating)
        const hasHalfStar = rating % 1 >= 0.5

        for (let i = 1; i <= 5; i++) {
            const isFilled = i <= fullStars
            const isHalf = i === fullStars + 1 && hasHalfStar

            stars.push(
                <span key={i} className={sizeClass}>
                    {isFilled ? (
                        <FaStar className="text-orange-500" />
                    ) : isHalf ? (
                        <FaStarHalfAlt className="text-orange-500" />
                    ) : (
                        <FiStar className="text-gray-300" />
                    )}
                </span>
            )
        }

        return stars
    }

    return (
        <div className="flex items-center gap-1">
            {renderStars()}
            {showCount && count > 0 && (
                <span className="ml-1 text-sm text-gray-600">({count})</span>
            )}
        </div>
    )
}

export default StarRating
