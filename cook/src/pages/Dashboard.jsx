import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { getMeals } from '../api/meals'
import Header from '../components/Header'
import Footer from '../components/Footer'
import Loader from '../components/Loader'
import MealCard from '../components/MealCard'

const Dashboard = () => {
  const navigate = useNavigate()
  const { cook, isAuthenticated } = useAuth()
  const [meals, setMeals] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true })
    }
  }, [isAuthenticated, navigate])

  useEffect(() => {
    if (isAuthenticated) {
      fetchMeals()
    }
  }, [isAuthenticated])

  const fetchMeals = async () => {
    try {
      setLoading(true)
      const response = await getMeals()
      setMeals(response.meals || [])
    } catch (error) {
      toast.error('Failed to load meals')
      console.error('Fetch meals error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Header showSignOut={true} />
      
      <main className="flex-1 py-12">
        <div className="mx-auto max-w-7xl px-4 lg:px-6">
          {/* Header Section */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">My Meals</h1>
              <p className="mt-1 text-sm text-gray-600">Welcome, {cook?.name}!</p>
            </div>
            <button
              onClick={() => navigate('/add-meal')}
              className="flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-700 transition-colors"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Meal
            </button>
          </div>

          {/* Meals Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader size="lg" />
            </div>
          ) : meals.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {meals.map((meal) => (
                <MealCard key={meal._id} meal={meal} showActions={false} />
              ))}
            </div>
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
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
              <h3 className="mt-4 text-lg font-semibold text-gray-900">No meals yet</h3>
              <p className="mt-2 text-sm text-gray-600">
                Start by adding your first meal to your menu
              </p>
              <button
                onClick={() => navigate('/add-meal')}
                className="mt-6 rounded-lg bg-orange-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-700 transition-colors"
              >
                Add Your First Meal
              </button>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}

export default Dashboard
