import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import Header from '../components/Header'
import Footer from '../components/Footer'
import Container from '../components/Container'
import MealCard from '../components/MealCard'
import Loader from '../components/Loader'
import { getAllMeals } from '../api/meals'

const Landing = () => {
  const [meals, setMeals] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMeals()
  }, [])

  const fetchMeals = async () => {
    try {
      setLoading(true)
      const response = await getAllMeals()
      const mealsData = response.meals.map(meal => ({
        id: meal.mealId,
        name: meal.name,
        price: meal.price,
        description: meal.description,
        image: meal.itemImage || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&h=300&fit=crop',
        rating: 4.5,
        reviews: 0,
        category: meal.category,
        cookName: meal.cookName,
        availability: meal.availability,
      }))
      setMeals(mealsData)
    } catch (error) {
      toast.error('Failed to load meals')
      console.error('Fetch meals error:', error)
    } finally {
      setLoading(false)
    }
  }
  const scrollToMeals = () => {
    document.getElementById('meals-section')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Header showPortalText={false} />
      
      <main className="flex-1">
        {/* Introduction Section */}
        <section className="bg-gradient-to-br from-orange-50 to-white py-12">
          <Container>
            <div className="grid gap-8 lg:grid-cols-2 lg:gap-12 items-center">
              <div>
                <h2 className="text-4xl font-bold text-gray-900 lg:text-5xl">
                  Fresh, Homemade Food
                  <span className="block text-orange-600">Delivered to You</span>
                </h2>
                <p className="mt-4 text-lg text-gray-600">
                  Homely Meals connects home cooks with customers looking for fresh, homemade food. 
                  Experience authentic home-cooked meals made with love and delivered right to your doorstep.
                </p>
                <div className="mt-8">
                  <button 
                    onClick={scrollToMeals}
                    className="rounded-lg bg-orange-600 px-6 py-3 text-base font-medium text-white shadow-sm hover:bg-orange-700 transition-colors"
                  >
                    Browse Meals
                  </button>
                </div>
              </div>
              <div className="flex justify-center">
                <div className="w-full max-w-md overflow-hidden rounded-2xl shadow-xl">
                  <img
                    src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=500&h=400&fit=crop"
                    alt="Delicious homemade food"
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>
            </div>
          </Container>
        </section>

        {/* Meals Section */}
        <section id="meals-section" className="py-16 bg-gray-50">
          <Container>
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900">Popular Meals</h2>
              <p className="mt-2 text-gray-600">Discover delicious homemade meals from local cooks</p>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader size="lg" />
              </div>
            ) : meals.length > 0 ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {meals.map((meal) => (
                  <MealCard key={meal.id} meal={meal} />
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
                    d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <h3 className="mt-4 text-lg font-semibold text-gray-900">No meals available yet</h3>
                <p className="mt-2 text-sm text-gray-600">
                  Check back soon for delicious homemade meals
                </p>
              </div>
            )}
          </Container>
        </section>
      </main>

      <Footer />
    </div>
  )
}

export default Landing
