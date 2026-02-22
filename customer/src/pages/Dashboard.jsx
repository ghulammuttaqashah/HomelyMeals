import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { getAllCooks } from '../api/meals'
import { useAuth } from '../context/AuthContext'
import Header from '../components/Header'
import Footer from '../components/Footer'
import Container from '../components/Container'
import CookCard from '../components/CookCard'
import Loader, { SkeletonCard } from '../components/Loader'

// Custom debounce hook
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => clearTimeout(timer)
  }, [value, delay])

  return debouncedValue
}

const Dashboard = () => {
  const navigate = useNavigate()
  const { isAuthenticated, customer } = useAuth()
  const [cooks, setCooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchInput, setSearchInput] = useState('')
  const [customerCity, setCustomerCity] = useState(null)
  const [serviceAvailable, setServiceAvailable] = useState(true)

  // Debounce search input - waits 400ms after user stops typing
  const debouncedSearch = useDebounce(searchInput, 400)

  // Get selected address from customer's addresses (default or first)
  const selectedAddress = customer?.addresses?.find(a => a.isDefault) || customer?.addresses?.[0]

  useEffect(() => {
    fetchCooks()
  }, [debouncedSearch, selectedAddress?._id])

  const fetchCooks = async () => {
    try {
      setLoading(true)
      const response = await getAllCooks(debouncedSearch.trim())
      setCooks(response.cooks || [])
      setCustomerCity(response.customerCity || null)
      setServiceAvailable(response.serviceAvailable !== false)
    } catch (error) {
      toast.error('Unable to load available cooks. Please try again.')
      console.error('Fetch cooks error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleClearSearch = () => {
    setSearchInput('')
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Header onAddressChange={fetchCooks} />
      
      <main className="flex-1">
        <Container className="py-8">
          {/* Location Banner - Only show if logged in and has city */}
          {isAuthenticated && customerCity && (
            <div className="mb-6 flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 px-4 py-3">
              <svg className="h-5 w-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-sm text-gray-700">
                Showing cooks in <span className="font-semibold text-orange-600">{customerCity}</span>
              </span>
            </div>
          )}

          {/* Search Section */}
          <div className="mb-8 rounded-xl bg-white p-6 shadow-sm border border-gray-200">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Search for Meals</h2>
            <div className="relative">
              <input
                type="text"
                placeholder="Search by meal name (e.g., Biryani, Karahi, Pizza...)"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 pl-10 pr-10 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-colors"
              />
              <svg
                className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              {searchInput && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            {debouncedSearch && (
              <p className="mt-3 text-sm text-gray-600">
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader size="sm" />
                    Searching for "<span className="font-medium text-orange-600">{debouncedSearch}</span>"...
                  </span>
                ) : (
                  <>Showing cooks with meals matching "<span className="font-medium text-orange-600">{debouncedSearch}</span>"</>
                )}
              </p>
            )}
          </div>

          {/* Cooks Grid */}
          {loading ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="h-7 w-40 bg-gray-200 rounded animate-pulse" />
                <div className="h-5 w-24 bg-gray-200 rounded animate-pulse" />
              </div>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {[...Array(8)].map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            </div>
          ) : cooks.length > 0 ? (
            <>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">
                  {debouncedSearch ? 'Matching Cooks' : 'Available Cooks'}
                </h2>
                <p className="text-sm text-gray-600">{cooks.length} cooks found</p>
              </div>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {cooks.map((cook) => (
                  <CookCard key={cook.cookId} cook={cook} />
                ))}
              </div>
            </>
          ) : debouncedSearch ? (
            // No results for search query
            <div className="rounded-xl bg-white p-12 text-center shadow-sm border border-gray-200">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-orange-100">
                <svg className="h-10 w-10 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900">No Results Found</h3>
              <p className="mt-2 text-gray-600">
                No cooks have meals matching "<span className="font-semibold text-orange-600">{debouncedSearch}</span>"
              </p>
              <p className="mt-1 text-sm text-gray-500">
                Try searching for something else like "Biryani", "Karahi", or "Pizza"
              </p>
              <button
                onClick={handleClearSearch}
                className="mt-6 inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 transition-colors"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Clear Search
              </button>
            </div>
          ) : !serviceAvailable && customerCity ? (
            // Service not available in customer's city
            <div className="rounded-xl bg-white p-12 text-center shadow-sm border border-gray-200">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
                <svg className="h-10 w-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900">Not Available in Your Area</h3>
              <p className="mt-2 text-gray-600">
                Sorry, we don't have any home cooks available in <span className="font-semibold text-orange-600">{customerCity}</span> yet.
              </p>
              <p className="mt-1 text-sm text-gray-500">
                We're expanding! Check back soon or try a different address.
              </p>
              {customer?.addresses?.length > 1 && (
                <p className="mt-4 text-sm text-gray-600">
                  You can try selecting a different address from the header dropdown.
                </p>
              )}
              <button
                onClick={() => navigate('/profile')}
                className="mt-6 inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Manage Addresses
              </button>
            </div>
          ) : (
            // No cooks available at all
            <div className="rounded-xl bg-white p-12 text-center shadow-sm border border-gray-200">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gray-100">
                <svg className="h-10 w-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900">No Cooks Available</h3>
              <p className="mt-2 text-gray-600">
                No cooks are currently available. Please check back later.
              </p>
            </div>
          )}
        </Container>
      </main>

      <Footer />
    </div>
  )
}

export default Dashboard
