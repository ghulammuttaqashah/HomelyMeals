import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import toast from 'react-hot-toast'
import Header from '../components/Header'
import Footer from '../components/Footer'
import Container from '../components/Container'
import FormInput from '../components/FormInput'
import Loader, { Skeleton } from '../components/Loader'
import ConfirmationModal from '../components/ConfirmationModal'
import { useAuth } from '../context/AuthContext'
import {
  updateProfile,
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  getCurrentCustomer,
} from '../api/auth'

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

const Profile = () => {
  const navigate = useNavigate()
  const { customer, refreshCustomer } = useAuth()
  const [loading, setLoading] = useState(true)
  const [profileData, setProfileData] = useState({ name: '', contact: '' })
  const [addresses, setAddresses] = useState([])
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)

  // Address modal state
  const [showAddressModal, setShowAddressModal] = useState(false)
  const [editingAddress, setEditingAddress] = useState(null)
  const [addressForm, setAddressForm] = useState({
    label: '',
    houseNo: '',
    street: '',
    city: '',
    postalCode: '',
    landmark: '',
    latitude: null,
    longitude: null,
  })
  const [mapPosition, setMapPosition] = useState(null)
  const [savingAddress, setSavingAddress] = useState(false)
  const [gettingLocation, setGettingLocation] = useState(false)
  const [deletingAddressId, setDeletingAddressId] = useState(null)

  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [showSearchResults, setShowSearchResults] = useState(false)

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { },
    type: 'warning'
  })

  // Close confirmation state
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)

  // Default map center (Lahore, Pakistan)
  const defaultCenter = [31.5204, 74.3587]

  useEffect(() => {
    fetchCustomerData()
  }, [])

  const fetchCustomerData = async () => {
    try {
      const { customer: data } = await getCurrentCustomer()
      setProfileData({ name: data.name || '', contact: data.contact || '' })
      setAddresses(data.addresses || [])
    } catch (error) {
      toast.error('Unable to load your profile. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Reverse geocode using Nominatim
  const reverseGeocode = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`
      )
      const data = await response.json()
      if (data && data.address) {
        const addr = data.address
        setAddressForm((prev) => ({
          ...prev,
          street: addr.road || addr.street || addr.suburb || '',
          city: addr.city || addr.town || addr.village || addr.county || '',
          postalCode: addr.postcode || '',
          latitude: lat,
          longitude: lng,
        }))
      }
    } catch (error) {
      console.error('Reverse geocode error:', error)
      // Still set coordinates even if geocoding fails
      setAddressForm((prev) => ({
        ...prev,
        latitude: lat,
        longitude: lng,
      }))
    }
  }

  // Search for places using Nominatim
  const searchPlaces = async (query) => {
    if (!query || query.trim().length < 3) {
      setSearchResults([])
      setShowSearchResults(false)
      return
    }

    setIsSearching(true)
    try {
      // Request with addressdetails=1 to get structured address data
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1&extratags=1`
      )
      const data = await response.json()
      console.log('Search results:', data) // Debug log
      setSearchResults(data || [])
      setShowSearchResults(true)
    } catch (error) {
      console.error('Search error:', error)
      setSearchResults([])
      toast.error('Search failed. Please try again.')
    } finally {
      setIsSearching(false)
    }
  }

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        searchPlaces(searchQuery)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Handle selecting a search result
  const handleSelectPlace = (place) => {
    const lat = parseFloat(place.lat)
    const lon = parseFloat(place.lon)
    
    console.log('Selected place:', place) // Debug log
    
    // Extract address components with better fallbacks
    const addr = place.address || {}
    const displayParts = place.display_name ? place.display_name.split(',').map(p => p.trim()) : []
    
    // Try to get street/road name
    let street = addr.road || addr.street || addr.pedestrian || addr.footway || addr.path || ''
    
    // If no street found, use the first part of display name (usually the place name)
    if (!street && displayParts.length > 0) {
      street = displayParts[0]
    }
    
    // Get city with multiple fallbacks
    const city = addr.city || addr.town || addr.village || addr.municipality || 
                 addr.county || addr.state_district || displayParts[displayParts.length - 3] || ''
    
    // Get postal code
    const postalCode = addr.postcode || ''
    
    console.log('Extracted address:', { street, city, postalCode, lat, lon }) // Debug log
    
    setAddressForm((prev) => ({
      ...prev,
      street: street,
      city: city,
      postalCode: postalCode,
      latitude: lat,
      longitude: lon,
    }))
    
    setMapPosition([lat, lon])
    setSearchQuery('')
    setSearchResults([])
    setShowSearchResults(false)
    toast.success('✅ Location selected! Address fields auto-filled.')
  }

  // Forward geocode - search address and show on map
  const forwardGeocode = async () => {
    const searchQuery = [addressForm.houseNo, addressForm.street, addressForm.city, addressForm.postalCode]
      .filter(Boolean)
      .join(', ')

    if (!searchQuery.trim()) {
      toast.error('Please enter at least street and city before searching')
      return
    }

    if (!addressForm.street.trim() || !addressForm.city.trim()) {
      toast.error('Street and City are required to find location on map')
      return
    }

    toast.loading('Searching for address on map...', { id: 'geocode' })

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`
      )
      const data = await response.json()
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat)
        const lon = parseFloat(data[0].lon)
        setMapPosition([lat, lon])
        setAddressForm((prev) => ({
          ...prev,
          latitude: lat,
          longitude: lon,
        }))
        toast.success('✅ Address found! Location marked on map.', { id: 'geocode' })
      } else {
        setMapPosition(null)
        setAddressForm(prev => ({ ...prev, latitude: null, longitude: null }))
        toast.error('❌ Address not found. Please:\n1. Check spelling\n2. Click on map manually\n3. Or use "Use My Location"', { 
          id: 'geocode',
          duration: 1500 
        })
      }
    } catch (error) {
      console.error('Forward geocode error:', error)
      toast.error('Unable to search address. Please try again or click on map.', { id: 'geocode' })
    }
  }

  // When map position changes, reverse geocode
  useEffect(() => {
    if (mapPosition && showAddressModal) {
      reverseGeocode(mapPosition[0], mapPosition[1])
    }
  }, [mapPosition, showAddressModal])

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

  const handleProfileSave = async () => {
    if (!profileData.name.trim()) {
      toast.error('Name is required')
      return
    }

    setSavingProfile(true)
    try {
      await updateProfile(profileData)
      toast.success('Profile updated successfully')
      setIsEditingProfile(false)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Couldn\'t update your profile. Please try again.')
    } finally {
      setSavingProfile(false)
    }
  }

  const openAddAddressModal = () => {
    setEditingAddress(null)
    setAddressForm({
      label: '',
      houseNo: '',
      street: '',
      city: '',
      postalCode: '',
      landmark: '',
      latitude: null,
      longitude: null,
    })
    setMapPosition(null)
    setSearchQuery('')
    setSearchResults([])
    setShowSearchResults(false)
    setShowAddressModal(true)
  }

  const openEditAddressModal = (address) => {
    setEditingAddress(address)
    setAddressForm({
      label: address.label || '',
      houseNo: address.houseNo || '',
      street: address.street || '',
      city: address.city || '',
      postalCode: address.postalCode || '',
      landmark: address.landmark || '',
      latitude: address.latitude || null,
      longitude: address.longitude || null,
    })
    if (address.latitude && address.longitude) {
      setMapPosition([address.latitude, address.longitude])
    } else {
      setMapPosition(null)
    }
    setSearchQuery('')
    setSearchResults([])
    setShowSearchResults(false)
    setShowAddressModal(true)
  }

  const closeAddressModal = () => {
    setShowAddressModal(false)
    setEditingAddress(null)
    setAddressForm({
      label: '',
      houseNo: '',
      street: '',
      city: '',
      postalCode: '',
      landmark: '',
      latitude: null,
      longitude: null,
    })
    setMapPosition(null)
    setSearchQuery('')
    setSearchResults([])
    setShowSearchResults(false)
  }

  const handleAddressSave = async () => {
    if (!addressForm.label.trim()) {
      toast.error('Label is required (e.g., Home, Office)')
      return
    }
    if (!addressForm.houseNo.trim()) {
      toast.error('House/Flat No. is required')
      return
    }
    if (!addressForm.street.trim()) {
      toast.error('Street is required')
      return
    }
    if (!addressForm.city.trim()) {
      toast.error('City is required')
      return
    }

    if (!addressForm.latitude || !addressForm.longitude) {
      toast.error('Please use "Find on Map" or "Use My Location" to verify this address.')
      return
    }

    setConfirmModal({
      isOpen: true,
      title: editingAddress ? 'Update Address?' : 'Add New Address?',
      message: `Are you sure you want to ${editingAddress ? 'update' : 'add'} this address? It will be used for delivery calculations.`,
      confirmText: editingAddress ? 'Update' : 'Add',
      onConfirm: async () => {
        setSavingAddress(true)
        try {
          if (editingAddress) {
            await updateAddress(editingAddress._id, addressForm)
            toast.success('Address updated successfully')
          } else {
            await addAddress(addressForm)
            toast.success('Address added successfully')
          }
          await fetchCustomerData()
          await refreshCustomer()
          closeAddressModal()
        } catch (error) {
          toast.error(error.response?.data?.message || 'Couldn\'t save address. Please try again.')
        } finally {
          setSavingAddress(false)
        }
      }
    })
  }

  const handleDeleteAddress = async (addressId) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Address?',
      message: 'Are you sure you want to delete this address? This action cannot be undone.',
      confirmText: 'Delete',
      type: 'danger',
      onConfirm: async () => {
        setDeletingAddressId(addressId)
        try {
          await deleteAddress(addressId)
          toast.success('Address deleted successfully')
          await fetchCustomerData()
          await refreshCustomer()
        } catch (error) {
          toast.error(error.response?.data?.message || 'Couldn\'t delete address. Please try again.')
        } finally {
          setDeletingAddressId(null)
        }
      }
    })
  }

  const handleSetDefault = async (addressId) => {
    try {
      await setDefaultAddress(addressId)
      toast.success('Default address updated')
      await fetchCustomerData()
      await refreshCustomer()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Couldn\'t set default address. Please try again.')
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-gray-50">
        <Header />
        <main className="flex-1 py-8">
          <Container>
            {/* Back Button Skeleton */}
            <div className="mb-6 h-5 w-32 bg-gray-200 rounded animate-pulse" />

            {/* Page Title Skeleton */}
            <div className="mb-8">
              <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-2" />
              <div className="h-4 w-72 bg-gray-200 rounded animate-pulse" />
            </div>

            <div className="grid gap-8 lg:grid-cols-2">
              {/* Profile Card Skeleton */}
              <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-200">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-10 w-10 rounded-lg bg-gray-200 animate-pulse" />
                  <div>
                    <div className="h-5 w-36 bg-gray-200 rounded animate-pulse mb-2" />
                    <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="h-12 bg-gray-200 rounded-lg animate-pulse" />
                  <div className="h-12 bg-gray-200 rounded-lg animate-pulse" />
                  <div className="h-12 bg-gray-200 rounded-lg animate-pulse" />
                </div>
              </div>

              {/* Addresses Card Skeleton */}
              <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-200">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-gray-200 animate-pulse" />
                    <div>
                      <div className="h-5 w-32 bg-gray-200 rounded animate-pulse mb-2" />
                      <div className="h-4 w-44 bg-gray-200 rounded animate-pulse" />
                    </div>
                  </div>
                  <div className="h-10 w-28 bg-gray-200 rounded-lg animate-pulse" />
                </div>
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="rounded-lg border border-gray-200 p-4">
                      <div className="flex justify-between items-start">
                        <div className="space-y-2">
                          <div className="h-5 w-24 bg-gray-200 rounded animate-pulse" />
                          <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
                          <div className="h-4 w-36 bg-gray-200 rounded animate-pulse" />
                        </div>
                        <div className="flex gap-2">
                          <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
                          <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Container>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Header />
      <main className="flex-1 py-8">
        <Container>
          {/* Back Button */}
          <button
            onClick={() => navigate('/dashboard')}
            className="mb-6 flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-orange-600 transition-colors"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Dashboard
          </button>

          <h1 className="mb-6 text-2xl font-bold text-gray-900">My Profile</h1>

          {/* Profile Section */}
          <div className="mb-6 rounded-xl bg-white p-6 shadow-sm border border-gray-100">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100">
                  <svg className="h-5 w-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Profile Information</h2>
              </div>
              {!isEditingProfile && (
                <button
                  onClick={() => setIsEditingProfile(true)}
                  className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit
                </button>
              )}
            </div>

            {isEditingProfile ? (
              <div className="space-y-4">
                <FormInput
                  label="Full Name"
                  value={profileData.name}
                  onChange={(e) => setProfileData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter your full name"
                />
                <FormInput
                  label="Contact Number"
                  value={profileData.contact}
                  onChange={(e) => setProfileData((prev) => ({ ...prev, contact: e.target.value }))}
                  placeholder="Enter your contact number"
                />
                <div className="flex gap-3">
                  <button
                    onClick={handleProfileSave}
                    disabled={savingProfile}
                    className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    {savingProfile && <Loader size="sm" className="text-white" />}
                    {savingProfile ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingProfile(false)
                      setProfileData({ name: customer?.name || '', contact: customer?.contact || '' })
                    }}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <span className="text-sm text-gray-500">Name:</span>
                  <p className="font-medium text-gray-900">{profileData.name || '-'}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Email:</span>
                  <p className="font-medium text-gray-900">{customer?.email}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Contact:</span>
                  <p className="font-medium text-gray-900">{profileData.contact || '-'}</p>
                </div>
              </div>
            )}
          </div>

          {/* Addresses Section */}
          <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                  <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">My Addresses</h2>
                  <p className="text-xs text-gray-500">{addresses.length} address{addresses.length !== 1 ? 'es' : ''} saved</p>
                </div>
              </div>
              <button
                onClick={openAddAddressModal}
                className="flex items-center gap-1.5 rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 transition-colors"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Address
              </button>
            </div>

            {addresses.length === 0 ? (
              <div className="py-12 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                  <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  </svg>
                </div>
                <h3 className="text-sm font-medium text-gray-900">No addresses yet</h3>
                <p className="mt-1 text-sm text-gray-500">Add your first delivery address to get started.</p>
                <button
                  onClick={openAddAddressModal}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Your First Address
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {addresses.map((address) => (
                  <div
                    key={address._id}
                    className={`rounded-xl border-2 p-4 transition-all ${address.isDefault ? 'border-orange-400 bg-orange-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-lg">
                            {address.label === 'Home' ? '🏠' : address.label === 'Work' ? '🏢' : '📍'}
                          </span>
                          <span className="font-semibold text-gray-900">{address.label}</span>
                          {address.isDefault && (
                            <span className="rounded-full bg-orange-500 px-2.5 py-0.5 text-xs font-medium text-white">
                              Default
                            </span>
                          )}
                        </div>
                        <p className="mt-1.5 text-sm text-gray-600">
                          {[address.houseNo, address.street, address.city, address.postalCode]
                            .filter(Boolean)
                            .join(', ')}
                        </p>
                        {address.latitude && address.longitude && (
                          <p className="mt-1 flex items-center gap-1 text-xs text-gray-400">
                            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            </svg>
                            GPS: {address.latitude.toFixed(4)}, {address.longitude.toFixed(4)}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
                        {!address.isDefault && (
                          <button
                            onClick={() => handleSetDefault(address._id)}
                            className="flex items-center gap-1 rounded-lg border border-orange-200 bg-orange-50 px-2.5 py-1.5 text-xs font-medium text-orange-600 hover:bg-orange-100 transition-colors"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Set Default
                          </button>
                        )}
                        <button
                          onClick={() => openEditAddressModal(address)}
                          className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteAddress(address._id)}
                          disabled={deletingAddressId === address._id}
                          className="flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          {deletingAddressId === address._id ? '...' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Container>
      </main>
      <Footer />

      {/* Address Modal */}
      {showAddressModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[92vh] w-full max-w-2xl flex flex-col rounded-2xl bg-white shadow-2xl">

            {/* Header */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-gray-900">
                  {editingAddress ? 'Edit Address' : 'Add New Address'}
                </h3>
                <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                  {editingAddress ? 'Update your saved address details' : 'Fill in your delivery address details'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCloseConfirm(true)}
                className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="overflow-y-auto flex-1 space-y-4 sm:space-y-5 p-4 sm:p-6">

              {/* Search Bar */}
              <div className="relative">
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">
                  Search for a Place or Landmark
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => searchResults.length > 0 && setShowSearchResults(true)}
                    placeholder="e.g., Sukkur IBA University, Jinnah Hospital..."
                    className="w-full rounded-xl border border-gray-300 bg-gray-50 px-3 sm:px-4 py-2 sm:py-2.5 pr-10 text-xs sm:text-sm focus:border-orange-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-200"
                  />
                  {isSearching ? (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <svg className="h-5 w-5 animate-spin text-orange-500" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    </div>
                  ) : (
                    <svg className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  )}
                </div>

                {/* Search Results Dropdown */}
                {showSearchResults && searchResults.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full rounded-xl border border-gray-200 bg-white shadow-xl max-h-48 sm:max-h-56 overflow-y-auto">
                    {searchResults.map((result, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleSelectPlace(result)}
                        className="w-full text-left px-3 sm:px-4 py-2.5 sm:py-3 hover:bg-orange-50 border-b border-gray-50 last:border-b-0 transition-colors"
                      >
                        <div className="flex items-start gap-2 sm:gap-3">
                          <svg className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                          </svg>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">
                              {result.display_name.split(',')[0]}
                            </p>
                            <p className="text-xs text-gray-400 truncate">
                              {result.display_name}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {showSearchResults && searchQuery && searchResults.length === 0 && !isSearching && (
                  <div className="absolute z-20 mt-1 w-full rounded-xl border border-gray-200 bg-white shadow-lg p-4 text-center">
                    <p className="text-sm text-gray-500">No results found. Try a different term.</p>
                  </div>
                )}
                <p className="mt-1.5 text-xs text-gray-400">Type 3+ characters to search universities, hospitals, landmarks</p>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 border-t border-gray-200" />
                <span className="text-xs text-gray-400 font-medium">OR SET ON MAP</span>
                <div className="flex-1 border-t border-gray-200" />
              </div>

              {/* Map */}
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                  <label className="text-xs sm:text-sm font-semibold text-gray-700">Pin Your Location</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={forwardGeocode}
                      className="flex items-center gap-1 sm:gap-1.5 rounded-lg border border-gray-300 bg-white px-2.5 sm:px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <span className="hidden sm:inline">Find by Address</span>
                      <span className="sm:hidden">Find</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleUseMyLocation}
                      disabled={gettingLocation}
                      className="flex items-center gap-1 sm:gap-1.5 rounded-lg bg-orange-600 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-700 disabled:opacity-50 transition-colors"
                    >
                      {gettingLocation ? (
                        <>
                          <svg className="h-3 w-3 sm:h-3.5 sm:w-3.5 animate-spin" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Detecting...
                        </>
                      ) : (
                        <>
                          <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                          </svg>
                          Use My Location
                        </>
                      )}
                    </button>
                  </div>
                </div>
                <div className={`overflow-hidden rounded-xl border-2 transition-colors ${mapPosition ? 'border-green-400' : 'border-gray-200'}`}>
                  <MapContainer
                    center={mapPosition || defaultCenter}
                    zoom={mapPosition ? 15 : 12}
                    style={{ height: '180px', width: '100%' }}
                    className="sm:!h-[220px]"
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <LocationMarker position={mapPosition} setPosition={setMapPosition} />
                    <RecenterMap position={mapPosition} />
                  </MapContainer>
                </div>
                {mapPosition ? (
                  <p className="mt-1.5 text-xs text-green-600 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block"></span>
                    Location pinned · {mapPosition[0].toFixed(5)}, {mapPosition[1].toFixed(5)}
                  </p>
                ) : (
                  <p className="mt-1.5 text-xs text-gray-400">Click on the map to pin your location</p>
                )}
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 border-t border-gray-200" />
                <span className="text-xs text-gray-400 font-medium">ADDRESS DETAILS</span>
                <div className="flex-1 border-t border-gray-200" />
              </div>

              {/* Address Label */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">
                  Address Label <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {['Home', 'Work', 'Other'].map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setAddressForm(prev => ({ ...prev, label: opt === 'Other' ? '' : opt }))}
                      className={`flex items-center justify-center gap-1.5 sm:gap-2 py-2 sm:py-2.5 rounded-xl border-2 text-xs sm:text-sm font-medium transition-all ${
                        (opt === 'Other' ? !['Home','Work'].includes(addressForm.label) : addressForm.label === opt)
                          ? 'border-orange-500 bg-orange-50 text-orange-700'
                          : 'border-gray-200 text-gray-600 hover:border-orange-300'
                      }`}
                    >
                      {opt === 'Home' && (
                        <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                        </svg>
                      )}
                      {opt === 'Work' && (
                        <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clipRule="evenodd" />
                        </svg>
                      )}
                      {opt === 'Other' && (
                        <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                        </svg>
                      )}
                      {opt}
                    </button>
                  ))}
                </div>
                {!['Home', 'Work'].includes(addressForm.label) && (
                  <input
                    type="text"
                    value={addressForm.label}
                    onChange={(e) => setAddressForm(prev => ({ ...prev, label: e.target.value }))}
                    placeholder="Custom label (e.g., Mom's House, Office)"
                    className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-2.5 text-sm focus:border-orange-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-200"
                  />
                )}
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <FormInput
                  label="House/Flat No. *"
                  value={addressForm.houseNo}
                  onChange={(e) => setAddressForm(prev => ({ ...prev, houseNo: e.target.value }))}
                  placeholder="e.g., 123, Flat 4B"
                  required
                />
                <FormInput
                  label="Street *"
                  value={addressForm.street}
                  onChange={(e) => setAddressForm(prev => ({ ...prev, street: e.target.value }))}
                  placeholder="Street name"
                  required
                />
              </div>
              <FormInput
                label="Landmark / Nearby Place (Optional)"
                value={addressForm.landmark}
                onChange={(e) => setAddressForm(prev => ({ ...prev, landmark: e.target.value }))}
                placeholder="e.g., Near City Mall, Behind Jinnah Hospital"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <FormInput
                  label="City *"
                  value={addressForm.city}
                  onChange={(e) => setAddressForm(prev => ({ ...prev, city: e.target.value }))}
                  placeholder="City"
                  required
                />
                <FormInput
                  label="Postal Code"
                  value={addressForm.postalCode}
                  onChange={(e) => setAddressForm(prev => ({ ...prev, postalCode: e.target.value }))}
                  placeholder="Postal code"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-2 sm:gap-3 px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
              <button
                type="button"
                onClick={() => setShowCloseConfirm(true)}
                className="flex-1 rounded-xl border border-gray-300 bg-white px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddressSave}
                disabled={savingAddress}
                className="flex-1 rounded-xl bg-orange-600 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-50 transition-colors"
              >
                {savingAddress ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader size="sm" className="text-white" />
                    Saving...
                  </span>
                ) : editingAddress ? 'Update Address' : 'Add Address'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Close Confirmation Modal */}
      {showCloseConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl p-4 sm:p-6">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-amber-100 mx-auto mb-3 sm:mb-4">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-sm sm:text-base font-bold text-gray-900 text-center mb-1">
              {editingAddress ? 'Discard Changes?' : "Don't Want to Add New Address?"}
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 text-center mb-4 sm:mb-5">
              {editingAddress
                ? 'Your edits will be lost. Your existing address will remain unchanged.'
                : 'You can add this address later from your profile page.'}
            </p>
            <div className="flex gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => setShowCloseConfirm(false)}
                className="flex-1 rounded-xl border border-gray-300 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Keep Editing
              </button>
              <button
                type="button"
                onClick={() => { setShowCloseConfirm(false); closeAddressModal(); }}
                className="flex-1 rounded-xl bg-red-500 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-white hover:bg-red-600 transition-colors"
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        type={confirmModal.type}
      />
    </div>
  )
}

export default Profile
