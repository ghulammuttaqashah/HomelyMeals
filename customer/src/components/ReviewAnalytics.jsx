import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const COLORS = {
    positive: '#10b981',
    negative: '#ef4444',
    neutral: '#6b7280'
}

const ReviewAnalytics = ({ analytics, title = 'Review Analytics' }) => {
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
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-xl font-semibold">{title}</h2>
                <div className="flex items-center gap-4 mt-2">
                    <div className="flex items-center gap-2">
                        <span className="text-3xl font-bold text-yellow-500">
                            {analytics.averageRating}
                        </span>
                        <span className="text-gray-500">/ 5</span>
                    </div>
                    <span className="text-gray-500">
                        ({analytics.totalReviews} reviews)
                    </span>
                </div>
            </div>

            {/* Charts */}
            <div className="grid md:grid-cols-2 gap-6">
                {/* Pie Chart */}
                <div>
                    <h3 className="text-lg font-medium mb-4">Overall Sentiment</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                            <Pie
                                data={pieData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
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
                    <h3 className="text-lg font-medium mb-4">Aspect Analysis</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={barData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                            <YAxis />
                            <Tooltip />
                            <Legend />
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
                    <h3 className="text-lg font-medium mb-3">Top Keywords</h3>
                    <div className="flex flex-wrap gap-2">
                        {analytics.keywords.slice(0, 15).map((keyword, index) => (
                            <span
                                key={index}
                                className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
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
                    <h3 className="text-lg font-medium mb-3">Detailed Aspects</h3>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                        Aspect
                                    </th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                        Positive
                                    </th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                        Negative
                                    </th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                        Neutral
                                    </th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                        Total
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {analytics.aspects.slice(0, 10).map((aspect, index) => (
                                    <tr key={index}>
                                        <td className="px-4 py-2 text-sm font-medium text-gray-900 capitalize">
                                            {aspect.name}
                                        </td>
                                        <td className="px-4 py-2 text-sm text-green-600">
                                            {aspect.positive}%
                                        </td>
                                        <td className="px-4 py-2 text-sm text-red-600">
                                            {aspect.negative}%
                                        </td>
                                        <td className="px-4 py-2 text-sm text-gray-600">
                                            {aspect.neutral}%
                                        </td>
                                        <td className="px-4 py-2 text-sm text-gray-900">
                                            {aspect.count}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    )
}

export default ReviewAnalytics
