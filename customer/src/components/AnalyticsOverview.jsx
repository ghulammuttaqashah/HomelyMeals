import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import AspectBreakdown from './AspectBreakdown'

const AnalyticsOverview = ({ analytics, type, entityId, onClose }) => {
    const [selectedSentiment, setSelectedSentiment] = useState(null)

    if (!analytics || !analytics.aspects || analytics.aspects.length === 0) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl max-w-2xl w-full p-6 sm:p-8">
                    <div className="flex items-center justify-between mb-4 sm:mb-6">
                        <h2 className="text-lg sm:text-2xl font-bold text-gray-900">Analytics Overview</h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
                        >
                            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    <div className="text-center py-8 sm:py-12">
                        <svg className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-gray-400 mb-3 sm:mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        <p className="text-sm sm:text-base text-gray-600">No analytics data available yet.</p>
                        <p className="text-xs sm:text-sm text-gray-500 mt-2">Reviews need to be submitted first.</p>
                    </div>
                </div>
            </div>
        )
    }

    // Calculate total positive and negative aspect mentions
    const totalPositive = analytics.aspects.reduce((sum, aspect) => sum + aspect.positive, 0)
    const totalNegative = analytics.aspects.reduce((sum, aspect) => sum + aspect.negative, 0)

    // Level 2: Show aspect breakdown
    if (selectedSentiment) {
        return (
            <AspectBreakdown
                analytics={analytics}
                sentiment={selectedSentiment}
                type={type}
                entityId={entityId}
                onBack={() => setSelectedSentiment(null)}
                onClose={onClose}
            />
        )
    }

    // Level 1: Overview - Positive vs Negative
    const overviewData = [
        { name: 'Positive', count: totalPositive, color: '#22c55e' },
        { name: 'Negative', count: totalNegative, color: '#ef4444' }
    ]

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white px-4 py-2 rounded-lg shadow-lg border border-gray-200">
                    <p className="font-semibold text-gray-900">{payload[0].payload.name}</p>
                    <p className="text-sm text-gray-600">{payload[0].value} aspect mentions</p>
                </div>
            )
        }
        return null
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl max-w-4xl w-full my-4 sm:my-8 max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 sticky top-0 bg-white z-10 rounded-t-xl sm:rounded-t-2xl">
                    <div className="flex-1 min-w-0 pr-2">
                        <h2 className="text-lg sm:text-2xl font-bold text-gray-900 truncate">Analytics Overview</h2>
                        <p className="text-xs sm:text-sm text-gray-600 mt-1">
                            {analytics.totalReviews} {analytics.totalReviews === 1 ? 'order' : 'orders'} • {analytics.averageRating.toFixed(1)} ⭐ avg
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
                    >
                        <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 sm:p-6 lg:p-8 pb-4 sm:pb-6">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
                        <div 
                            className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg sm:rounded-xl p-4 sm:p-6 border-2 border-green-200 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                            onClick={() => setSelectedSentiment('Positive')}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs sm:text-sm font-medium text-green-700 mb-1">Positive Aspects</p>
                                    <p className="text-2xl sm:text-3xl lg:text-4xl font-bold text-green-600">{totalPositive}</p>
                                    <p className="text-xs text-green-600 mt-1">Tap to explore</p>
                                </div>
                                <div className="bg-green-500 rounded-full p-2 sm:p-3 flex-shrink-0 ml-2">
                                    <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        <div 
                            className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg sm:rounded-xl p-4 sm:p-6 border-2 border-red-200 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                            onClick={() => setSelectedSentiment('Negative')}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs sm:text-sm font-medium text-red-700 mb-1">Negative Aspects</p>
                                    <p className="text-2xl sm:text-3xl lg:text-4xl font-bold text-red-600">{totalNegative}</p>
                                    <p className="text-xs text-red-600 mt-1">Tap to explore</p>
                                </div>
                                <div className="bg-red-500 rounded-full p-2 sm:p-3 flex-shrink-0 ml-2">
                                    <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bar Chart */}
                    <div className="bg-gray-50 rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-6 border border-gray-200">
                        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 sm:mb-6">
                            Sentiment Distribution
                        </h3>
                        <div className="w-full overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0">
                            <div className="min-w-[300px]">
                                <ResponsiveContainer width="100%" height={250} className="sm:!h-[300px] lg:!h-[350px]">
                                    <BarChart 
                                        data={overviewData}
                                        margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                                        <XAxis 
                                            dataKey="name" 
                                            tick={{ fill: '#6b7280', fontSize: 12, fontWeight: 600 }}
                                            axisLine={{ stroke: '#e5e7eb' }}
                                        />
                                        <YAxis 
                                            tick={{ fill: '#6b7280', fontSize: 11 }} 
                                            axisLine={{ stroke: '#e5e7eb' }}
                                            label={{ value: 'Mentions', angle: -90, position: 'insideLeft', style: { fill: '#6b7280', fontSize: 11 } }}
                                        />
                                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(251, 146, 60, 0.05)' }} />
                                        <Bar 
                                            dataKey="count" 
                                            radius={[8, 8, 0, 0]}
                                            maxBarSize={80}
                                            onClick={(data) => {
                                                if (data && data.name) {
                                                    setSelectedSentiment(data.name)
                                                }
                                            }}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            {overviewData.map((entry, index) => (
                                                <Cell 
                                                    key={`cell-${index}`}
                                                    fill={entry.color}
                                                    className="transition-opacity duration-200 hover:opacity-80"
                                                />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                        
                        <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <p className="text-xs sm:text-sm text-blue-800 flex items-start gap-2">
                                <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>
                                    <span className="font-semibold">Tap any bar or card</span> to see detailed aspect breakdown
                                </span>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default AnalyticsOverview
