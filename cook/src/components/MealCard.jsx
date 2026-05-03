import { useState } from 'react'

const MealCard = ({ meal, showActions = false, onEdit, onDelete, onViewAnalytics }) => {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)

  const imageSrc = meal.itemImage || meal.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&h=300&fit=crop'

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow">
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
      </div>
      <div className="p-3 sm:p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 line-clamp-1">{meal.name}</h3>
          <span className="text-base sm:text-lg font-bold text-orange-600 whitespace-nowrap">PKR {meal.price}</span>
        </div>
        
        <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm text-gray-600 line-clamp-2">{meal.description}</p>
        
        {/* Category and Availability */}
        <div className="mt-2 sm:mt-3 flex flex-wrap items-center gap-1.5 sm:gap-2">
          <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] sm:text-xs font-medium text-orange-700 capitalize">
            {meal.category}
          </span>
          <span className={`rounded-full px-2 py-0.5 text-[10px] sm:text-xs font-medium ${
            meal.availability === 'Available' 
              ? 'bg-green-100 text-green-700' 
              : 'bg-red-100 text-red-700'
          }`}>
            {meal.availability || 'Available'}
          </span>
        </div>
        
        {showActions && (
          <div className="mt-3 sm:mt-4 space-y-2">
            {/* View Analytics Button */}
            {onViewAnalytics && (
              <button
                onClick={() => onViewAnalytics(meal)}
                className="w-full rounded-lg bg-orange-600 px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm font-medium text-white hover:bg-orange-700 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                View Analytics
              </button>
            )}
            
            {/* Edit and Delete Buttons */}
            <div className="flex gap-2">
              {onEdit && (
                <button
                  onClick={() => onEdit(meal)}
                  className="flex-1 rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Edit
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => onDelete(meal)}
                  className="flex-1 rounded-lg border border-red-300 bg-white px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm font-medium text-red-700 hover:bg-red-50 transition-colors"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default MealCard
