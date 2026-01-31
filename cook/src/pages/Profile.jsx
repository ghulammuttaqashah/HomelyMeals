import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { updateProfile } from '../api/auth'
import Header from '../components/Header'
import Footer from '../components/Footer'
import FormInput from '../components/FormInput'
import Loader from '../components/Loader'
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix for default marker icon in Leaflet with React
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

// Component to handle map click events
const LocationMarker = ({ position, setPosition }) => {
  useMapEvents({
    click(e) {
      setPosition({ lat: e.latlng.lat, lng: e.latlng.lng })
    },
  })
  return position ? <Marker position={[position.lat, position.lng]} /> : null
}

// Component to update map view when coordinates change
const MapUpdater = ({ coordinates }) => {
  const map = useMap()
  useEffect(() => {
    if (coordinates) {
      map.setView([coordinates.lat, coordinates.lng], 16)
    }
  }, [coordinates, map])
  return null
}

const Profile = () => {
  const navigate = useNavigate()
  const { cook, isAuthenticated, refreshCook } = useAuth()

  // Profile form state
  const [profileData, setProfileData] = useState({
    name: '',
    contact: '',
    houseNo: '',
    street: '',
    city: '',
    postalCode: '',
    maxDeliveryDistance: 5,
  })
  const [profileLoading, setProfileLoading] = useState(false)
  const [locationLoading, setLocationLoading] = useState(false)
  const [coordinates, setCoordinates] = useState(null)

  // Reverse geocode - get address from coordinates
  const reverseGeocode = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
        { headers: { 'Accept-Language': 'en' } }
      )
      const data = await response.json()
      if (data && data.address) {
        const addr = data.address
        setProfileData((prev) => ({
          ...prev,
          houseNo: addr.house_number || prev.houseNo,
          street: addr.road || addr.street || addr.neighbourhood || prev.street,
          city: addr.city || addr.town || addr.village || addr.county || prev.city,
          postalCode: addr.postcode || prev.postalCode,
        }))
      }
    } catch (error) {
      console.error('Reverse geocode error:', error)
    }
  }

  // Forward geocode - search address and show on map
  const forwardGeocode = async () => {
    const searchQuery = [profileData.houseNo, profileData.street, profileData.city, profileData.postalCode]
      .filter(Boolean)
      .join(', ')

    if (!searchQuery.trim()) {
      toast.error('Please enter an address first')
      return
    }

    setLocationLoading(true)
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`
      )
      const data = await response.json()
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat)
        const lon = parseFloat(data[0].lon)
        setCoordinates({ lat, lng: lon })
        toast.success('Location found on map!')
      } else {
        toast.error('Address not found. Try using "Use My Location" instead.')
      }
    } catch (error) {
      console.error('Forward geocode error:', error)
      toast.error('Failed to search address')
    } finally {
      setLocationLoading(false)
    }
  }

  // When coordinates change (from map click), reverse geocode - but not on initial load
  const isInitialMount = useRef(true)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }
    if (coordinates) {
      reverseGeocode(coordinates.lat, coordinates.lng)
    }
  }, [coordinates])

  // Populate form with cook data
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true })
      return
    }

    if (cook) {
      setProfileData({
        name: cook.name || '',
        contact: cook.contact || '',
        houseNo: cook.address?.houseNo || '',
        street: cook.address?.street || '',
        city: cook.address?.city || 'Sukkur',
        postalCode: cook.address?.postalCode || '65200',
        maxDeliveryDistance: cook.maxDeliveryDistance || 5,
      })
      
      // Set coordinates if cook has location (stored in address.location)
      if (cook.address?.location?.latitude && cook.address?.location?.longitude) {
        setCoordinates({
          lat: cook.address.location.latitude,
          lng: cook.address.location.longitude,
        })
      } else if (cook.location?.latitude && cook.location?.longitude) {
        // Fallback for backward compatibility
        setCoordinates({
          lat: cook.location.latitude,
          lng: cook.location.longitude,
        })
      }
    }
  }, [isAuthenticated, cook, navigate])

  const handleProfileChange = (e) => {
    const { name, value } = e.target
    setProfileData((prev) => ({ ...prev, [name]: value }))
  }

  // Get current location
  const handleGetLocation = async () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser')
      return
    }

    setLocationLoading(true)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        setCoordinates({ lat: latitude, lng: longitude })
        reverseGeocode(latitude, longitude)
        setLocationLoading(false)
        toast.success('Location detected!')
      },
      (error) => {
        setLocationLoading(false)
        switch (error.code) {
          case error.PERMISSION_DENIED:
            toast.error('Location permission denied. Please allow location access.')
            break
          case error.POSITION_UNAVAILABLE:
            toast.error('Location information is unavailable.')
            break
          case error.TIMEOUT:
            toast.error('Location request timed out.')
            break
          default:
            toast.error('An error occurred while getting location.')
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    )
  }

  const handleProfileSubmit = async (e) => {
    e.preventDefault()

    if (!profileData.name.trim()) {
      toast.error('Name is required')
      return
    }
    if (!profileData.contact.trim()) {
      toast.error('Contact is required')
      return
    }
    if (!profileData.street.trim()) {
      toast.error('Street is required')
      return
    }

    // Validate delivery distance
    const distance = Number(profileData.maxDeliveryDistance)
    if (isNaN(distance) || distance < 1 || distance > 50) {
      toast.error('Delivery distance must be between 1 and 50 km')
      return
    }

    setProfileLoading(true)
    try {
      const payload = {
        name: profileData.name,
        contact: profileData.contact,
        address: {
          houseNo: profileData.houseNo,
          street: profileData.street,
          city: profileData.city,
          postalCode: profileData.postalCode,
        },
        maxDeliveryDistance: distance,
      }

      // Include coordinates if available
      if (coordinates) {
        payload.latitude = coordinates.lat
        payload.longitude = coordinates.lng
      }

      await updateProfile(payload)
      toast.success('Profile updated successfully')

      // Refresh cook data in context
      if (refreshCook) {
        await refreshCook()
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to update profile'
      toast.error(message)
    } finally {
      setProfileLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Header showSignOut={true} />

      <main className="flex-1 py-6 sm:py-8 lg:py-12">
        <div className="mx-auto max-w-4xl px-3 sm:px-4 lg:px-6">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <button
              onClick={() => navigate('/dashboard')}
              className="mb-3 sm:mb-4 flex items-center text-xs sm:text-sm text-gray-600 hover:text-orange-600 transition-colors"
            >
              <svg className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Dashboard
            </button>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Profile Settings</h1>
            <p className="mt-1 text-xs sm:text-sm text-gray-600">Update your personal information</p>
          </div>

          <div className="space-y-6 sm:space-y-8">
            {/* Profile Information Card */}
            <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-200">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100">
                  <svg className="h-5 w-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Personal Information</h2>
                  <p className="text-sm text-gray-500">Update your name, contact, and address details</p>
                </div>
              </div>

              <form onSubmit={handleProfileSubmit} className="space-y-5">
                {/* Email (read-only) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={cook?.email || ''}
                    disabled
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-gray-500 cursor-not-allowed"
                  />
                  <p className="mt-1 text-xs text-gray-400">Email cannot be changed</p>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <FormInput
                    label="Full Name"
                    name="name"
                    type="text"
                    value={profileData.name}
                    onChange={handleProfileChange}
                    placeholder="Enter your name"
                    required
                  />
                  <FormInput
                    label="Contact Number"
                    name="contact"
                    type="tel"
                    value={profileData.contact}
                    onChange={handleProfileChange}
                    placeholder="Enter contact number"
                    required
                  />
                </div>

                {/* Address Section */}
                <div className="border-t border-gray-100 pt-5">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-700">Address Details</h3>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => forwardGeocode()}
                        disabled={locationLoading}
                        className="flex items-center gap-2 rounded-lg bg-green-50 px-4 py-2 text-sm font-medium text-green-600 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <span>Find on Map</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleGetLocation}
                        disabled={locationLoading}
                        className="flex items-center gap-2 rounded-lg bg-blue-50 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {locationLoading ? (
                          <>
                            <Loader size="sm" />
                            <span>Getting location...</span>
                          </>
                        ) : (
                          <>
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span>Use My Location</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mb-4 flex items-center gap-1">
                    <svg className="h-3.5 w-3.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Click on map or use buttons above to set your <strong>kitchen location</strong></span>
                  </p>

                  {/* Map Display - Always visible */}
                  <div className="mb-5 rounded-lg overflow-hidden border border-gray-200 shadow-sm">
                    <div className="bg-gray-100 px-3 py-2 border-b border-gray-200 flex items-center gap-2">
                      {coordinates ? (
                        <>
                          <svg className="h-4 w-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-xs font-medium text-gray-700">Your Kitchen Location (Click map to change)</span>
                        </>
                      ) : (
                        <>
                          <svg className="h-4 w-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span className="text-xs font-medium text-gray-700">Click on map to set your kitchen location</span>
                        </>
                      )}
                    </div>
                    <MapContainer
                      center={coordinates ? [coordinates.lat, coordinates.lng] : [27.7052, 68.8574]} // Default to Sukkur
                      zoom={coordinates ? 16 : 13}
                      style={{ height: '250px', width: '100%' }}
                      scrollWheelZoom={true}
                    >
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      <LocationMarker position={coordinates} setPosition={setCoordinates} />
                      <MapUpdater coordinates={coordinates} />
                    </MapContainer>
                    {coordinates && (
                      <div className="bg-green-50 px-3 py-2 border-t border-gray-200">
                        <p className="text-xs text-green-700">
                          <span className="font-medium">Location set:</span> {coordinates.lat.toFixed(6)}, {coordinates.lng.toFixed(6)}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <FormInput
                      label="House/Flat No."
                      name="houseNo"
                      type="text"
                      value={profileData.houseNo}
                      onChange={handleProfileChange}
                      placeholder="e.g., House 123"
                    />
                    <FormInput
                      label="Street"
                      name="street"
                      type="text"
                      value={profileData.street}
                      onChange={handleProfileChange}
                      placeholder="Enter street name"
                      required
                    />
                    <FormInput
                      label="City"
                      name="city"
                      type="text"
                      value={profileData.city}
                      onChange={handleProfileChange}
                      placeholder="Enter city"
                    />
                    <FormInput
                      label="Postal Code"
                      name="postalCode"
                      type="text"
                      value={profileData.postalCode}
                      onChange={handleProfileChange}
                      placeholder="Enter postal code"
                    />
                  </div>
                </div>

                {/* Delivery Settings Section */}
                <div className="border-t border-gray-100 pt-5">
                  <div className="mb-4">
                    <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <svg className="h-4 w-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                      </svg>
                      Delivery Settings
                    </h3>
                    <p className="mt-1 text-xs text-gray-500">
                      Set the maximum distance you can deliver food. Customers outside this range won&apos;t be able to place orders.
                    </p>
                  </div>

                  <div className="max-w-xs">
                    <label htmlFor="maxDeliveryDistance" className="block text-sm font-medium text-gray-700 mb-1">
                      Maximum Delivery Distance
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        id="maxDeliveryDistance"
                        name="maxDeliveryDistance"
                        min="1"
                        max="50"
                        value={profileData.maxDeliveryDistance}
                        onChange={handleProfileChange}
                        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 pr-12 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                        placeholder="Enter distance"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-500">km</span>
                    </div>
                    <p className="mt-1 text-xs text-gray-400">Must be between 1 and 50 kilometers</p>
                  </div>

                  {/* Visual indicator of delivery range */}
                  <div className="mt-4 rounded-lg bg-orange-50 p-4 border border-orange-100">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100">
                        <svg className="h-5 w-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-orange-800">
                          Current delivery range: <span className="font-bold">{profileData.maxDeliveryDistance} km</span>
                        </p>
                        <p className="text-xs text-orange-600">
                          Customers within this radius can order from you
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={profileLoading}
                    className="flex items-center gap-2 rounded-lg bg-orange-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {profileLoading ? (
                      <>
                        <Loader size="sm" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Save Changes</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}

export default Profile
