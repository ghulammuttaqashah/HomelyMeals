import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import ReviewList from './ReviewList'

const KeywordBreakdown = ({ aspect, type, entityId, onBack }) => {
    const [selectedKeyword, setSelectedKeyword] = useState(null)
    const [selectedSentiment, setSelectedSentiment] = useState(null)

    if (!aspect) return null

    // Level 3: Show reviews for selected keyword
    if (selectedKeyword && selectedSentiment) {
        return (
            <ReviewList
                type={type}
                entityId={entityId}
                aspect={aspect.name}
                sentiment={selectedSentiment}
                keyword={selectedKeyword}
                onBack={() => {
                    setSelectedKeyword(null)
                    setSelectedSentiment(null)
                }}
            />
        )
    }

    // Level 2: Show keyword breakdown
    const positiveData = aspect.positiveKeywords.slice(0, 10).map(kw => ({
        name: kw.word,
        count: kw.count,
        sentiment: 'Positive'
    }))

    const negativeData = aspect.negativeKeywords.slice(0, 10).map(kw => ({
        name: kw.word,
        count: kw.count,
        sentiment: 'Negative'
    }))

    const handleKeywordClick = (keyword, sentiment) => {
        setSelectedKeyword(keyword)
        setSelectedSentiment(sentiment)
    }

    return (
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            {/* Header */}
            <div className="mb-6">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-orange-600 hover:text-orange-700 font-medium mb-4"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to Overview
                </button>
                <h3 className="text-xl font-bold text-gray-900 capitalize">
                    {aspect.name} - Keyword Breakdown
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                    Click on any keyword to see related reviews
                </p>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="text-2xl font-bold text-green-600">{aspect.positive}</div>
                    <div className="text-sm text-green-700">Positive Mentions</div>
                </div>
                <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                    <div className="text-2xl font-bold text-red-600">{aspect.negative}</div>
                    <div className="text-sm text-red-700">Negative Mentions</div>
                </div>
            </div>

            {/* Positive Keywords */}
            {positiveData.length > 0 && (
                <div className="mb-8">
                    <h4 className="text-lg font-semibold text-green-700 mb-4">
                        ✅ Positive Keywords
                    </h4>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart 
                            data={positiveData}
                            layout="vertical"
                            onClick={(data) => {
                                if (data && data.activeLabel) {
                                    handleKeywordClick(data.activeLabel, 'Positive')
                                }
                            }}
                        >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" />
                            <YAxis 
                                dataKey="name" 
                                type="category" 
                                width={100}
                                style={{ cursor: 'pointer' }}
                            />
                            <Tooltip 
                                cursor={{ fill: 'rgba(16, 185, 129, 0.1)' }}
                                contentStyle={{ 
                                    backgroundColor: 'white', 
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '8px'
                                }}
                            />
                            <Bar 
                                dataKey="count" 
                                fill="#10b981" 
                                cursor="pointer"
                                radius={[0, 8, 8, 0]}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Negative Keywords */}
            {negativeData.length > 0 && (
                <div>
                    <h4 className="text-lg font-semibold text-red-700 mb-4">
                        ❌ Negative Keywords
                    </h4>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart 
                            data={negativeData}
                            layout="vertical"
                            onClick={(data) => {
                                if (data && data.activeLabel) {
                                    handleKeywordClick(data.activeLabel, 'Negative')
                                }
                            }}
                        >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" />
                            <YAxis 
                                dataKey="name" 
                                type="category" 
                                width={100}
                                style={{ cursor: 'pointer' }}
                            />
                            <Tooltip 
                                cursor={{ fill: 'rgba(239, 68, 68, 0.1)' }}
                                contentStyle={{ 
                                    backgroundColor: 'white', 
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '8px'
                                }}
                            />
                            <Bar 
                                dataKey="count" 
                                fill="#ef4444" 
                                cursor="pointer"
                                radius={[0, 8, 8, 0]}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}

            {positiveData.length === 0 && negativeData.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                    No keywords found for this aspect
                </div>
            )}

            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                    💡 <span className="font-semibold">Tip:</span> Click on any keyword bar to see reviews containing that word
                </p>
            </div>
        </div>
    )
}

export default KeywordBreakdown
