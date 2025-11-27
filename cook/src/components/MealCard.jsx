const MealCard = ({ meal, showActions = false, onEdit, onDelete }) => {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow">
      <div className="aspect-video w-full overflow-hidden bg-gray-100">
        <img
          src={meal.itemImage || meal.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&h=300&fit=crop'}
          alt={meal.name}
          className="h-full w-full object-cover"
        />
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-lg font-semibold text-gray-900">{meal.name}</h3>
          <span className="text-lg font-bold text-orange-600">PKR {meal.price}</span>
        </div>
        
        <p className="mt-2 text-sm text-gray-600 line-clamp-2">{meal.description}</p>
        
        {/* Category and Availability */}
        <div className="mt-3 flex items-center gap-2">
          <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-700 capitalize">
            {meal.category}
          </span>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
            meal.availability === 'Available' 
              ? 'bg-green-100 text-green-700' 
              : 'bg-red-100 text-red-700'
          }`}>
            {meal.availability || 'Available'}
          </span>
        </div>
        
        {showActions && (
          <div className="mt-4 flex gap-2">
            {onEdit && (
              <button
                onClick={() => onEdit(meal)}
                className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Edit
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(meal)}
                className="flex-1 rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 transition-colors"
              >
                Delete
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default MealCard
