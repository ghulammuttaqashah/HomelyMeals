import { useState, useEffect } from 'react'
import { getMealAnalytics } from '../api/analytics'
import AnalyticsOverview from './AnalyticsOverview'

const DishAnalytics = ({ mealId }) => {
    const [analytics, setAnalytics] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [showAnalytics, setShowAnalytics] = useState(false)

    useEffect(() => {
        fetchAnalytics()
    }, [mealId])

    const fetchAnalytics = async () => {
        try {
            setLoading(true)
            setError(null)
            const data = await getMealAnalytics(mealId)
            setAnalytics(data)
        } catch (err) {
            console.error('Error fetching dish analytics:', err)
            setError('Unable to load analytics')
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                <div className="animate-pulse">
                    <div className="h-10 bg-gray-200 rounded" />
                </div>
            </div>
        )
    }

    if (error || !analytics) {
        return null
    }

    if (analytics.totalReviews === 0) {
        return (
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                <p className="text-gray-600 text-sm text-center">No reviews yet</p>
            </div>
        )
    }

    return (
        <>
            {/* Analytics Button */}
            <button
                onClick={() => setShowAnalytics(true)}
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-3"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span>View Analytics Overview</span>
                <span className="bg-white bg-opacity-20 px-2 py-0.5 rounded-full text-xs">
                    {analytics.totalReviews} {analytics.totalReviews === 1 ? 'order' : 'orders'}
                </span>
            </button>

            {/* Analytics Modal */}
            {showAnalytics && (
                <AnalyticsOverview
                    analytics={analytics}
                    type="meal"
                    entityId={mealId}
                    onClose={() => setShowAnalytics(false)}
                />
            )}
        </>
    )
}

export default DishAnalytics
