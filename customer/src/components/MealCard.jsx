import Card from './Card'

const MealCard = ({ meal }) => {
  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <div className="aspect-video w-full overflow-hidden bg-gray-100">
        <img
          src={meal.image || meal.itemImage || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&h=300&fit=crop'}
          alt={meal.name}
          className="h-full w-full object-cover"
        />
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-lg font-semibold text-gray-900">{meal.name}</h3>
          <span className="text-lg font-bold text-orange-600">PKR {meal.price}</span>
        </div>
        
        {/* Cook Name */}
        {meal.cookName && (
          <div className="mt-2 flex items-center gap-1.5 text-sm text-gray-600">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span>by {meal.cookName}</span>
          </div>
        )}
        
        <p className="mt-2 text-sm text-gray-600 line-clamp-2">{meal.description}</p>
        
        {/* Category and Availability */}
        <div className="mt-3 flex items-center gap-2">
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
          <button className="w-full rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 transition-colors">
            Order Now
          </button>
        </div>
      </div>
    </Card>
  )
}

export default MealCard
