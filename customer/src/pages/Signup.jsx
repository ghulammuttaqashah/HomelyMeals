import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import Loader from '../components/Loader'
import Header from '../components/Header'
import Footer from '../components/Footer'
import FormInput from '../components/FormInput'

// Fix Leaflet default marker icon issue
import 'leaflet/dist/leaflet.css'
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
      setPosition([e.latlng.lat, e.latlng.lng])
    },
  })
  return position ? <Marker position={position} /> : null
}

// Component to recenter map
const RecenterMap = ({ position }) => {
  const map = useMap()
  useEffect(() => {
    if (position) {
      map.setView(position, 15)
    }
  }, [position, map])
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
    label: 'Home',
    houseNo: '',
    street: '',
    city: 'Sukkur',
    postalCode: '65200',
    latitude: null,
    longitude: null,
  })
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState({})
  const [mapPosition, setMapPosition] = useState(null)
  const [gettingLocation, setGettingLocation] = useState(false)

  // Default map center (Sukkur, Pakistan)
  const defaultCenter = [27.7052, 68.8574]

  // Reverse geocode using Nominatim
  const reverseGeocode = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`
      )
      const data = await response.json()
      if (data && data.address) {
        const addr = data.address
        setFormData((prev) => ({
          ...prev,
          street: addr.road || addr.street || addr.suburb || prev.street,
          city: addr.city || addr.town || addr.village || addr.county || prev.city,
          postalCode: addr.postcode || prev.postalCode,
          latitude: lat,
          longitude: lng,
        }))
      } else {
        setFormData((prev) => ({
          ...prev,
          latitude: lat,
          longitude: lng,
        }))
      }
    } catch (error) {
      console.error('Reverse geocode error:', error)
      setFormData((prev) => ({
        ...prev,
        latitude: lat,
        longitude: lng,
      }))
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

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`
      )
      const data = await response.json()
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat)
        const lon = parseFloat(data[0].lon)
        setMapPosition([lat, lon])
        setFormData((prev) => ({
          ...prev,
          latitude: lat,
          longitude: lon,
        }))
        toast.success('Location found on map!')
      } else {
        toast.error('Address not found. Try using "Use My Location" instead.')
      }
    } catch (error) {
      console.error('Forward geocode error:', error)
      toast.error('Unable to search address. Please try again.')
    }
  }

  // When map position changes, reverse geocode
  useEffect(() => {
    if (mapPosition) {
      reverseGeocode(mapPosition[0], mapPosition[1])
    }
  }, [mapPosition])

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser')
      return
    }

    setGettingLocation(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        setMapPosition([latitude, longitude])
        setGettingLocation(false)
        toast.success('Location detected!')
      },
      (error) => {
        setGettingLocation(false)
        switch (error.code) {
          case error.PERMISSION_DENIED:
            toast.error('Location permission denied')
            break
          case error.POSITION_UNAVAILABLE:
            toast.error('Location information unavailable')
            break
          case error.TIMEOUT:
            toast.error('Location request timed out')
            break
          default:
            toast.error('Unable to get your location. Please try again.')
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }))
    }
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

    if (!formData.street.trim()) {
      newErrors.street = 'Street is required'
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
    const loadingToast = toast.loading('Sending OTP to your email...', { duration: Infinity })

    try {
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        contact: formData.contact.trim(),
        password: formData.password,
        address: {
          label: formData.label,
          houseNo: formData.houseNo.trim() || undefined,
          street: formData.street.trim(),
          city: formData.city,
          postalCode: formData.postalCode,
          latitude: formData.latitude,
          longitude: formData.longitude,
        },
      }

      await signupRequest(payload)
      toast.dismiss(loadingToast)
      toast.success('OTP sent to your email')
      navigate('/verify-otp')
    } catch (error) {
      toast.dismiss(loadingToast)
      const message = error.response?.data?.message || 'Unable to sign up'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <Header showButtons={false} />
      <div className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-3xl">
          <div className="rounded-xl bg-white p-6 shadow-lg border border-gray-100">
            <div className="mb-6 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-orange-100">
                <svg
                  className="h-7 w-7 text-orange-600"
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
              <h1 className="text-2xl font-bold text-gray-900">Create Account</h1>
              <p className="mt-1 text-sm text-gray-500">Join HomelyMeals today</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Personal Information */}
              <div>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-100 text-xs text-orange-600">1</span>
                  Personal Information
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormInput
                    label="Full Name"
                    id="name"
                    name="name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Enter your full name"
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

                <div className="mt-4 grid gap-4 md:grid-cols-2">
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
                        className={`w-full rounded-lg border ${errors.password ? 'border-red-500' : 'border-gray-300'
                          } bg-white px-4 py-2.5 pr-12 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500`}
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
              <div className="border-t border-gray-100 pt-5">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-100 text-xs text-orange-600">2</span>
                  Delivery Address
                </h3>

                {/* Map Section */}
                <div className="mb-4">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <label className="text-sm font-medium text-gray-700">Select Location on Map</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={forwardGeocode}
                        className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        Find on Map
                      </button>
                      <button
                        type="button"
                        onClick={handleUseMyLocation}
                        disabled={gettingLocation}
                        className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                      >
                        {gettingLocation ? (
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
                            Use My Location
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="h-48 overflow-hidden rounded-lg border border-gray-300">
                    <MapContainer
                      center={mapPosition || defaultCenter}
                      zoom={mapPosition ? 15 : 12}
                      style={{ height: '100%', width: '100%' }}
                    >
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      <LocationMarker position={mapPosition} setPosition={setMapPosition} />
                      <RecenterMap position={mapPosition} />
                    </MapContainer>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Click on map to select location, or use buttons above
                  </p>
                </div>

                {/* Address Form Fields */}
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-1">
                      <label htmlFor="label" className="block text-sm font-medium text-gray-700">
                        Address Label
                      </label>
                      <select
                        id="label"
                        name="label"
                        value={['Home', 'Work', 'Other'].includes(formData.label) ? formData.label : 'Other'}
                        onChange={(e) => {
                          const val = e.target.value
                          if (val === 'Other') {
                            setFormData((prev) => ({ ...prev, label: '' }))
                          } else {
                            setFormData((prev) => ({ ...prev, label: val }))
                          }
                        }}
                        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      >
                        <option value="Home">🏠 Home</option>
                        <option value="Work">🏢 Work</option>
                        <option value="Other">📍 Other</option>
                      </select>
                      {!['Home', 'Work'].includes(formData.label) && (
                        <input
                          type="text"
                          name="customLabel"
                          value={formData.label === 'Other' ? '' : formData.label}
                          onChange={(e) => setFormData((prev) => ({ ...prev, label: e.target.value }))}
                          placeholder="Enter custom label (e.g., Office, Mom's House)"
                          className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      )}
                    </div>
                    <FormInput
                      label="House/Flat No."
                      id="houseNo"
                      name="houseNo"
                      type="text"
                      value={formData.houseNo}
                      onChange={handleChange}
                      placeholder="e.g., 123, Flat 4B"
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
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <FormInput
                      label="City"
                      id="city"
                      name="city"
                      type="text"
                      required
                      value={formData.city}
                      onChange={handleChange}
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

                  {/* Coordinates Display */}
                  {formData.latitude && formData.longitude && (
                    <div className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-xs text-green-700">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Location set: {formData.latitude.toFixed(4)}, {formData.longitude.toFixed(4)}
                    </div>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-orange-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
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

            <div className="mt-5 text-center">
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <Link to="/login" className="font-semibold text-orange-600 hover:text-orange-700">
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
