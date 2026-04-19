import { useState, useEffect } from 'react'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const COLORS = {
    positive: '#10b981',
    negative: '#ef4444',
    neutral: '#6b7280'
}

const ReviewAnalytics = ({ analytics, title = 'Review Analytics', showTimeFilter = true }) => {
    const [timeFilter, setTimeFilter] = useState('all')

    if (!analytics) {
        return (
            <div className="bg-white rounded-lg shadow p-6">
                <p className="text-gray-500">Loading analytics...</p>
            </div>
        )
    }

    if (analytics.totalReviews === 0) {
        return (
            <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">{title}</h2>
                <p className="text-gray-500">No reviews yet</p>
            </div>
        )
    }

    // Prepare pie chart data
    const pieData = [
        { name: 'Positive', value: analytics.overall.positive, color: COLORS.positive },
        { name: 'Negative', value: analytics.overall.negative, color: COLORS.negative },
        { name: 'Neutral', value: analytics.overall.neutral, color: COLORS.neutral }
    ].filter(item => item.value > 0)

    // Prepare bar chart data
    const barData = analytics.aspects.slice(0, 8).map(aspect => ({
        name: aspect.name,
        Positive: aspect.positive,
        Negative: aspect.negative,
        Neutral: aspect.neutral
    }))

    return (
        <div className="bg-white rounded-lg shadow p-4 sm:p-6 space-y-4 sm:space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0">
                <div>
                    <h2 className="text-lg sm:text-xl font-semibold">{title}</h2>
                    <div className="flex items-center gap-3 sm:gap-4 mt-2">
                        <div className="flex items-center gap-2">
                            <span className="text-2xl sm:text-3xl font-bold text-yellow-500">
                                {analytics.averageRating}
                            </span>
                            <span className="text-sm sm:text-base text-gray-500">/ 5</span>
                        </div>
                        <span className="text-sm sm:text-base text-gray-500">
                            ({analytics.totalReviews} reviews)
                        </span>
                    </div>
                </div>
                {showTimeFilter && (
                    <select
                        value={timeFilter}
                        onChange={(e) => setTimeFilter(e.target.value)}
                        className="px-3 sm:px-4 py-2 border rounded-lg text-sm sm:text-base"
                    >
                        <option value="all">All Time</option>
                        <option value="7">Last 7 Days</option>
                        <option value="30">Last 30 Days</option>
                    </select>
                )}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                {/* Pie Chart */}
                <div>
                    <h3 className="text-base sm:text-lg font-medium mb-3 sm:mb-4">Overall Sentiment</h3>
                    <ResponsiveContainer width="100%" height={200} className="sm:!h-[250px]">
                        <PieChart>
                            <Pie
                                data={pieData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                outerRadius={60}
                                fill="#8884d8"
                                dataKey="value"
                                className="sm:!outerRadius-[80]"
                            >
                                {pieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Bar Chart */}
                <div>
                    <h3 className="text-base sm:text-lg font-medium mb-3 sm:mb-4">Aspect Analysis</h3>
                    <ResponsiveContainer width="100%" height={200} className="sm:!h-[250px]">
                        <BarChart data={barData} margin={{ bottom: 60, left: -20, right: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                                dataKey="name" 
                                angle={-45} 
                                textAnchor="end" 
                                height={80}
                                tick={{ fontSize: 10 }}
                                interval={0}
                                className="sm:!text-xs"
                            />
                            <YAxis tick={{ fontSize: 10 }} className="sm:!text-xs" />
                            <Tooltip contentStyle={{ fontSize: '12px' }} />
                            <Legend wrapperStyle={{ fontSize: '12px' }} />
                            <Bar dataKey="Positive" fill={COLORS.positive} />
                            <Bar dataKey="Negative" fill={COLORS.negative} />
                            <Bar dataKey="Neutral" fill={COLORS.neutral} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Keywords */}
            {analytics.keywords.length > 0 && (
                <div>
                    <h3 className="text-base sm:text-lg font-medium mb-2 sm:mb-3">Top Keywords</h3>
                    <div className="flex flex-wrap gap-1.5 sm:gap-2">
                        {analytics.keywords.slice(0, 15).map((keyword, index) => (
                            <span
                                key={index}
                                className="px-2 sm:px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs sm:text-sm"
                            >
                                {keyword.word} ({keyword.count})
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Aspect Details */}
            {analytics.aspects.length > 0 && (
                <div>
                    <h3 className="text-base sm:text-lg font-medium mb-2 sm:mb-3">Detailed Aspects</h3>
                    <div className="overflow-x-auto -mx-4 sm:mx-0">
                        <div className="inline-block min-w-full align-middle px-4 sm:px-0">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-2 sm:px-4 py-2 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase">
                                            Aspect
                                        </th>
                                        <th className="px-2 sm:px-4 py-2 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase">
                                            Positive
                                        </th>
                                        <th className="px-2 sm:px-4 py-2 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase">
                                            Negative
                                        </th>
                                        <th className="px-2 sm:px-4 py-2 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase">
                                            Neutral
                                        </th>
                                        <th className="px-2 sm:px-4 py-2 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase">
                                            Total
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {analytics.aspects.slice(0, 10).map((aspect, index) => (
                                        <tr key={index}>
                                            <td className="px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium text-gray-900 capitalize">
                                                {aspect.name}
                                            </td>
                                            <td className="px-2 sm:px-4 py-2 text-xs sm:text-sm text-green-600">
                                                {aspect.positive}%
                                            </td>
                                            <td className="px-2 sm:px-4 py-2 text-xs sm:text-sm text-red-600">
                                                {aspect.negative}%
                                            </td>
                                            <td className="px-2 sm:px-4 py-2 text-xs sm:text-sm text-gray-600">
                                                {aspect.neutral}%
                                            </td>
                                            <td className="px-2 sm:px-4 py-2 text-xs sm:text-sm text-gray-900">
                                                {aspect.count}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default ReviewAnalytics
