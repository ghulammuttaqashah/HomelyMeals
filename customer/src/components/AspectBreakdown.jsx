import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const AspectBreakdown = ({ analytics, sentiment, type, entityId, onBack, onClose }) => {
    const [searchQuery, setSearchQuery] = useState('')

    if (!analytics || !analytics.aspects) return null

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

    const color = sentiment === 'Positive' ? '#22c55e' : '#ef4444'
    const bgColor = sentiment === 'Positive' ? 'green' : 'red'

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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full my-8 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10 rounded-t-2xl">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onBack}
                            className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">
                                {sentiment} Aspects Breakdown
                            </h2>
                            <p className="text-sm text-gray-600 mt-1">
                                Detailed analysis of {sentiment.toLowerCase()} feedback
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 pb-6">
                    {/* Summary Card */}
                    <div className={`bg-gradient-to-br from-${bgColor}-50 to-${bgColor}-100 rounded-xl p-6 border-2 border-${bgColor}-200 shadow-sm mb-6`}>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className={`text-sm font-medium text-${bgColor}-700 mb-1`}>
                                    Total {sentiment} Aspect Mentions
                                </p>
                                <p className={`text-4xl font-bold text-${bgColor}-600`}>
                                    {allAspectData.reduce((sum, aspect) => sum + aspect.count, 0)}
                                </p>
                            </div>
                            <div className={`bg-${bgColor}-500 rounded-full p-3`}>
                                {sentiment === 'Positive' ? (
                                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                ) : (
                                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Search Bar */}
                    <div className="mb-6">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search aspects (e.g., taste, quality, delivery)..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full px-4 py-3 pl-11 pr-10 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200 transition-all"
                            />
                            <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            )}
                        </div>
                        {searchQuery && (
                            <p className="text-sm text-gray-600 mt-2">
                                Found {aspectData.length} aspect{aspectData.length !== 1 ? 's' : ''} matching "{searchQuery}"
                            </p>
                        )}
                    </div>

                    {/* Aspect Bar Chart */}
                    {aspectData.length > 0 ? (
                        <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-900 mb-6">
                                Aspects Distribution
                            </h3>
                            <ResponsiveContainer width="100%" height={Math.max(300, aspectData.length * 50)}>
                                <BarChart 
                                    data={aspectData}
                                    layout="vertical"
                                    margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                                    <XAxis 
                                        type="number" 
                                        tick={{ fill: '#6b7280', fontSize: 12 }}
                                        axisLine={{ stroke: '#e5e7eb' }}
                                    />
                                    <YAxis 
                                        dataKey="name" 
                                        type="category" 
                                        tick={{ fill: '#374151', fontSize: 13, fontWeight: 500 }}
                                        axisLine={{ stroke: '#e5e7eb' }}
                                    />
                                    <Tooltip content={<CustomTooltip />} cursor={{ fill: `${color}10` }} />
                                    <Bar 
                                        dataKey="count" 
                                        fill={color}
                                        radius={[0, 8, 8, 0]}
                                        maxBarSize={35}
                                        label={{ 
                                            position: 'right', 
                                            fill: '#374151',
                                            fontSize: 12,
                                            fontWeight: 600
                                        }}
                                    />
                                </BarChart>
                            </ResponsiveContainer>

                            {/* Aspect Grid */}
                            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {aspectData.map((aspect, index) => (
                                    <div 
                                        key={index}
                                        className={`flex items-center justify-between p-3 bg-white rounded-lg border-2 border-${bgColor}-200 hover:shadow-md transition-shadow`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-3 h-3 rounded-full bg-${bgColor}-500`} />
                                            <span className="font-medium text-gray-900 capitalize">
                                                {aspect.name}
                                            </span>
                                        </div>
                                        <span className={`text-lg font-bold text-${bgColor}-600`}>
                                            {aspect.count}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
                            <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <p className="text-gray-600 font-medium">No aspects found</p>
                            <p className="text-sm text-gray-500 mt-1">
                                {searchQuery ? `Try a different search term` : `No ${sentiment.toLowerCase()} aspects available`}
                            </p>
                        </div>
                    )}

                    {/* Back Button */}
                    <div className="mt-6">
                        <button
                            onClick={onBack}
                            className="w-full py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
