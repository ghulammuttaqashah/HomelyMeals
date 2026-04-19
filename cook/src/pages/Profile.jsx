import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { updateProfile } from '../api/auth'
import { uploadToCloudinary } from '../utils/cloudinary'
import Header from '../components/Header'
import Footer from '../components/Footer'
import FormInput from '../components/FormInput'
import Loader from '../components/Loader'
import { FiArrowLeft } from 'react-icons/fi'
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
    landmark: '',
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
      toast.error('Unable to search address. Please try again.')
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
      setProfileData((prev) => {
        // Only update profilePicture if it hasn't been changed locally in this session
        // or if we are doing the initial load
        const shouldUpdatePicture = !prev.profilePicture || cook.profilePicture !== prev.profilePicture;

        return {
          ...prev,
          name: cook.name || '',
          contact: cook.contact || '',
          profilePicture: shouldUpdatePicture ? (cook.profilePicture || '') : prev.profilePicture,
          houseNo: cook.address?.houseNo || '',
          street: cook.address?.street || '',
          city: cook.address?.city || 'Sukkur',
          postalCode: cook.address?.postalCode || '65200',
          landmark: cook.address?.landmark || '',
          maxDeliveryDistance: cook.maxDeliveryDistance || 5,
        }
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
    if (!profileData.houseNo.trim()) {
      toast.error('House/Flat No. is required')
      return
    }
    if (!profileData.street.trim()) {
      toast.error('Street is required')
      return
    }
    if (!profileData.city.trim()) {
      toast.error('City is required')
      return
    }

    if (!coordinates) {
      toast.error('📍 GPS location is required! Please use "Use My Location" or click on the map to pin your kitchen location.', { duration: 5000 })
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
          landmark: profileData.landmark || '',
        },
        profilePicture: profileData.profilePicture,
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
      const message = error.response?.data?.message || 'Couldn\'t update your profile. Please try again.'
      toast.error(message)
    } finally {
      setProfileLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Header showSignOut={true} />

      <main className="flex-1 py-6 sm:py-8 lg:py-12">
        <div className="mx-auto max-w-6xl px-3 sm:px-4 lg:px-6">
          <div className="mb-6 sm:mb-8">
            <button
              onClick={() => navigate('/dashboard')}
              className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-orange-600 transition-colors"
            >
              <FiArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </button>

            <div>
              <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Profile Settings</h1>
              <p className="mt-1 text-sm text-gray-600 sm:text-base">
                Keep your details accurate so customers can discover and receive orders from your kitchen.
              </p>
            </div>
          </div>

          <form onSubmit={handleProfileSubmit} className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-3">
              {/* Left Column: Personal Info and Delivery Settings */}
              <div className="space-y-6 xl:col-span-2">
                <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
                  <h2 className="text-lg font-semibold text-gray-900 sm:text-xl">Personal Information</h2>
                  <p className="mt-1 text-sm text-gray-500 sm:text-base">Manage your basic profile and contact details.</p>

                  <div className="mt-5">
                    {/* Profile Picture Update Section - Simplified */}
                    <div className="mb-8 flex items-center gap-6 p-2">
                      <div className="relative">
                        <div className="h-24 w-24 overflow-hidden rounded-xl border-2 border-orange-100 bg-white shadow-sm sm:h-28 sm:w-28">
                          {profileData.profilePicture ? (
                            <img
                              src={profileData.profilePicture}
                              alt="Profile"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-orange-50 text-orange-600">
                              <svg className="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex-1 space-y-3">
                        <div>
                          <p className="text-base font-semibold text-gray-900">Profile Picture / Logo</p>
                          <p className="text-sm text-gray-500">This will be shown to your customers</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <label
                            htmlFor="profile-upload"
                            className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-orange-700 active:scale-95"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Change Photo
                            <input
                              id="profile-upload"
                              type="file"
                              className="hidden"
                              accept="image/*"
                              onChange={async (e) => {
                                const file = e.target.files[0]
                                if (!file) return
                                
                                const loadingToast = toast.loading('Uploading new profile picture...')
                                try {
                                  const url = await uploadToCloudinary(file)
                                  setProfileData(prev => ({ ...prev, profilePicture: url }))
                                  toast.success('Photo updated! Click "Save Changes" to apply.', { id: loadingToast })
                                } catch (err) {
                                  toast.error('Failed to upload image', { id: loadingToast })
                                }
                              }}
                            />
                          </label>
                          {profileData.profilePicture && (
                            <button
                              type="button"
                              onClick={() => setProfileData(prev => ({ ...prev, profilePicture: '' }))}
                              className="text-sm font-medium text-red-600 hover:text-red-700"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
                    <input
                      type="email"
                      value={cook?.email || ''}
                      disabled
                      className="w-full cursor-not-allowed rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-gray-500"
                    />
                    <p className="mt-1 text-sm text-gray-400">Email cannot be changed</p>
                  </div>

                  <div className="mt-5 grid gap-5 sm:grid-cols-2">
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
                </section>

                <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
                  <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900 sm:text-xl">
                    <svg className="h-5 w-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                    Delivery Settings
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Set your maximum delivery radius. Customers outside this range cannot place orders.
                  </p>

                  <div className="mt-6">
                    <label htmlFor="maxDeliveryDistance" className="mb-1 block text-sm font-medium text-gray-700">
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
                    <p className="mt-1 text-sm text-gray-400">Must be between 1 and 15 kilometers</p>
                  </div>

                  <div className="mt-4 rounded-lg border border-orange-100 bg-orange-50 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100">
                        <svg className="h-5 w-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-orange-800">
                          Current range: <span className="font-bold">{profileData.maxDeliveryDistance} km</span>
                        </p>
                        <p className="text-sm text-orange-600">Customers inside this radius can order from you.</p>
                      </div>
                    </div>
                  </div>

                  <div className="hidden xl:block mt-8 border-t border-gray-100 pt-6 text-right">
                    <p className="text-sm text-gray-500 sm:text-base mb-4">Save now to apply your profile and delivery updates.</p>
                    <button
                      type="submit"
                      disabled={profileLoading}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-orange-600 px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 shadow-sm"
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
                          <span>Save All Changes</span>
                        </>
                      )}
                    </button>
                  </div>
                </section>
              </div>

              {/* Right Column: Address, Location and Map */}
              <div className="space-y-6">
                <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
                  <h2 className="text-lg font-semibold text-gray-900 sm:text-xl">Address Details</h2>
                  <p className="mt-1 text-sm text-gray-500 sm:text-base">Kitchen location details used for delivery distance calculation.</p>

                  <div className="mt-5 space-y-4">
                    <FormInput
                      label="House/Flat No. *"
                      name="houseNo"
                      type="text"
                      value={profileData.houseNo}
                      onChange={handleProfileChange}
                      placeholder="e.g., House 123, Flat 4B"
                      required
                    />
                    <FormInput
                      label="Street *"
                      name="street"
                      type="text"
                      value={profileData.street}
                      onChange={handleProfileChange}
                      placeholder="Enter street name"
                      required
                    />
                    <FormInput
                      label="Landmark / Nearby Place (Optional)"
                      name="landmark"
                      type="text"
                      value={profileData.landmark}
                      onChange={handleProfileChange}
                      placeholder="e.g., Near City Mall, Behind Jinnah Hospital"
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormInput
                        label="City *"
                        name="city"
                        type="text"
                        value={profileData.city}
                        onChange={handleProfileChange}
                        placeholder="City"
                        required
                      />
                      <FormInput
                        label="Postal Code"
                        name="postalCode"
                        type="text"
                        value={profileData.postalCode}
                        onChange={handleProfileChange}
                        placeholder="Zip"
                      />
                    </div>
                  </div>

                  <div className="mt-6 space-y-4 border-t border-gray-100 pt-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-semibold text-gray-900">Map Location *</h3>
                      {!coordinates && (
                        <span className="text-xs text-red-500 font-medium">Required to save</span>
                      )}
                    </div>

                    {/* Best option highlight */}
                    <div className="rounded-lg border border-orange-200 bg-orange-50 p-3">
                      <p className="text-xs font-semibold text-orange-800 mb-1">⭐ Best Option</p>
                      <p className="text-xs text-orange-700">
                        Use <strong>"Use My Location"</strong> for the most accurate GPS coordinates. This ensures customers can find your kitchen and delivery distances are calculated correctly.
                      </p>
                    </div>

                    <div className="grid gap-2">
                      <button
                        type="button"
                        onClick={handleGetLocation}
                        disabled={locationLoading}
                        className="flex items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-700 disabled:opacity-50 shadow-sm"
                      >
                        {locationLoading ? (
                          <>
                            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            <span>Detecting Location...</span>
                          </>
                        ) : (
                          <>
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span>⭐ Use My Location (Recommended)</span>
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => forwardGeocode()}
                        disabled={locationLoading}
                        className="flex items-center justify-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 border border-gray-200"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <span>Find on Map by Address</span>
                      </button>
                      <p className="text-xs text-gray-500 text-center">Or click directly on the map to pin your location</p>
                    </div>

                    <div className={`overflow-hidden rounded-lg border-2 ${coordinates ? 'border-green-400' : 'border-red-300'}`}>
                      <MapContainer
                        center={coordinates ? [coordinates.lat, coordinates.lng] : [27.7052, 68.8574]}
                        zoom={coordinates ? 16 : 13}
                        style={{ height: '300px', width: '100%' }}
                        scrollWheelZoom={true}
                      >
                        <TileLayer
                          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <LocationMarker position={coordinates} setPosition={setCoordinates} />
                        <MapUpdater coordinates={coordinates} />
                      </MapContainer>
                    </div>
                    {coordinates ? (
                      <div className="rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-xs text-green-700 flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        GPS Pinned: {coordinates.lat.toFixed(6)}, {coordinates.lng.toFixed(6)}
                      </div>
                    ) : (
                      <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700 flex items-center gap-2">
                        <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                        No location pinned — required before saving
                      </div>
                    )}
                  </div>
                </section>
              </div>
            </div>

            {/* Mobile/Tablet Save Button - Placed at last */}
            <div className="xl:hidden rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6 text-center sm:text-right mt-6">
              <p className="text-sm text-gray-500 sm:text-base mb-4">Save now to apply your profile and delivery updates.</p>
              <button
                type="submit"
                disabled={profileLoading}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-orange-600 px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 shadow-sm"
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
                    <span>Save All Changes</span>
                  </>
                )}
              </button>
            </div>

          </form>
        </div>
      </main>

      <Footer />
    </div>
  )
}

export default Profile
