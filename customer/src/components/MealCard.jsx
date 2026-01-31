import { useState } from 'react'
import Card from './Card'

const MealCard = ({ meal }) => {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)

  const imageSrc = meal.image || meal.itemImage || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&h=300&fit=crop'

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
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-lg font-semibold text-gray-900 line-clamp-1">{meal.name}</h3>
          <span className="text-lg font-bold text-orange-600">Rs {meal.price}</span>
        </div>
        
        <p className="mt-2 text-sm text-gray-600 line-clamp-2">{meal.description}</p>
        
        {/* Category & Availability */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-700 capitalize">
            {meal.category}
          </span>
          {meal.availability && (
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
              meal.availability === 'Available' 
                ? 'bg-green-100 text-green-700' 
                : 'bg-red-100 text-red-700'
            }`}>
              {meal.availability}
            </span>
          )}
        </div>
        
        <div className="mt-4">
          <button 
            className="w-full rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-orange-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={meal.availability === 'OutOfStock'}
          >
            {meal.availability === 'OutOfStock' ? 'Out of Stock' : 'Order Now'}
          </button>
        </div>
      </div>
    </Card>
  )
}

export default MealCard
