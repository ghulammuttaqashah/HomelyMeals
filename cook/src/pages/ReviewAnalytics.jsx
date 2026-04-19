import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { getCookAnalytics, getAllMealsAnalytics } from '../api/analytics'
import ReviewAnalytics from '../components/ReviewAnalytics'
import Header from '../components/Header'
import Footer from '../components/Footer'
import Loader from '../components/Loader'

const ReviewAnalyticsPage = () => {
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true)
    const [cookAnalytics, setCookAnalytics] = useState(null)
    const [mealAnalytics, setMealAnalytics] = useState(null)
    const [timeFilter, setTimeFilter] = useState('all')

    useEffect(() => {
        fetchAnalytics()
    }, [timeFilter])

    const fetchAnalytics = async () => {
        try {
            setLoading(true)
            const days = timeFilter === 'all' ? null : parseInt(timeFilter)
            
            const [cookData, mealData] = await Promise.all([
                getCookAnalytics(days),
                getAllMealsAnalytics(days)
            ])

            setCookAnalytics(cookData)
            setMealAnalytics(mealData)
        } catch (error) {
            console.error('Failed to fetch analytics:', error)
            toast.error('Failed to load analytics')
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col">
                <Header />
                <div className="flex-1 flex items-center justify-center">
                    <Loader />
                </div>
                <Footer />
            </div>
        )
    }

    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            <Header />
            <main className="flex-1 container mx-auto px-3 sm:px-4 py-4 sm:py-8">
                <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0">
                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Review Analytics</h1>
                    <select
                        value={timeFilter}
                        onChange={(e) => setTimeFilter(e.target.value)}
                        className="px-3 sm:px-4 py-2 border rounded-lg bg-white text-sm sm:text-base w-full sm:w-auto"
                    >
                        <option value="all">All Time</option>
                        <option value="7">Last 7 Days</option>
                        <option value="30">Last 30 Days</option>
                    </select>
                </div>

                <div className="space-y-4 sm:space-y-8">
                    {/* Cook Reviews Analytics */}
                    <ReviewAnalytics
                        analytics={cookAnalytics}
                        title="Your Service Reviews"
                        showTimeFilter={false}
                    />

                    {/* Meal Reviews Analytics */}
                    <ReviewAnalytics
                        analytics={mealAnalytics}
                        title="Your Meal Reviews"
                        showTimeFilter={false}
                    />
                </div>
            </main>
            <Footer />
        </div>
    )
}

export default ReviewAnalyticsPage
