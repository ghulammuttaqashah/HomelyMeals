import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import ProtectedLayout from '../components/ProtectedLayout'
import BackButton from '../components/BackButton'
import Loader from '../components/Loader'
import {
  getDeliveryCharges,
  createDeliveryCharges,
  updateDeliveryCharges,
} from '../api/deliveryCharges'

const DeliveryChargesSettings = () => {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState(null)
  const [pricePerKm, setPricePerKm] = useState('')
  const [minimumCharge, setMinimumCharge] = useState('')
  const [maxDeliveryDistance, setMaxDeliveryDistance] = useState('')
  const [isActive, setIsActive] = useState(true)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const response = await getDeliveryCharges()
      if (response.settings) {
        setSettings(response.settings)
        setPricePerKm(response.settings.pricePerKm || '')
        setMinimumCharge(response.settings.minimumCharge || '')
        setMaxDeliveryDistance(response.settings.maxDeliveryDistance || '')
        setIsActive(response.settings.isActive ?? true)
      }
    } catch (error) {
      // Settings don't exist yet - that's okay
      console.log('No delivery charges configured yet')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!pricePerKm || parseFloat(pricePerKm) <= 0) {
      toast.error('Price per km is required and must be greater than 0')
      return
    }

    try {
      setSaving(true)

      const payload = {
        pricePerKm: parseFloat(pricePerKm),
        minimumCharge: parseFloat(minimumCharge) || 0,
        maxDeliveryDistance: maxDeliveryDistance ? parseFloat(maxDeliveryDistance) : null,
        isActive,
      }

      if (settings) {
        await updateDeliveryCharges(payload)
        toast.success('Delivery charges updated successfully')
      } else {
        await createDeliveryCharges(payload)
        toast.success('Delivery charges created successfully')
      }

      fetchSettings()
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to save delivery charges'
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  // Calculate example delivery fee
  const calculateExampleFee = (distance) => {
    const rate = parseFloat(pricePerKm) || 0
    const minCharge = parseFloat(minimumCharge) || 0
    const calculated = distance * rate
    return Math.max(calculated, minCharge).toFixed(0)
  }

  // Check if minimum charge is applied
  const isMinimumApplied = (distance) => {
    const rate = parseFloat(pricePerKm) || 0
    const minCharge = parseFloat(minimumCharge) || 0
    return distance * rate < minCharge
  }

  if (loading) {
    return (
      <ProtectedLayout title="Delivery Charges Settings">
        <div className="flex flex-col items-center justify-center py-32">
          <Loader size="lg" />
          <p className="mt-6 text-base font-medium text-gray-600">Loading settings...</p>
        </div>
      </ProtectedLayout>
    )
  }

  return (
    <ProtectedLayout title="Delivery Charges Settings">
      <BackButton to="/dashboard" label="Back to Dashboard" />

      <div className="mt-6 space-y-6">
        {/* Status Card */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Delivery Charges Status</h2>
              <p className="mt-1 text-sm text-gray-600">
                {settings ? 'Delivery charges are configured' : 'No delivery charges configured yet'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-sm font-medium ${isActive ? 'text-green-600' : 'text-red-600'}`}>
                {isActive ? 'Active' : 'Inactive'}
              </span>
              <button
                onClick={() => setIsActive(!isActive)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${
                  isActive ? 'bg-green-500' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    isActive ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Pricing Settings */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-6 text-lg font-semibold text-gray-900">Pricing Settings</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {/* Price per km */}
            <div>
              <label htmlFor="pricePerKm" className="mb-1 block text-sm font-medium text-gray-700">
                Price per km (Rs) <span className="text-red-500">*</span>
              </label>
              <p className="mb-2 text-xs text-gray-500">Charge per kilometer of delivery</p>
              <input
                type="number"
                id="pricePerKm"
                value={pricePerKm}
                onChange={(e) => setPricePerKm(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="e.g., 10"
                min="0"
                step="0.5"
              />
            </div>

            {/* Minimum Charge */}
            <div>
              <label htmlFor="minimumCharge" className="mb-1 block text-sm font-medium text-gray-700">
                Minimum Charge (Rs)
              </label>
              <p className="mb-2 text-xs text-gray-500">Minimum delivery fee for short distances</p>
              <input
                type="number"
                id="minimumCharge"
                value={minimumCharge}
                onChange={(e) => setMinimumCharge(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="e.g., 30"
                min="0"
              />
            </div>

            {/* Max Distance */}
            <div>
              <label htmlFor="maxDistance" className="mb-1 block text-sm font-medium text-gray-700">
                Max Delivery Distance (km)
              </label>
              <p className="mb-2 text-xs text-gray-500">Leave empty for no limit</p>
              <input
                type="number"
                id="maxDistance"
                value={maxDeliveryDistance}
                onChange={(e) => setMaxDeliveryDistance(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="e.g., 15"
                min="0"
              />
            </div>
          </div>
        </div>

        {/* How it Works */}
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">How It Works</h2>
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-orange-600">
                1
              </div>
              <p>
                <strong>Calculate:</strong> Distance × Price per km = Delivery Fee
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-orange-600">
                2
              </div>
              <p>
                <strong>Apply Minimum:</strong> If calculated fee is less than minimum charge, use minimum charge instead
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-orange-600">
                3
              </div>
              <p>
                <strong>Check Distance:</strong> If max distance is set, reject orders beyond that limit
              </p>
            </div>
          </div>
        </div>

        {/* Preview Calculator */}
        {pricePerKm && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-6">
            <h2 className="mb-4 text-lg font-semibold text-blue-900">Preview Calculator</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[1, 3, 5, 10].map((distance) => (
                <div key={distance} className="rounded-lg bg-white p-4 text-center shadow-sm">
                  <p className="text-sm text-gray-600">{distance} km delivery</p>
                  <p className="mt-1 text-2xl font-bold text-blue-600">Rs {calculateExampleFee(distance)}</p>
                  {isMinimumApplied(distance) && (
                    <p className="mt-1 text-xs text-orange-600">Minimum applied</p>
                  )}
                </div>
              ))}
            </div>
            <p className="mt-4 text-center text-xs text-gray-500">
              Formula: {pricePerKm} Rs/km × distance = fee (min: {minimumCharge || 0} Rs)
            </p>
          </div>
        )}

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-orange-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? (
              <>
                <Loader size="sm" className="text-white" />
                Saving...
              </>
            ) : (
              <>
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {settings ? 'Save Changes' : 'Create Delivery Charges'}
              </>
            )}
          </button>
        </div>
      </div>
    </ProtectedLayout>
  )
}

export default DeliveryChargesSettings
