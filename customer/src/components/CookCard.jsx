import { useNavigate } from 'react-router-dom'
import Card from './Card'

const CookCard = ({ cook }) => {
  const navigate = useNavigate()

  const handleClick = () => {
    navigate(`/cook/${cook.cookId}`)
  }

  return (
    <div 
      onClick={handleClick} 
      className="cursor-pointer"
    >
      <Card className="hover:shadow-md transition-shadow hover:border-orange-200">
        <div className="p-6">
          {/* Cook Icon */}
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-orange-100">
            <svg 
              className="h-8 w-8 text-orange-600" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" 
              />
            </svg>
          </div>

          {/* Cook Name */}
          <h3 className="text-lg font-semibold text-gray-900">{cook.name}</h3>
          
          {/* Location */}
          <div className="mt-2 flex items-center gap-1.5 text-sm text-gray-600">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" 
              />
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" 
              />
            </svg>
            <span>{cook.city}</span>
          </div>

          {/* Meal Count */}
          <div className="mt-3 flex items-center gap-1.5">
            <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
              {cook.mealCount} {cook.mealCount === 1 ? 'meal' : 'meals'} available
            </span>
          </div>

          {/* View Menu Button */}
          <button 
            className="mt-4 w-full rounded-lg border border-orange-600 px-4 py-2 text-sm font-medium text-orange-600 hover:bg-orange-50 transition-colors"
          >
            View Menu
          </button>
        </div>
      </Card>
    </div>
  )
}

export default CookCard
