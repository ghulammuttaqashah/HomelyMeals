import { useState } from 'react'
import toast from 'react-hot-toast'
import Card from './Card'
import { checkDeliveryEligibility } from '../api/meals'

const MealCard = ({ meal }) => {
  const [isChecking, setIsChecking] = useState(false)
  const [deliveryStatus, setDeliveryStatus] = useState(null)

  const handleOrderNow = async () => {
    // Check if geolocation is available
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser')
      return
    }

    setIsChecking(true)
    setDeliveryStatus(null)

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords

        try {
          const response = await checkDeliveryEligibility(meal.id, {
            latitude,
            longitude,
          })

          if (response.eligible) {
            setDeliveryStatus({
              type: 'success',
              message: response.message,
              distance: response.distance,
            })
            toast.success(`Order confirmed! Distance: ${response.distance} km`)
            // Here you would typically proceed with the order
          }
        } catch (error) {
          const errorMessage = error.response?.data?.message || 'Failed to check delivery availability'
          const errorData = error.response?.data
          
          setDeliveryStatus({
            type: 'error',
            message: errorMessage,
            distance: errorData?.distance,
            maxAllowed: errorData?.maxAllowed,
          })
          
          toast.error(errorMessage)
        } finally {
          setIsChecking(false)
        }
      },
      (error) => {
        setIsChecking(false)
        switch (error.code) {
          case error.PERMISSION_DENIED:
            toast.error('Location permission denied. Please allow location access to order.')
            break
          case error.POSITION_UNAVAILABLE:
            toast.error('Location information is unavailable.')
            break
          case error.TIMEOUT:
            toast.error('Location request timed out.')
            break
          default:
            toast.error('An error occurred while getting your location.')
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    )
  }

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

        {/* Delivery Range Info */}
        {meal.maxDeliveryDistance && (
          <div className="mt-1 flex items-center gap-1.5 text-xs text-gray-500">
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>Delivers within {meal.maxDeliveryDistance} km</span>
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

        {/* Delivery Status Message */}
        {deliveryStatus && (
          <div className={`mt-3 rounded-lg p-3 text-sm ${
            deliveryStatus.type === 'success' 
              ? 'bg-green-50 text-green-700 border border-green-200' 
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            <div className="flex items-start gap-2">
              {deliveryStatus.type === 'success' ? (
                <svg className="h-5 w-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="h-5 w-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              <div>
                <p className="font-medium">{deliveryStatus.message}</p>
                {deliveryStatus.distance && deliveryStatus.type === 'error' && (
                  <p className="mt-1 text-xs opacity-80">
                    Your distance: {deliveryStatus.distance} km | Max allowed: {deliveryStatus.maxAllowed} km
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
        
        <div className="mt-4">
          <button 
            onClick={handleOrderNow}
            disabled={isChecking}
            className="w-full rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isChecking ? (
              <>
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Checking location...</span>
              </>
            ) : (
              'Order Now'
            )}
          </button>
        </div>
      </div>
    </Card>
  )
}

export default MealCard
