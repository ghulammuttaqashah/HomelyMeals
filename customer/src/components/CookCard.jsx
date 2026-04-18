import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import Card from './Card'
import { useAuth } from '../context/AuthContext'

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
    <div 
      className="cursor-pointer h-full"
    >
      <Card className="h-full overflow-hidden hover:shadow-md transition-shadow hover:border-orange-200 flex flex-col">
        {/* Cook Banner Image */}
        <div className="aspect-video w-full overflow-hidden bg-gray-100 relative border-b border-gray-100">
          {cook.profilePicture ? (
            <img 
              src={cook.profilePicture} 
              alt={cook.name} 
              className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50">
              <svg 
                className="h-12 w-12 text-orange-200" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={1.5} 
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" 
                />
              </svg>
            </div>
          )}
          {/* Badge for Meal Count */}
          <div className="absolute bottom-2 right-2 rounded-full bg-white/90 backdrop-blur-sm px-2.5 py-1 text-[11px] font-bold text-gray-800 shadow-sm border border-gray-100">
             {cook.mealCount} {cook.mealCount === 1 ? 'Meal' : 'Meals'}
          </div>
        </div>

        <div className="p-4 flex-1 flex flex-col">
          {/* Cook Name */}
          <h3 className="text-lg font-bold text-gray-900 group-hover:text-orange-600 transition-colors">{cook.name}</h3>
          
          {/* Location */}
          <div className="mt-1 flex items-center gap-1.5 text-sm text-gray-500">
            <svg className="h-4 w-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

          <div className="mt-auto pt-4">
            {/* View Menu Button */}
            <button 
              onClick={handleClick}
              className="w-full rounded-lg bg-white border border-orange-600 px-4 py-2 text-sm font-semibold text-orange-600 hover:bg-orange-600 hover:text-white transition-all duration-200"
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
