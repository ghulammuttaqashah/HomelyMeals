import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import toast from 'react-hot-toast'
import Header from '../components/Header'
import Footer from '../components/Footer'
import Container from '../components/Container'
import FormInput from '../components/FormInput'
import Loader from '../components/Loader'
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
  const { customer } = useAuth()
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
    latitude: null,
    longitude: null,
  })
  const [mapPosition, setMapPosition] = useState(null)
  const [savingAddress, setSavingAddress] = useState(false)
  const [gettingLocation, setGettingLocation] = useState(false)
  const [deletingAddressId, setDeletingAddressId] = useState(null)

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
      toast.error('Failed to load profile data')
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

  // Forward geocode - search address and show on map
  const forwardGeocode = async () => {
    const searchQuery = [addressForm.houseNo, addressForm.street, addressForm.city, addressForm.postalCode]
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
        setAddressForm((prev) => ({
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
      toast.error('Failed to search address')
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
            toast.error('Failed to get location')
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
      toast.error(error.response?.data?.message || 'Failed to update profile')
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
      latitude: null,
      longitude: null,
    })
    setMapPosition(null)
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
      latitude: address.latitude || null,
      longitude: address.longitude || null,
    })
    if (address.latitude && address.longitude) {
      setMapPosition([address.latitude, address.longitude])
    } else {
      setMapPosition(null)
    }
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
      latitude: null,
      longitude: null,
    })
    setMapPosition(null)
  }

  const handleAddressSave = async () => {
    if (!addressForm.label.trim()) {
      toast.error('Label is required (e.g., Home, Office)')
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
      closeAddressModal()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save address')
    } finally {
      setSavingAddress(false)
    }
  }

  const handleDeleteAddress = async (addressId) => {
    if (!confirm('Are you sure you want to delete this address?')) return

    setDeletingAddressId(addressId)
    try {
      await deleteAddress(addressId)
      toast.success('Address deleted successfully')
      await fetchCustomerData()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete address')
    } finally {
      setDeletingAddressId(null)
    }
  }

  const handleSetDefault = async (addressId) => {
    try {
      await setDefaultAddress(addressId)
      toast.success('Default address updated')
      await fetchCustomerData()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to set default address')
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-gray-50">
        <Header />
        <main className="flex-1 flex items-center justify-center py-8">
          <div className="flex flex-col items-center gap-4">
            <Loader size="lg" />
            <p className="text-gray-600">Loading profile...</p>
          </div>
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
                    className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
                  >
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-xl">
            <div className="border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingAddress ? 'Edit Address' : 'Add New Address'}
              </h3>
            </div>

            <div className="space-y-4 p-6">
              {/* Map */}
              <div>
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
                <div className="h-64 overflow-hidden rounded-lg border border-gray-300">
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
                  Click on the map or use buttons above to set your delivery location
                </p>
              </div>

              {/* Address Form Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Address Label <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={['Home', 'Work', 'Other'].includes(addressForm.label) ? addressForm.label : 'Other'}
                    onChange={(e) => {
                      const val = e.target.value
                      if (val === 'Other') {
                        setAddressForm((prev) => ({ ...prev, label: '' }))
                      } else {
                        setAddressForm((prev) => ({ ...prev, label: val }))
                      }
                    }}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="Home">🏠 Home</option>
                    <option value="Work">🏢 Work</option>
                    <option value="Other">📍 Other</option>
                  </select>
                  {!['Home', 'Work'].includes(addressForm.label) && (
                    <input
                      type="text"
                      value={addressForm.label}
                      onChange={(e) => setAddressForm((prev) => ({ ...prev, label: e.target.value }))}
                      placeholder="Enter custom label (e.g., Office, Mom's House)"
                      className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  )}
                </div>
                <FormInput
                  label="House/Flat No."
                  value={addressForm.houseNo}
                  onChange={(e) => setAddressForm((prev) => ({ ...prev, houseNo: e.target.value }))}
                  placeholder="e.g., 123, Flat 4B"
                />
              </div>
              <FormInput
                label="Street"
                value={addressForm.street}
                onChange={(e) => setAddressForm((prev) => ({ ...prev, street: e.target.value }))}
                placeholder="Street name"
                required
              />
              <div className="grid grid-cols-2 gap-4">
                <FormInput
                  label="City"
                  value={addressForm.city}
                  onChange={(e) => setAddressForm((prev) => ({ ...prev, city: e.target.value }))}
                  placeholder="City"
                  required
                />
                <FormInput
                  label="Postal Code"
                  value={addressForm.postalCode}
                  onChange={(e) => setAddressForm((prev) => ({ ...prev, postalCode: e.target.value }))}
                  placeholder="Postal code"
                />
              </div>

              {/* Coordinates Display */}
              {addressForm.latitude && addressForm.longitude && (
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">
                    Selected Coordinates: {addressForm.latitude.toFixed(6)}, {addressForm.longitude.toFixed(6)}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4">
              <button
                onClick={closeAddressModal}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddressSave}
                disabled={savingAddress}
                className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
              >
                {savingAddress ? 'Saving...' : editingAddress ? 'Update Address' : 'Add Address'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Profile
