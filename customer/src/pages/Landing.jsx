import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import Header from '../components/Header'
import Footer from '../components/Footer'
import Container from '../components/Container'
import Loader, { SkeletonCard } from '../components/Loader'
import CookCard from '../components/CookCard'
import { getAllCooks } from '../api/meals'

const Landing = () => {
  const [cooks, setCooks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCooks()
  }, [])

  const fetchCooks = async () => {
    try {
      setLoading(true)
      const response = await getAllCooks()
      setCooks(response.cooks || [])
    } catch (error) {
      toast.error('Unable to load cooks. Please try again.')
      console.error('Fetch cooks error:', error)
    } finally {
      setLoading(false)
    }
  }

  const scrollToCooks = () => {
    document.getElementById('cooks-section')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Header showPortalText={false} />

      <main className="flex-1">
        {/* Hero Section */}
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
                    onClick={scrollToCooks}
                    className="rounded-lg bg-orange-600 px-6 py-3 text-base font-medium text-white shadow-sm hover:bg-orange-700 transition-colors"
                  >
                    Browse Cooks
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

        {/* Cooks Section */}
        <section id="cooks-section" className="py-16 bg-gray-50">
          <Container>
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900">Featured Home Cooks</h2>
              <p className="mt-2 text-gray-600">Discover talented home cooks in your area</p>
            </div>

            {loading ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="h-7 w-40 bg-gray-200 rounded animate-pulse" />
                  <div className="h-5 w-24 bg-gray-200 rounded animate-pulse" />
                </div>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {[...Array(6)].map((_, i) => (
                    <SkeletonCard key={i} />
                  ))}
                </div>
              </div>
            ) : cooks.length > 0 ? (
              <>
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-sm text-gray-600">{cooks.length} cooks available</p>
                </div>
                <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {cooks.map((cook) => (
                    <CookCard key={cook.cookId || cook._id} cook={cook} />
                  ))}
                </div>
              </>
            ) : (
              <div className="rounded-xl bg-white p-12 text-center shadow-sm border border-gray-200">
                <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gray-100">
                  <svg className="h-10 w-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900">No cooks available yet</h3>
                <p className="mt-2 text-gray-600">
                  Check back soon for talented home cooks in your area.
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
