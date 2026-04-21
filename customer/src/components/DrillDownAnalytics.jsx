import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import KeywordBreakdown from './KeywordBreakdown'

const DrillDownAnalytics = ({ analytics, type, entityId }) => {
    const [selectedAspect, setSelectedAspect] = useState(null)

    if (!analytics || !analytics.aspects || analytics.aspects.length === 0) {
        return (
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                <p className="text-gray-600 text-sm">No analytics data available yet.</p>
            </div>
        )
    }

    // Level 1: Overview - Show all aspects
    if (!selectedAspect) {
        const chartData = analytics.aspects.map(aspect => ({
            name: aspect.name.charAt(0).toUpperCase() + aspect.name.slice(1),
            Positive: aspect.positive,
            Negative: aspect.negative
        }))

        return (
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900">Analytics Overview</h3>
                        <p className="text-sm text-gray-600 mt-1">
                            Click on any aspect to see detailed breakdown
                        </p>
                    </div>
                    <div className="text-right">
                        <div className="text-2xl font-bold text-orange-600">
                            {Math.round(analytics.averageRating)}
                        </div>
                        <div className="text-sm text-gray-600">
                            {analytics.totalReviews} reviews
                        </div>
                    </div>
                </div>

                <ResponsiveContainer width="100%" height={400}>
                    <BarChart 
                        data={chartData}
                        onClick={(data) => {
                            if (data && data.activeLabel) {
                                const aspect = analytics.aspects.find(
                                    a => a.name.charAt(0).toUpperCase() + a.name.slice(1) === data.activeLabel
                                )
                                if (aspect) setSelectedAspect(aspect)
                            }
                        }}
                    >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                            dataKey="name" 
                            angle={-45} 
                            textAnchor="end" 
                            height={100}
                            style={{ cursor: 'pointer' }}
                        />
                        <YAxis allowDecimals={false} />
                        <Tooltip 
                            cursor={{ fill: 'rgba(251, 146, 60, 0.1)' }}
                            contentStyle={{ 
                                backgroundColor: 'white', 
                                border: '1px solid #e5e7eb',
                                borderRadius: '8px'
                            }}
                        />
                        <Legend />
                        <Bar 
                            dataKey="Positive" 
                            fill="#10b981" 
                            cursor="pointer"
                            radius={[8, 8, 0, 0]}
                        />
                        <Bar 
                            dataKey="Negative" 
                            fill="#ef4444" 
                            cursor="pointer"
                            radius={[8, 8, 0, 0]}
                        />
                    </BarChart>
                </ResponsiveContainer>

                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">
                        💡 <span className="font-semibold">Tip:</span> Click on any aspect bar to see detailed keyword breakdown
                    </p>
                </div>
            </div>
        )
    }

    // Level 2: Drill-down - Show keyword breakdown
    return (
        <KeywordBreakdown
            aspect={selectedAspect}
            type={type}
            entityId={entityId}
            onBack={() => setSelectedAspect(null)}
        />
    )
}

export default DrillDownAnalytics
