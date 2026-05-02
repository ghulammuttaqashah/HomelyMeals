import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { getCookAnalytics, getAllMealsAnalytics } from '../api/analytics'
import Header from '../components/Header'
import Footer from '../components/Footer'
import Loader from '../components/Loader'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

/**
 * Cook-side ABSA Review Analytics Page
 * Tabs: Meal Insights | Cook Insights
 * Drill-down: Sentiment → Category → Aspect (with hover tooltip)
 */
const ReviewAnalyticsPage = () => {
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true)
    const [cookAnalytics, setCookAnalytics] = useState(null)
    const [mealAnalytics, setMealAnalytics] = useState(null)
    const [timeFilter, setTimeFilter] = useState('all')
    const [activeTab, setActiveTab] = useState('meal')
    const [drillLevel, setDrillLevel] = useState('sentiment')
    const [selectedSentiment, setSelectedSentiment] = useState(null)
    const [selectedCategory, setSelectedCategory] = useState(null)
    const [hoveredAspect, setHoveredAspect] = useState(null)

    useEffect(() => {
        fetchAnalytics()
    }, [timeFilter])

    const fetchAnalytics = async () => {
        try {
            setLoading(true)
            const days = timeFilter === 'all' ? null : parseInt(timeFilter)

            const [cookData, mealData] = await Promise.all([
                getCookAnalytics(days),
                getAllMealsAnalytics(days)
            ])

            setCookAnalytics(cookData)
            setMealAnalytics(mealData)
        } catch (error) {
            console.error('Failed to fetch analytics:', error)
            toast.error('Failed to load analytics')
        } finally {
            setLoading(false)
        }
    }

    const handleTabChange = (tab) => {
        setActiveTab(tab)
        setDrillLevel('sentiment')
        setSelectedSentiment(null)
        setSelectedCategory(null)
    }

    const handleSentimentClick = (sentiment) => {
        setSelectedSentiment(sentiment)
        setDrillLevel('category')
    }

    const handleCategoryClick = (categoryName) => {
        setSelectedCategory(categoryName)
        setDrillLevel('aspect')
    }

    const handleBreadcrumb = (level) => {
        if (level === 'sentiment') {
            setDrillLevel('sentiment')
            setSelectedSentiment(null)
            setSelectedCategory(null)
        } else if (level === 'category') {
            setDrillLevel('category')
            setSelectedCategory(null)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col">
                <Header showSignOut={true} />
                <div className="flex-1 flex items-center justify-center">
                    <Loader />
                </div>
                <Footer />
            </div>
        )
    }

    // Select analytics based on active tab
    const analytics = activeTab === 'meal' ? mealAnalytics : cookAnalytics
    const hasData = analytics && analytics.totalReviews > 0

    const tabCategories = analytics?.categories || {}
    const positiveCategories = tabCategories.positive || []
    const negativeCategories = tabCategories.negative || []

    const tabPositive = positiveCategories.reduce((s, c) => s + c.count, 0)
    const tabNegative = negativeCategories.reduce((s, c) => s + c.count, 0)

    const currentCategories = selectedSentiment === 'positive' ? positiveCategories : negativeCategories
    const currentAspects = selectedCategory
        ? (currentCategories.find(c => c.name === selectedCategory)?.aspects || [])
        : []

    const sentimentColor = selectedSentiment === 'positive' ? '#22c55e' : '#ef4444'
    const sentimentBg = selectedSentiment === 'positive' ? 'bg-green-50' : 'bg-red-50'
    const sentimentBorder = selectedSentiment === 'positive' ? 'border-green-200' : 'border-red-200'
    const sentimentText = selectedSentiment === 'positive' ? 'text-green-700' : 'text-red-700'

    const CustomBarTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white px-3 py-2 rounded-lg shadow-lg border border-gray-200 text-sm">
                    <p className="font-semibold text-gray-900">{payload[0].payload.name}</p>
                    <p className="text-gray-600">{payload[0].value} mentions</p>
                    <p className="text-xs text-orange-600 mt-1">Click to drill down →</p>
                </div>
            )
        }
        return null
    }

    const AspectTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const aspect = payload[0].payload
            return (
                <div className="bg-white px-3 py-2 rounded-lg shadow-lg border border-gray-200 text-sm max-w-xs">
                    <p className="font-semibold text-gray-900">{aspect.name}</p>
                    <p className="text-gray-600">{aspect.count} mentions</p>
                    {aspect.texts && aspect.texts.length > 0 && (
                        <div className="mt-2 border-t pt-2">
                            <p className="text-xs text-gray-500 font-medium mb-1">Customer said:</p>
                            {aspect.texts.slice(0, 2).map((t, i) => (
                                <p key={i} className="text-xs text-gray-700 italic">"{t}"</p>
                            ))}
                        </div>
                    )}
                </div>
            )
        }
        return null
    }

    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            <Header showSignOut={true} />
            <main className="flex-1 container mx-auto px-3 sm:px-4 py-4 sm:py-8 max-w-4xl">

                {/* Page Header */}
                <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                    <div>
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="mb-2 inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-orange-600 transition-colors"
                        >
                            ← Back to Dashboard
                        </button>
                        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Review Analytics</h1>
                        {analytics && (
                            <p className="text-sm text-gray-500 mt-1">
                                {analytics.totalReviews} {analytics.totalReviews === 1 ? 'review' : 'reviews'} •{' '}
                                <span className="text-yellow-500 font-semibold">{analytics.averageRating}</span> avg rating
                            </p>
                        )}
                    </div>
                    <select
                        value={timeFilter}
                        onChange={(e) => setTimeFilter(e.target.value)}
                        className="px-3 sm:px-4 py-2 border rounded-lg bg-white text-sm sm:text-base w-full sm:w-auto shadow-sm"
                    >
                        <option value="all">All Time</option>
                        <option value="7">Last 7 Days</option>
                        <option value="30">Last 30 Days</option>
                    </select>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    {/* Tabs */}
                    <div className="flex gap-1 bg-gray-50 p-2 border-b border-gray-100">
                        <button
                            onClick={() => handleTabChange('meal')}
                            className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all ${activeTab === 'meal'
                                ? 'bg-white text-orange-600 shadow-sm'
                                : 'text-gray-600 hover:text-gray-800'
                                }`}
                        >
                            🍽️ Meal Insights
                        </button>
                        <button
                            onClick={() => handleTabChange('cook')}
                            className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all ${activeTab === 'cook'
                                ? 'bg-white text-orange-600 shadow-sm'
                                : 'text-gray-600 hover:text-gray-800'
                                }`}
                        >
                            👨‍🍳 Cook Insights
                        </button>
                    </div>

                    <div className="p-4 sm:p-6">
                        {!hasData ? (
                            <div className="text-center py-16">
                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <span className="text-3xl">{activeTab === 'meal' ? '🍽️' : '👨‍🍳'}</span>
                                </div>
                                <h3 className="text-lg font-semibold text-gray-700 mb-2">No {activeTab} insights yet</h3>
                                <p className="text-gray-500 text-sm">
                                    {activeTab === 'meal'
                                        ? 'Meal-related aspects will appear here once customers leave reviews.'
                                        : 'Cook-related aspects will appear here once customers leave reviews.'}
                                </p>
                            </div>
                        ) : (
                            <>
                                {/* Breadcrumb */}
                                {drillLevel !== 'sentiment' && (
                                    <div className="flex items-center gap-2 text-sm mb-4 flex-wrap">
                                        <button
                                            onClick={() => handleBreadcrumb('sentiment')}
                                            className="text-orange-600 hover:text-orange-700 font-medium"
                                        >
                                            Sentiment
                                        </button>
                                        {drillLevel === 'category' && (
                                            <>
                                                <span className="text-gray-400">›</span>
                                                <span className={`font-semibold capitalize ${selectedSentiment === 'positive' ? 'text-green-600' : 'text-red-600'}`}>
                                                    {selectedSentiment}
                                                </span>
                                            </>
                                        )}
                                        {drillLevel === 'aspect' && (
                                            <>
                                                <span className="text-gray-400">›</span>
                                                <button
                                                    onClick={() => handleBreadcrumb('category')}
                                                    className="text-orange-600 hover:text-orange-700 font-medium capitalize"
                                                >
                                                    {selectedSentiment}
                                                </button>
                                                <span className="text-gray-400">›</span>
                                                <span className="font-semibold text-gray-800">{selectedCategory}</span>
                                            </>
                                        )}
                                    </div>
                                )}

                                {/* ── LEVEL 1: Sentiment ── */}
                                {drillLevel === 'sentiment' && (
                                    <div className="space-y-4">
                                        <p className="text-sm text-gray-500">Click a bar or card to explore categories</p>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div
                                                className="bg-green-50 border-2 border-green-200 rounded-xl p-4 cursor-pointer hover:shadow-md transition-shadow"
                                                onClick={() => handleSentimentClick('positive')}
                                            >
                                                <p className="text-xs font-medium text-green-700 mb-1">Positive</p>
                                                <p className="text-3xl font-bold text-green-600">{tabPositive}</p>
                                                <p className="text-xs text-green-600 mt-1">Tap to explore →</p>
                                            </div>
                                            <div
                                                className="bg-red-50 border-2 border-red-200 rounded-xl p-4 cursor-pointer hover:shadow-md transition-shadow"
                                                onClick={() => handleSentimentClick('negative')}
                                            >
                                                <p className="text-xs font-medium text-red-700 mb-1">Negative</p>
                                                <p className="text-3xl font-bold text-red-600">{tabNegative}</p>
                                                <p className="text-xs text-red-600 mt-1">Tap to explore →</p>
                                            </div>
                                        </div>

                                        {(tabPositive > 0 || tabNegative > 0) && (
                                            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                                                <h3 className="text-sm font-semibold text-gray-700 mb-4">Sentiment Distribution</h3>
                                                <ResponsiveContainer width="100%" height={220}>
                                                    <BarChart
                                                        data={[
                                                            { name: 'Positive', count: tabPositive, color: '#22c55e' },
                                                            { name: 'Negative', count: tabNegative, color: '#ef4444' }
                                                        ]}
                                                        margin={{ top: 15, right: 30, left: 0, bottom: 5 }}
                                                    >
                                                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                                                        <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 13, fontWeight: 600 }} axisLine={false} tickLine={false} />
                                                        <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                                                        <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
                                                        <Bar
                                                            dataKey="count"
                                                            radius={[8, 8, 0, 0]}
                                                            maxBarSize={80}
                                                            onClick={(data) => handleSentimentClick(data.name.toLowerCase())}
                                                            style={{ cursor: 'pointer' }}
                                                            label={{ position: 'top', fill: '#374151', fontSize: 14, fontWeight: 700 }}
                                                        >
                                                            {[
                                                                { name: 'Positive', count: tabPositive, color: '#22c55e' },
                                                                { name: 'Negative', count: tabNegative, color: '#ef4444' }
                                                            ].map((entry, i) => (
                                                                <Cell key={i} fill={entry.color} />
                                                            ))}
                                                        </Bar>
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* ── LEVEL 2: Categories ── */}
                                {drillLevel === 'category' && (
                                    <div className="space-y-4">
                                        <div className={`${sentimentBg} ${sentimentBorder} border rounded-xl p-3 flex items-center justify-between`}>
                                            <span className={`text-sm font-semibold capitalize ${sentimentText}`}>
                                                {selectedSentiment} — {currentCategories.reduce((s, c) => s + c.count, 0)} mentions
                                            </span>
                                            <button
                                                onClick={() => handleBreadcrumb('sentiment')}
                                                className="text-xs text-gray-500 hover:text-gray-700"
                                            >
                                                ← Back
                                            </button>
                                        </div>

                                        <p className="text-sm text-gray-500">Click a category to see specific aspects</p>

                                        {currentCategories.length > 0 ? (
                                            <>
                                                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                                                    <ResponsiveContainer width="100%" height={Math.max(180, currentCategories.length * 52)}>
                                                        <BarChart
                                                            data={currentCategories}
                                                            layout="vertical"
                                                            margin={{ top: 5, right: 50, left: 10, bottom: 5 }}
                                                        >
                                                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                                                            <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                                                            <YAxis dataKey="name" type="category" tick={{ fill: '#374151', fontSize: 12, fontWeight: 500 }} axisLine={false} tickLine={false} width={90} />
                                                            <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
                                                            <Bar
                                                                dataKey="count"
                                                                fill={sentimentColor}
                                                                radius={[0, 8, 8, 0]}
                                                                maxBarSize={32}
                                                                onClick={(data) => handleCategoryClick(data.name)}
                                                                style={{ cursor: 'pointer' }}
                                                                label={{ position: 'right', fill: '#374151', fontSize: 12, fontWeight: 700 }}
                                                            />
                                                        </BarChart>
                                                    </ResponsiveContainer>
                                                </div>

                                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                                    {currentCategories.map((cat, i) => (
                                                        <button
                                                            key={i}
                                                            onClick={() => handleCategoryClick(cat.name)}
                                                            className={`text-left p-3 rounded-xl border-2 ${sentimentBorder} ${sentimentBg} hover:shadow-md transition-all`}
                                                        >
                                                            <p className={`text-xs font-medium ${sentimentText}`}>{cat.name}</p>
                                                            <p className={`text-xl font-bold ${sentimentText}`}>{cat.count}</p>
                                                        </button>
                                                    ))}
                                                </div>
                                            </>
                                        ) : (
                                            <div className="text-center py-8 text-gray-400">
                                                <p>No {selectedSentiment} categories found.</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* ── LEVEL 3: Aspects with hover tooltip ── */}
                                {drillLevel === 'aspect' && (
                                    <div className="space-y-4">
                                        <div className={`${sentimentBg} ${sentimentBorder} border rounded-xl p-3 flex items-center justify-between`}>
                                            <span className={`text-sm font-semibold ${sentimentText}`}>
                                                {selectedCategory} — {currentAspects.reduce((s, a) => s + a.count, 0)} mentions
                                            </span>
                                            <button
                                                onClick={() => handleBreadcrumb('category')}
                                                className="text-xs text-gray-500 hover:text-gray-700"
                                            >
                                                ← Back
                                            </button>
                                        </div>

                                        <p className="text-sm text-gray-500">Hover over aspects to see customer quotes</p>

                                        {currentAspects.length > 0 ? (
                                            <>
                                                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                                                    <ResponsiveContainer width="100%" height={Math.max(180, currentAspects.length * 52)}>
                                                        <BarChart
                                                            data={currentAspects}
                                                            layout="vertical"
                                                            margin={{ top: 5, right: 50, left: 10, bottom: 5 }}
                                                        >
                                                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                                                            <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                                                            <YAxis dataKey="name" type="category" tick={{ fill: '#374151', fontSize: 12, fontWeight: 500 }} axisLine={false} tickLine={false} width={110} />
                                                            <Tooltip content={<AspectTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
                                                            <Bar
                                                                dataKey="count"
                                                                fill={sentimentColor}
                                                                radius={[0, 8, 8, 0]}
                                                                maxBarSize={32}
                                                                label={{ position: 'right', fill: '#374151', fontSize: 12, fontWeight: 700 }}
                                                            />
                                                        </BarChart>
                                                    </ResponsiveContainer>
                                                </div>

                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                    {currentAspects.map((aspect, i) => (
                                                        <div
                                                            key={i}
                                                            className={`relative p-3 rounded-xl border-2 ${sentimentBorder} ${sentimentBg} group`}
                                                            onMouseEnter={() => setHoveredAspect(aspect)}
                                                            onMouseLeave={() => setHoveredAspect(null)}
                                                        >
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-2">
                                                                    <div className={`w-2.5 h-2.5 rounded-full ${selectedSentiment === 'positive' ? 'bg-green-500' : 'bg-red-500'}`} />
                                                                    <span className="text-sm font-medium text-gray-800">{aspect.name}</span>
                                                                </div>
                                                                <span className={`text-lg font-bold ${sentimentText}`}>{aspect.count}</span>
                                                            </div>

                                                            {/* Hover tooltip */}
                                                            {hoveredAspect?.name === aspect.name && aspect.texts && aspect.texts.length > 0 && (
                                                                <div className="absolute bottom-full left-0 mb-2 z-20 bg-gray-900 text-white rounded-xl p-3 shadow-xl w-64 text-xs">
                                                                    <p className="font-semibold mb-2 text-gray-300">Customer quotes:</p>
                                                                    {aspect.texts.slice(0, 3).map((text, ti) => (
                                                                        <p key={ti} className="italic text-gray-100 mb-1">"{text}"</p>
                                                                    ))}
                                                                    {aspect.texts.length > 3 && (
                                                                        <p className="text-gray-400 mt-1">+{aspect.texts.length - 3} more</p>
                                                                    )}
                                                                    <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900" />
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </>
                                        ) : (
                                            <div className="text-center py-8 text-gray-400">
                                                <p>No aspects found for {selectedCategory}.</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    )
}

export default ReviewAnalyticsPage
