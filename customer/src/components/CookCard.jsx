import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import Card from './Card'
import { useAuth } from '../context/AuthContext'
import CookAnalytics from './CookAnalytics'

const CookCard = ({ cook }) => {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()

  const handleClick = (e) => {
    e.stopPropagation()
    if (!isAuthenticated) {
      toast.error('Please log in to view a cook\'s menu.')
      navigate('/login')
      return
    }
    navigate(`/cook/${cook.cookId}`)
  }

  return (
    <div className="h-full">
      <Card className="h-full overflow-hidden hover:shadow-lg transition-all duration-300 hover:border-orange-300 flex flex-col">
        {/* Cook Banner Image */}
        <div className="aspect-[4/3] w-full overflow-hidden bg-gray-100 relative">
          <img 
            src={cook.profilePicture || '/default-profile.jpg'} 
            alt={cook.name} 
            className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
            onError={(e) => {
              e.target.src = '/default-profile.jpg'
            }}
          />
          {/* Badge for Meal Count */}
          <div className="absolute bottom-3 right-3 rounded-full bg-white/95 backdrop-blur-sm px-3 py-1.5 text-xs font-bold text-gray-800 shadow-md border border-gray-200">
            🍽️ {cook.mealCount} {cook.mealCount === 1 ? 'Meal' : 'Meals'}
          </div>
        </div>

        <div className="p-4 sm:p-5 flex-1 flex flex-col">
          {/* Cook Name */}
          <h3 className="text-lg sm:text-xl font-bold text-gray-900 line-clamp-1 mb-2">
            {cook.name}
          </h3>
          
          {/* Location */}
          <div className="flex items-center gap-2 text-sm sm:text-base text-gray-600 mb-4">
            <svg className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            <span className="line-clamp-1">{cook.city}</span>
          </div>

          <div className="mt-auto space-y-2.5">
            {/* View Analytics Button */}
            <CookAnalytics cookId={cook.cookId} />
            
            {/* View Menu Button */}
            <button 
              onClick={handleClick}
              className="w-full rounded-lg bg-white border-2 border-orange-600 px-4 py-2.5 sm:py-3 text-sm sm:text-base font-semibold text-orange-600 hover:bg-orange-600 hover:text-white transition-all duration-200 shadow-sm hover:shadow-md"
            >
              View Menu
            </button>
          </div>
        </div>
      </Card>
    </div>
  )
}

export default CookCard
