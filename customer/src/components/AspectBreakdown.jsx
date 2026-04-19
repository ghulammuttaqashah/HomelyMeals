import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const AspectBreakdown = ({ analytics, sentiment, type, entityId, onBack, onClose }) => {
    const [searchQuery, setSearchQuery] = useState('')

    if (!analytics || !analytics.aspects) return null

    // Define colors based on sentiment (not using dynamic Tailwind)
    const colors = sentiment === 'Positive' 
        ? {
            primary: '#22c55e',
            bg: 'bg-green-50',
            bgGradient: 'from-green-50 to-green-100',
            border: 'border-green-200',
            text: 'text-green-700',
            textBold: 'text-green-600',
            bgSolid: 'bg-green-500',
            borderCard: 'border-green-200',
            dot: 'bg-green-500'
        }
        : {
            primary: '#ef4444',
            bg: 'bg-red-50',
            bgGradient: 'from-red-50 to-red-100',
            border: 'border-red-200',
            text: 'text-red-700',
            textBold: 'text-red-600',
            bgSolid: 'bg-red-500',
            borderCard: 'border-red-200',
            dot: 'bg-red-500'
        }

    // Helper function to add context to aspect names
    const getContextualAspectName = (aspectName, sentiment) => {
        const name = aspectName.toLowerCase()
        
        if (sentiment === 'Positive') {
            const positivePrefix = {
                'taste': 'Good Taste',
                'flavor': 'Good Flavor',
                'packaging': 'Good Packaging',
                'delivery': 'On-Time Delivery',
                'quality': 'Good Quality',
                'freshness': 'Fresh',
                'portion': 'Good Portion',
                'presentation': 'Good Presentation',
                'temperature': 'Right Temperature',
                'hygiene': 'Good Hygiene',
                'behavior': 'Good Behavior',
                'communication': 'Good Communication',
                'punctuality': 'Punctual',
                'professionalism': 'Professional',
                'responsiveness': 'Responsive',
                'service': 'Good Service',
                'price': 'Good Price'
            }
            return positivePrefix[name] || `Good ${aspectName.charAt(0).toUpperCase() + aspectName.slice(1)}`
        } else {
            const negativePrefix = {
                'taste': 'Poor Taste',
                'flavor': 'Poor Flavor',
                'packaging': 'Bad Packaging',
                'delivery': 'Late Delivery',
                'quality': 'Poor Quality',
                'freshness': 'Not Fresh',
                'portion': 'Small Portion',
                'presentation': 'Poor Presentation',
                'temperature': 'Wrong Temperature',
                'hygiene': 'Poor Hygiene',
                'behavior': 'Bad Behavior',
                'communication': 'Poor Communication',
                'punctuality': 'Late',
                'professionalism': 'Unprofessional',
                'responsiveness': 'Unresponsive',
                'service': 'Poor Service',
                'price': 'Expensive'
            }
            return negativePrefix[name] || `Poor ${aspectName.charAt(0).toUpperCase() + aspectName.slice(1)}`
        }
    }

    // Filter aspects based on sentiment and prepare chart data
    const allAspectData = analytics.aspects
        .map(aspect => ({
            name: getContextualAspectName(aspect.name, sentiment),
            count: sentiment === 'Positive' ? aspect.positive : aspect.negative,
            originalName: aspect.name
        }))
        .filter(aspect => aspect.count > 0)
        .sort((a, b) => b.count - a.count)

    // Filter by search query
    const aspectData = searchQuery
        ? allAspectData.filter(aspect =>
            aspect.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : allAspectData

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white px-4 py-3 rounded-lg shadow-lg border border-gray-200">
                    <p className="font-semibold text-gray-900 capitalize">{payload[0].payload.name}</p>
                    <p className="text-sm text-gray-600">{payload[0].value} mentions</p>
                </div>
            )
        }
        return null
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl max-w-5xl w-full my-4 sm:my-8 max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 sticky top-0 bg-white z-10 rounded-t-xl sm:rounded-t-2xl">
                    <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
                        <button
                            onClick={onBack}
                            className="text-gray-400 hover:text-gray-600 transition-colors p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg flex-shrink-0"
                        >
                            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <div className="flex-1 min-w-0">
                            <h2 className="text-lg sm:text-2xl font-bold text-gray-900 truncate">
                                {sentiment} Aspects
                            </h2>
                            <p className="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1 truncate">
                                Detailed {sentiment.toLowerCase()} feedback
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 ml-2"
                    >
                        <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 sm:p-6 lg:p-8 pb-4 sm:pb-6">
                    {/* Summary Card */}
                    <div className={`bg-gradient-to-br ${colors.bgGradient} rounded-lg sm:rounded-xl p-4 sm:p-6 border-2 ${colors.border} shadow-sm mb-4 sm:mb-6`}>
                        <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                                <p className={`text-xs sm:text-sm font-medium ${colors.text} mb-1`}>
                                    Total {sentiment} Mentions
                                </p>
                                <p className={`text-2xl sm:text-3xl lg:text-4xl font-bold ${colors.textBold}`}>
                                    {allAspectData.reduce((sum, aspect) => sum + aspect.count, 0)}
                                </p>
                            </div>
                            <div className={`${colors.bgSolid} rounded-full p-2 sm:p-3 flex-shrink-0 ml-2`}>
                                {sentiment === 'Positive' ? (
                                    <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                ) : (
                                    <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Search Bar */}
                    <div className="mb-4 sm:mb-6">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search aspects..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 pl-10 sm:pl-11 pr-10 border-2 border-gray-300 rounded-lg text-sm sm:text-base focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200 transition-all"
                            />
                            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            )}
                        </div>
                        {searchQuery && (
                            <p className="text-xs sm:text-sm text-gray-600 mt-2">
                                Found {aspectData.length} aspect{aspectData.length !== 1 ? 's' : ''}
                            </p>
                        )}
                    </div>

                    {/* Aspect Bar Chart */}
                    {aspectData.length > 0 ? (
                        <div className="bg-gray-50 rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-6 border border-gray-200">
                            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 sm:mb-6">
                                Aspects Distribution
                            </h3>
                            
                            {/* Chart Container with Horizontal Scroll */}
                            <div className="w-full overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0 mb-4 sm:mb-6">
                                <div style={{ minWidth: '400px' }}>
                                    <ResponsiveContainer width="100%" height={Math.max(300, Math.min(aspectData.length * 50, 600))}>
                                        <BarChart 
                                            data={aspectData}
                                            layout="vertical"
                                            margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                                            <XAxis 
                                                type="number" 
                                                tick={{ fill: '#6b7280', fontSize: 11 }}
                                                axisLine={{ stroke: '#e5e7eb' }}
                                            />
                                            <YAxis 
                                                dataKey="name" 
                                                type="category" 
                                                tick={{ fill: '#374151', fontSize: 11, fontWeight: 500 }}
                                                axisLine={{ stroke: '#e5e7eb' }}
                                                width={100}
                                            />
                                            <Tooltip content={<CustomTooltip />} cursor={{ fill: `${colors.primary}10` }} />
                                            <Bar 
                                                dataKey="count" 
                                                fill={colors.primary}
                                                radius={[0, 8, 8, 0]}
                                                maxBarSize={30}
                                                label={{ 
                                                    position: 'right', 
                                                    fill: '#374151',
                                                    fontSize: 11,
                                                    fontWeight: 600
                                                }}
                                            />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Aspect Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                                {aspectData.map((aspect, index) => (
                                    <div 
                                        key={index}
                                        className={`flex items-center justify-between p-2.5 sm:p-3 bg-white rounded-lg border-2 ${colors.borderCard} hover:shadow-md transition-shadow`}
                                    >
                                        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                                            <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full ${colors.dot} flex-shrink-0`} />
                                            <span className="font-medium text-gray-900 capitalize text-sm sm:text-base truncate">
                                                {aspect.name}
                                            </span>
                                        </div>
                                        <span className={`text-base sm:text-lg font-bold ${colors.textBold} flex-shrink-0 ml-2`}>
                                            {aspect.count}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-8 sm:py-12 bg-gray-50 rounded-xl border border-gray-200">
                            <svg className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-gray-400 mb-3 sm:mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <p className="text-sm sm:text-base text-gray-600 font-medium">No aspects found</p>
                            <p className="text-xs sm:text-sm text-gray-500 mt-1">
                                {searchQuery ? `Try a different search term` : `No ${sentiment.toLowerCase()} aspects available`}
                            </p>
                        </div>
                    )}

                    {/* Back Button */}
                    <div className="mt-4 sm:mt-6">
                        <button
                            onClick={onBack}
                            className="w-full py-2.5 sm:py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
                        >
                            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            Back to Overview
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default AspectBreakdown
