import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import Loader from '../components/Loader'
import Header from '../components/Header'
import Footer from '../components/Footer'
import FormInput from '../components/FormInput'
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

const Signup = () => {
  const navigate = useNavigate()
  const { signupRequest } = useAuth()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    contact: '',
    password: '',
    houseNo: '',
    street: '',
    city: 'Sukkur',
    postalCode: '65200',
    landmark: '',
    maxDeliveryDistance: 5,
  })
  const [loading, setLoading] = useState(false)
  const [locationLoading, setLocationLoading] = useState(false)
  const [coordinates, setCoordinates] = useState({ lat: 27.7052, lng: 68.8574 })
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState({})

  // Default Sukkur coordinates
  const defaultCenter = [27.7052, 68.8574]

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
        setFormData((prev) => ({
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
    const searchQuery = [formData.houseNo, formData.street, formData.city, formData.postalCode]
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

  // When coordinates change (from map click), reverse geocode
  useEffect(() => {
    if (coordinates) {
      reverseGeocode(coordinates.lat, coordinates.lng)
    }
  }, [coordinates])

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }))
    }
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

  const validateForm = () => {
    const newErrors = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Invalid email format'
    }

    if (!formData.contact.trim()) {
      newErrors.contact = 'Contact number is required'
    } else if (!/^03\d{9}$/.test(formData.contact.replace(/\s/g, ''))) {
      newErrors.contact = 'Contact must be 11 digits starting with 03'
    }

    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters'
    }

    if (!formData.houseNo.trim()) {
      newErrors.houseNo = 'House number is required'
    }

    if (!formData.street.trim()) {
      newErrors.street = 'Street is required'
    }

    if (!formData.city.trim()) {
      newErrors.city = 'City is required'
    }

    const distance = Number(formData.maxDeliveryDistance)
    if (isNaN(distance) || distance < 1 || distance > 50) {
      newErrors.maxDeliveryDistance = 'Distance must be between 1 and 50 km'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    
    if (!validateForm()) {
      toast.error('Please fix the errors in the form')
      return
    }

    setLoading(true)
    const loadingToast = toast(
      (t) => (
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900"></div>
          <span>Sending OTP to your email...</span>
          <button
            onClick={() => toast.dismiss(t.id)}
            className="ml-2 text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>
      ),
      { duration: Infinity }
    )
    
    try {
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        contact: formData.contact.trim(),
        password: formData.password,
        address: {
          houseNo: formData.houseNo.trim(),
          street: formData.street.trim(),
          city: formData.city,
          postalCode: formData.postalCode,
          landmark: formData.landmark.trim() || undefined,
        },
        maxDeliveryDistance: Number(formData.maxDeliveryDistance),
      }

      // Include coordinates if available
      if (coordinates) {
        payload.latitude = coordinates.lat
        payload.longitude = coordinates.lng
      }

      await signupRequest(payload)
      toast.dismiss(loadingToast)
      toast.success('OTP sent to your email')
      navigate('/verify-otp')
    } catch (error) {
      toast.dismiss(loadingToast)
      const message = error.response?.data?.message || 'Unable to sign up'
      toast.error(message)
      // Stay on signup page so user can try different email
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <Header />
      <div className="flex flex-1 items-center justify-center px-3 py-6 sm:px-4 sm:py-12">
        <div className="w-full max-w-3xl">
          <div className="rounded-2xl bg-white p-5 sm:p-8 shadow-xl border border-gray-100">
            <div className="mb-6 sm:mb-8 text-center">
              <div className="mx-auto mb-3 sm:mb-4 flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-orange-600 shadow-lg">
                <svg
                  className="h-6 w-6 sm:h-8 sm:w-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                  />
                </svg>
              </div>
              <h1 className="text-xl sm:text-3xl font-bold text-gray-900">Create Account</h1>
              <p className="mt-1.5 sm:mt-2 text-xs sm:text-base text-gray-600">Join HomelyMeals as a Cook</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Personal Information Section */}
              <div>
                <h3 className="mb-4 flex items-center gap-2 text-sm sm:text-base font-semibold text-gray-800">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-orange-600 text-xs font-bold text-white shadow-sm">1</span>
                  Personal Information
                </h3>
                <div className="grid gap-4 sm:gap-5 md:grid-cols-2">
                <FormInput
                  label="Full Name"
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  placeholder=""
                  error={errors.name}
                />

                <FormInput
                  label="Email Address"
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  error={errors.email}
                />
                </div>

                <div className="mt-4 sm:mt-5 grid gap-4 sm:gap-5 md:grid-cols-2">
                  <FormInput
                    label="Contact Number"
                    id="contact"
                    name="contact"
                    type="text"
                    required
                    value={formData.contact}
                    onChange={handleChange}
                    placeholder="03XXXXXXXXX"
                    error={errors.contact}
                  />

                  {/* Password Field */}
                  <div className="space-y-1">
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                      Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={formData.password}
                        onChange={handleChange}
                        className={`w-full rounded-lg border ${
                          errors.password ? 'border-red-500' : 'border-gray-300'
                        } bg-white px-4 py-2.5 sm:py-3 pr-12 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-sm`}
                        placeholder="Min. 6 characters"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? (
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        ) : (
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                    {errors.password && <p className="text-xs text-red-500">{errors.password}</p>}
                  </div>
                </div>
              </div>

              {/* Address Section */}
              <div className="border-t border-gray-200 pt-6">
                <h3 className="mb-3 flex items-center gap-2 text-sm sm:text-base font-semibold text-gray-800">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-orange-600 text-xs font-bold text-white shadow-sm">2</span>
                  Kitchen Address
                </h3>

                {/* Important Note - Prominent */}
                <div className="mb-5 rounded-xl bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 border-2 border-blue-200 p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-bold text-blue-900 mb-1.5">Important: Set Your Kitchen Location</h4>
                      <ul className="space-y-1 text-xs sm:text-sm text-blue-800">
                        <li className="flex items-start gap-2">
                          <svg className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span><strong>Use "Use My Location"</strong> button when you are at your kitchen/home for accurate GPS coordinates</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <svg className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>Not at your kitchen? You can <strong>skip location for now</strong> and update it later from your Profile</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <svg className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>Accurate location helps customers find you and calculate delivery charges</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <label className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                    <svg className="h-4 w-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Set Your Kitchen Location
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={forwardGeocode}
                      disabled={locationLoading}
                      className="flex items-center gap-1.5 rounded-lg border-2 border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      Find on Map
                    </button>
                    <button
                      type="button"
                      onClick={handleGetLocation}
                      disabled={locationLoading}
                      className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 px-4 py-2 text-xs font-bold text-white hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
                    >
                      {locationLoading ? (
                        <>
                          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Detecting...
                        </>
                      ) : (
                        <>
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          Use My Location (Recommended)
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Map Display - Clickable */}
                <div className={`mb-5 rounded-xl overflow-hidden border-2 transition-all shadow-md ${coordinates ? 'border-green-400 ring-2 ring-green-200' : 'border-gray-300'}`}>
                  <div className={`px-4 py-3 border-b flex items-center justify-between ${coordinates ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200' : 'bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200'}`}>
                    <div className="flex items-center gap-2">
                      {coordinates ? (
                        <>
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500 shadow-sm">
                            <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <span className="text-xs sm:text-sm font-bold text-green-800">Kitchen Location Set!</span>
                        </>
                      ) : (
                        <>
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-100">
                            <svg className="h-4 w-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                          </div>
                          <span className="text-xs sm:text-sm font-medium text-gray-700">Location Not Set (Optional)</span>
                        </>
                      )}
                    </div>
                    {!coordinates && (
                      <span className="text-xs text-gray-500 hidden sm:inline">Click map or use buttons</span>
                    )}
                  </div>
                  <MapContainer
                    center={coordinates ? [coordinates.lat, coordinates.lng] : [27.7052, 68.8574]}
                    zoom={coordinates ? 16 : 13}
                    style={{ height: '240px', width: '100%' }}
                    scrollWheelZoom={true}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <LocationMarker position={coordinates} setPosition={setCoordinates} />
                    <MapUpdater coordinates={coordinates} />
                  </MapContainer>
                  {coordinates ? (
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-4 py-3 border-t-2 border-green-200">
                      <div className="flex items-start gap-2">
                        <svg className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <div className="flex-1">
                          <p className="text-xs sm:text-sm text-green-800">
                            <span className="font-bold">GPS Coordinates:</span> {coordinates.lat.toFixed(6)}, {coordinates.lng.toFixed(6)}
                          </p>
                          {coordinates.lat === 27.7052 && coordinates.lng === 68.8574 && (
                            <p className="text-xs text-orange-700 mt-1.5 font-medium">
                              ⚠️ This is the default Sukkur location. For accurate delivery, please use "Use My Location" when at your kitchen, or update later from Profile.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-amber-50 px-4 py-3 border-t-2 border-amber-200">
                      <div className="flex items-start gap-2">
                        <svg className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <p className="text-xs sm:text-sm text-amber-800">
                          <span className="font-semibold">No location set.</span> You can add it later from your Profile page.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4 sm:space-y-5">
                  <div className="grid gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    <FormInput
                      label="House Number"
                      id="houseNo"
                      name="houseNo"
                      type="text"
                      required
                      value={formData.houseNo}
                      onChange={handleChange}
                      placeholder="e.g., 123, Flat 4B"
                      error={errors.houseNo}
                    />

                    <FormInput
                      label="Street"
                      id="street"
                      name="street"
                      type="text"
                      required
                      value={formData.street}
                      onChange={handleChange}
                      placeholder="Street name"
                      error={errors.street}
                    />

                    <FormInput
                      label="Landmark (Optional)"
                      id="landmark"
                      name="landmark"
                      type="text"
                      value={formData.landmark}
                      onChange={handleChange}
                      placeholder="e.g., Near City Mall"
                    />
                  </div>

                  <div className="grid gap-4 sm:gap-5 md:grid-cols-2">
                    <FormInput
                      label="City"
                      id="city"
                      name="city"
                      type="text"
                      required
                      value={formData.city}
                      onChange={handleChange}
                      error={errors.city}
                    />

                    <FormInput
                      label="Postal Code"
                      id="postalCode"
                      name="postalCode"
                      type="text"
                      required
                      value={formData.postalCode}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>

              {/* Delivery Settings Section */}
              <div className="border-t border-gray-200 pt-6">
                <div className="mb-5">
                  <h3 className="mb-2 text-sm sm:text-base font-semibold text-gray-800 flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-orange-600 text-xs font-bold text-white shadow-sm">3</span>
                    Delivery Settings
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600">
                    Set the maximum distance you can deliver food. Customers outside this range won&apos;t see your meals.
                  </p>
                </div>

                <div className="max-w-xs">
                  <label htmlFor="maxDeliveryDistance" className="block text-sm font-medium text-gray-700 mb-2">
                    Maximum Delivery Distance <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      id="maxDeliveryDistance"
                      name="maxDeliveryDistance"
                      min="1"
                      max="50"
                      value={formData.maxDeliveryDistance}
                      onChange={handleChange}
                      className={`w-full rounded-lg border ${
                        errors.maxDeliveryDistance ? 'border-red-500' : 'border-gray-300'
                      } bg-white px-4 py-2.5 sm:py-3 pr-12 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-sm`}
                      placeholder="Enter distance"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-500">km</span>
                  </div>
                  {errors.maxDeliveryDistance && (
                    <p className="mt-1.5 text-xs text-red-500">{errors.maxDeliveryDistance}</p>
                  )}
                  <p className="mt-1.5 text-xs sm:text-sm text-gray-600">Must be between 1 and 50 kilometers</p>
                </div>

                {/* Visual indicator of delivery range */}
                <div className="mt-4 sm:mt-5 rounded-xl bg-gradient-to-r from-orange-50 to-amber-50 p-4 border border-orange-200 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-orange-600 shadow-md">
                      <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-orange-900">
                        Delivery range: <span className="font-bold">{formData.maxDeliveryDistance} km</span>
                      </p>
                      <p className="text-xs sm:text-sm text-orange-700 mt-0.5">
                        Customers within this radius can order from you
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-gradient-to-r from-orange-600 to-orange-700 px-6 py-3.5 text-sm font-semibold text-white shadow-lg hover:from-orange-700 hover:to-orange-800 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 transition-all"
              >
                <span className="flex items-center justify-center gap-2">
                  {loading ? (
                    <>
                      <Loader size="sm" className="text-white" />
                      Sending OTP...
                    </>
                  ) : (
                    <>
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      Send OTP & Create Account
                    </>
                  )}
                </span>
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <Link to="/login" className="font-semibold text-orange-600 hover:text-orange-700 transition-colors">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}

export default Signup
