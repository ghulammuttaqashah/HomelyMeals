import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { getMealsByCookId } from '../api/meals'
import Header from '../components/Header'
import Footer from '../components/Footer'
import Container from '../components/Container'
import MealCard from '../components/MealCard'
import { SkeletonCard } from '../components/Loader'

const CookMeals = () => {
  const { cookId } = useParams()
  const navigate = useNavigate()
  const [cook, setCook] = useState(null)
  const [meals, setMeals] = useState([])
  const [filteredMeals, setFilteredMeals] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All Categories')
  const [sortBy, setSortBy] = useState('default')

  const categories = ['All Categories', 'Main Course', 'Beverages', 'Starter', 'Other']

  useEffect(() => {
    fetchCookMeals()
  }, [cookId])

  useEffect(() => {
    filterAndSortMeals()
  }, [meals, searchQuery, selectedCategory, sortBy])

  const fetchCookMeals = async () => {
    try {
      setLoading(true)
      const response = await getMealsByCookId(cookId)
      setCook(response.cook)
      const mealsData = response.meals.map(meal => ({
        id: meal.mealId,
        name: meal.name,
        price: meal.price,
        description: meal.description,
        image: meal.itemImage || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&h=300&fit=crop',
        category: meal.category,
        availability: meal.availability,
      }))
      setMeals(mealsData)
      setFilteredMeals(mealsData)
    } catch (error) {
      toast.error('Failed to load meals')
      console.error('Fetch cook meals error:', error)
      // Navigate back if cook not found
      if (error.response?.status === 404) {
        navigate('/dashboard', { replace: true })
      }
    } finally {
      setLoading(false)
    }
  }

  const filterAndSortMeals = () => {
    let result = [...meals]

    // Filter by search query
    if (searchQuery) {
      result = result.filter(meal =>
        meal.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        meal.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Filter by category
    if (selectedCategory !== 'All Categories') {
      result = result.filter(meal => 
        meal.category.toLowerCase() === selectedCategory.toLowerCase()
      )
    }

    // Sort meals
    if (sortBy === 'price-low') {
      result.sort((a, b) => a.price - b.price)
    } else if (sortBy === 'price-high') {
      result.sort((a, b) => b.price - a.price)
    } else if (sortBy === 'name') {
      result.sort((a, b) => a.name.localeCompare(b.name))
    }

    setFilteredMeals(result)
  }

  const handleBack = () => {
    navigate('/dashboard')
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-gray-50">
        <Header />
        <main className="flex-1">
          <Container className="py-8">
            {/* Back Button Skeleton */}
            <div className="mb-6">
              <div className="mb-4 h-5 w-28 bg-gray-200 rounded animate-pulse" />
              
              {/* Cook Info Skeleton */}
              <div className="rounded-lg bg-white p-6 shadow-sm border border-gray-200">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-gray-200 animate-pulse" />
                  <div className="space-y-2">
                    <div className="h-6 w-40 bg-gray-200 rounded animate-pulse" />
                    <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
                  </div>
                </div>
              </div>
            </div>

            {/* Filters Skeleton */}
            <div className="mb-6 rounded-lg bg-white p-4 shadow-sm border border-gray-200">
              <div className="flex flex-wrap gap-4">
                <div className="h-10 w-64 bg-gray-200 rounded-lg animate-pulse" />
                <div className="h-10 w-40 bg-gray-200 rounded-lg animate-pulse" />
                <div className="h-10 w-36 bg-gray-200 rounded-lg animate-pulse" />
              </div>
            </div>

            {/* Meals Grid Skeleton */}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {[...Array(8)].map((_, i) => (
                <SkeletonCard key={i} />
              ))}
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
      
      <main className="flex-1">
        <Container className="py-8">
          {/* Back Button & Cook Info */}
          <div className="mb-6">
            <button
              onClick={handleBack}
              className="mb-4 flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-orange-600 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Cooks
            </button>

            <div className="rounded-lg bg-white p-6 shadow-sm border border-gray-200">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-orange-100">
                  <svg 
                    className="h-8 w-8 text-orange-600" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" 
                    />
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{cook?.name}</h1>
                  <div className="mt-1 flex items-center gap-1.5 text-sm text-gray-600">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" 
                      />
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" 
                      />
                    </svg>
                    <span>{cook?.city}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Filter Section */}
          <div className="mb-8 rounded-lg bg-white p-6 shadow-sm border border-gray-200">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Filter Meals</h2>
            
            {/* Search Bar */}
            <div className="mb-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search meals by name or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 pl-10 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
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
              </div>
            </div>

            {/* Filters Row */}
            <div className="grid gap-4 md:grid-cols-2">
              {/* Category Filter */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Category</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sort By */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="default">Default</option>
                  <option value="price-low">Price (Low to High)</option>
                  <option value="price-high">Price (High to Low)</option>
                  <option value="name">Name (A-Z)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Meals Grid */}
          {filteredMeals.length > 0 ? (
            <>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Menu</h2>
                <p className="text-sm text-gray-600">{filteredMeals.length} meals available</p>
              </div>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {filteredMeals.map((meal) => (
                  <MealCard key={meal.id} meal={meal} />
                ))}
              </div>
            </>
          ) : (
            <div className="rounded-lg bg-white p-12 text-center shadow-sm border border-gray-200">
              <svg
                className="mx-auto h-16 w-16 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <h3 className="mt-4 text-lg font-semibold text-gray-900">No meals found</h3>
              <p className="mt-2 text-sm text-gray-600">
                {searchQuery || selectedCategory !== 'All Categories' 
                  ? 'Try adjusting your search or filter criteria'
                  : 'This cook has no meals available right now'}
              </p>
            </div>
          )}
        </Container>
      </main>

      <Footer />
    </div>
  )
}

export default CookMeals
