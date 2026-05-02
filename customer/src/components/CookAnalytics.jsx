import { useState, useEffect } from 'react'
import { getCookAnalytics } from '../api/analytics'
import AnalyticsOverview from './AnalyticsOverview'

const CookAnalytics = ({ cookId }) => {
    const [analytics, setAnalytics] = useState(null)
    const [loading, setLoading] = useState(true)
    const [showAnalytics, setShowAnalytics] = useState(false)

    useEffect(() => {
        fetchAnalytics()
    }, [cookId])

    const fetchAnalytics = async () => {
        try {
            setLoading(true)
            const data = await getCookAnalytics(cookId)
            setAnalytics(data)
        } catch (err) {
            console.error('Error fetching cook analytics:', err)
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            <button
                onClick={() => setShowAnalytics(true)}
                disabled={loading}
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 sm:gap-3 text-sm sm:text-base"
            >
                <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span>View Analytics</span>
            </button>

            {showAnalytics && (
                <AnalyticsOverview
                    analytics={analytics}
                    type="cook"
                    entityId={cookId}
                    onClose={() => setShowAnalytics(false)}
                />
            )}
        </>
    )
}

export default CookAnalytics
