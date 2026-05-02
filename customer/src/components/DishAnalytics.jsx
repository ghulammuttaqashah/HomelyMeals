import { useState, useEffect } from 'react'
import { getMealAnalytics } from '../api/analytics'
import AnalyticsOverview from './AnalyticsOverview'

const DishAnalytics = ({ mealId }) => {
    const [analytics, setAnalytics] = useState(null)
    const [loading, setLoading] = useState(true)
    const [showAnalytics, setShowAnalytics] = useState(false)

    useEffect(() => {
        fetchAnalytics()
    }, [mealId])

    const fetchAnalytics = async () => {
        try {
            setLoading(true)
            const data = await getMealAnalytics(mealId)
            setAnalytics(data)
        } catch (err) {
            console.error('Error fetching dish analytics:', err)
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            <button
                onClick={() => setShowAnalytics(true)}
                disabled={loading}
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 px-4 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-center gap-2 text-sm"
            >
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span>View Analytics</span>
            </button>

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
