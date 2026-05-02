import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

/**
 * ABSA Analytics Modal — strictly focused on ONE target type.
 *
 * type="meal"  → shows only meal-related aspects (Taste, Packaging, etc.)
 * type="cook"  → shows only cook-related aspects (Behavior, Timeliness, etc.)
 *
 * Drill-down hierarchy:
 *   Level 1: Positive / Negative sentiment bars
 *   Level 2: Categories (click a sentiment bar)
 *   Level 3: Aspects (click a category bar)
 *   Level 4: Hover tooltip → original review text(s)
 */
const AnalyticsOverview = ({ analytics, type, onClose }) => {
    const [drillLevel, setDrillLevel] = useState('sentiment')
    const [selectedSentiment, setSelectedSentiment] = useState(null)
    const [selectedCategory, setSelectedCategory] = useState(null)
    const [hoveredAspect, setHoveredAspect] = useState(null)

    const label = type === 'cook' ? 'Cook' : 'Meal'
    const emoji = type === 'cook' ? '👨‍🍳' : '🍽️'

    // ── Empty / no-data states ──────────────────────────────────────────────
    if (!analytics) {
        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-gray-900">{emoji} {label} Analytics</h2>
                        <CloseBtn onClose={onClose} />
                    </div>
                    <p className="text-center text-gray-500 py-8">No analytics data available yet.</p>
                </div>
            </div>
        )
    }

    // categories is { positive: [...], negative: [...] } already filtered by target on the server
    const positiveCategories = analytics.categories?.positive || []
    const negativeCategories = analytics.categories?.negative || []

    const totalPositive = positiveCategories.reduce((s, c) => s + c.count, 0)
    const totalNegative = negativeCategories.reduce((s, c) => s + c.count, 0)
    const hasAspects = totalPositive > 0 || totalNegative > 0

    // ── Drill-down helpers ──────────────────────────────────────────────────
    const goToCategory = (sentiment) => {
        setSelectedSentiment(sentiment)
        setDrillLevel('category')
    }

    const goToAspect = (categoryName) => {
        setSelectedCategory(categoryName)
        setDrillLevel('aspect')
    }

    const goBack = (toLevel) => {
        if (toLevel === 'sentiment') {
            setDrillLevel('sentiment')
            setSelectedSentiment(null)
            setSelectedCategory(null)
        } else if (toLevel === 'category') {
            setDrillLevel('category')
            setSelectedCategory(null)
        }
        setHoveredAspect(null)
    }

    const currentCategories = selectedSentiment === 'positive' ? positiveCategories : negativeCategories
    const currentAspects = selectedCategory
        ? (currentCategories.find(c => c.name === selectedCategory)?.aspects || [])
        : []

    // ── Colour helpers ──────────────────────────────────────────────────────
    const isPos = selectedSentiment === 'positive'
    const barColor   = isPos ? '#22c55e' : '#ef4444'
    const bgClass    = isPos ? 'bg-green-50'    : 'bg-red-50'
    const borderClass= isPos ? 'border-green-200': 'border-red-200'
    const textClass  = isPos ? 'text-green-700' : 'text-red-700'
    const dotClass   = isPos ? 'bg-green-500'   : 'bg-red-500'

    // ── Recharts custom tooltips ────────────────────────────────────────────
    const DrillTooltip = ({ active, payload }) => {
        if (!active || !payload?.length) return null
        return (
            <div className="bg-white px-3 py-2 rounded-lg shadow-lg border border-gray-200 text-sm">
                <p className="font-semibold text-gray-900">{payload[0].payload.name}</p>
                <p className="text-gray-600">{payload[0].value} mentions</p>
                <p className="text-xs text-blue-500 mt-1">Click to drill down →</p>
            </div>
        )
    }

    const AspectChartTooltip = ({ active, payload }) => {
        if (!active || !payload?.length) return null
        const a = payload[0].payload
        return (
            <div className="bg-white px-3 py-2 rounded-lg shadow-lg border border-gray-200 text-sm max-w-xs">
                <p className="font-semibold text-gray-900">{a.name}</p>
                <p className="text-gray-600">{a.count} mentions</p>
                {a.texts?.length > 0 && (
                    <div className="mt-2 border-t pt-2">
                        <p className="text-xs text-gray-500 font-medium mb-1">Customer said:</p>
                        {a.texts.slice(0, 2).map((t, i) => (
                            <p key={i} className="text-xs text-gray-700 italic">"{t}"</p>
                        ))}
                    </div>
                )}
            </div>
        )
    }

    // ── Shared layout wrapper ───────────────────────────────────────────────
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full my-4 max-h-[95vh] overflow-y-auto">

                {/* ── Header ── */}
                <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-100 sticky top-0 bg-white z-10 rounded-t-2xl">
                    <div>
                        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                            {emoji} {label} Analytics
                        </h2>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-xl font-bold text-yellow-500">{analytics.averageRating}</span>
                            <span className="text-sm text-gray-400">/ 5</span>
                            <span className="text-sm text-gray-500">
                                · {analytics.totalReviews} {analytics.totalReviews === 1 ? 'review' : 'reviews'}
                            </span>
                        </div>
                    </div>
                    <CloseBtn onClose={onClose} />
                </div>

                <div className="p-4 sm:p-6">

                    {/* ── No aspects yet ── */}
                    {!hasAspects && (
                        <div className="text-center py-12">
                            <span className="text-5xl">{emoji}</span>
                            <p className="mt-4 text-gray-500">
                                No {label.toLowerCase()} aspects extracted yet.
                            </p>
                            <p className="text-sm text-gray-400 mt-1">
                                Aspects appear once customers leave reviews.
                            </p>
                        </div>
                    )}

                    {hasAspects && (
                        <>
                            {/* ── Breadcrumb ── */}
                            {drillLevel !== 'sentiment' && (
                                <nav className="flex items-center gap-1.5 text-sm mb-4 flex-wrap">
                                    <button
                                        onClick={() => goBack('sentiment')}
                                        className="text-orange-600 hover:text-orange-700 font-medium"
                                    >
                                        Sentiment
                                    </button>
                                    <span className="text-gray-400">›</span>
                                    {drillLevel === 'category' && (
                                        <span className={`font-semibold capitalize ${isPos ? 'text-green-600' : 'text-red-600'}`}>
                                            {selectedSentiment}
                                        </span>
                                    )}
                                    {drillLevel === 'aspect' && (
                                        <>
                                            <button
                                                onClick={() => goBack('category')}
                                                className="text-orange-600 hover:text-orange-700 font-medium capitalize"
                                            >
                                                {selectedSentiment}
                                            </button>
                                            <span className="text-gray-400">›</span>
                                            <span className="font-semibold text-gray-800">{selectedCategory}</span>
                                        </>
                                    )}
                                </nav>
                            )}

                            {/* ════════════════════════════════════════════
                                LEVEL 1 — Sentiment overview
                            ════════════════════════════════════════════ */}
                            {drillLevel === 'sentiment' && (
                                <div className="space-y-5">
                                    <p className="text-sm text-gray-500">
                                        Click a bar or card to explore {label.toLowerCase()} feedback categories
                                    </p>

                                    {/* Summary cards */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <SentimentCard
                                            label="Positive"
                                            count={totalPositive}
                                            color="green"
                                            onClick={() => goToCategory('positive')}
                                        />
                                        <SentimentCard
                                            label="Negative"
                                            count={totalNegative}
                                            color="red"
                                            onClick={() => goToCategory('negative')}
                                        />
                                    </div>

                                    {/* Bar chart */}
                                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                                        <p className="text-sm font-semibold text-gray-700 mb-4">
                                            Sentiment Distribution
                                        </p>
                                        <ResponsiveContainer width="100%" height={200}>
                                            <BarChart
                                                data={[
                                                    { name: 'Positive', count: totalPositive, color: '#22c55e' },
                                                    { name: 'Negative', count: totalNegative, color: '#ef4444' },
                                                ]}
                                                margin={{ top: 18, right: 30, left: 0, bottom: 5 }}
                                            >
                                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                                                <XAxis
                                                    dataKey="name"
                                                    tick={{ fill: '#6b7280', fontSize: 13, fontWeight: 600 }}
                                                    axisLine={false} tickLine={false}
                                                />
                                                <YAxis
                                                    tick={{ fill: '#9ca3af', fontSize: 11 }}
                                                    axisLine={false} tickLine={false}
                                                    allowDecimals={false}
                                                />
                                                <Tooltip content={<DrillTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
                                                <Bar
                                                    dataKey="count"
                                                    radius={[8, 8, 0, 0]}
                                                    maxBarSize={80}
                                                    onClick={(d) => goToCategory(d.name.toLowerCase())}
                                                    style={{ cursor: 'pointer' }}
                                                    label={{ position: 'top', fill: '#374151', fontSize: 14, fontWeight: 700 }}
                                                >
                                                    {[
                                                        { name: 'Positive', count: totalPositive, color: '#22c55e' },
                                                        { name: 'Negative', count: totalNegative, color: '#ef4444' },
                                                    ].map((e, i) => <Cell key={i} fill={e.color} />)}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            )}

                            {/* ════════════════════════════════════════════
                                LEVEL 2 — Categories
                            ════════════════════════════════════════════ */}
                            {drillLevel === 'category' && (
                                <div className="space-y-4">
                                    <SentimentBanner
                                        sentiment={selectedSentiment}
                                        count={currentCategories.reduce((s, c) => s + c.count, 0)}
                                        bgClass={bgClass} borderClass={borderClass} textClass={textClass}
                                        onBack={() => goBack('sentiment')}
                                    />
                                    <p className="text-sm text-gray-500">Click a category to see specific aspects</p>

                                    {currentCategories.length > 0 ? (
                                        <div className="space-y-3">
                                            {currentCategories.map((cat, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => goToAspect(cat.name)}
                                                    className={`w-full text-left p-4 rounded-xl border-2 ${borderClass} ${bgClass} hover:shadow-md transition-all`}
                                                >
                                                    {/* Category name + count */}
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className={`text-sm font-bold ${textClass}`}>{cat.name}</span>
                                                        <span className={`text-lg font-bold ${textClass}`}>{cat.count}</span>
                                                    </div>

                                                    {/* Bar */}
                                                    <div className="w-full bg-white rounded-full h-2.5 mb-2 overflow-hidden">
                                                        <div
                                                            className="h-2.5 rounded-full transition-all"
                                                            style={{
                                                                width: `${Math.round((cat.count / currentCategories.reduce((s, c) => s + c.count, 0)) * 100)}%`,
                                                                backgroundColor: barColor
                                                            }}
                                                        />
                                                    </div>

                                                    {/* Aspect name tags on the bar */}
                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                        {cat.aspects.map((asp, ai) => (
                                                            <span
                                                                key={ai}
                                                                className="text-xs px-2 py-0.5 rounded-full bg-white border font-medium"
                                                                style={{ color: barColor, borderColor: barColor }}
                                                            >
                                                                {asp.name} ({asp.count})
                                                            </span>
                                                        ))}
                                                    </div>

                                                    <p className="text-xs text-gray-400 mt-2">Tap to see details →</p>
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <EmptyState label={`No ${selectedSentiment} ${label.toLowerCase()} categories found.`} />
                                    )}
                                </div>
                            )}

                            {/* ════════════════════════════════════════════
                                LEVEL 3 — Aspects + hover tooltip
                            ════════════════════════════════════════════ */}
                            {drillLevel === 'aspect' && (
                                <div className="space-y-4">
                                    <SentimentBanner
                                        sentiment={`${selectedCategory}`}
                                        count={currentAspects.reduce((s, a) => s + a.count, 0)}
                                        bgClass={bgClass} borderClass={borderClass} textClass={textClass}
                                        onBack={() => goBack('category')}
                                    />
                                    <p className="text-sm text-gray-500">
                                        Hover over an aspect card to see original customer quotes
                                    </p>

                                    {currentAspects.length > 0 ? (
                                        <>
                                            <HorizontalBarChart
                                                data={currentAspects}
                                                color={barColor}
                                                tooltip={<AspectChartTooltip />}
                                                yWidth={120}
                                            />
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                {currentAspects.map((aspect, i) => (
                                                    <div
                                                        key={i}
                                                        className={`relative p-3 rounded-xl border-2 ${borderClass} ${bgClass}`}
                                                        onMouseEnter={() => setHoveredAspect(aspect)}
                                                        onMouseLeave={() => setHoveredAspect(null)}
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2 min-w-0">
                                                                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${dotClass}`} />
                                                                <span className="text-sm font-medium text-gray-800 truncate">
                                                                    {aspect.name}
                                                                </span>
                                                            </div>
                                                            <span className={`text-lg font-bold flex-shrink-0 ml-2 ${textClass}`}>
                                                                {aspect.count}
                                                            </span>
                                                        </div>

                                                        {/* Hover tooltip — shows full review */}
                                                        {hoveredAspect?.name === aspect.name && aspect.texts?.length > 0 && (
                                                            <div className="absolute bottom-full left-0 mb-2 z-30 bg-gray-900 text-white rounded-xl p-3 shadow-2xl w-72 text-xs pointer-events-none">
                                                                <p className="font-semibold text-gray-300 mb-2">
                                                                    From review{aspect.texts.length > 1 ? 's' : ''}:
                                                                </p>
                                                                {aspect.texts.slice(0, 3).map((t, ti) => (
                                                                    <p key={ti} className="italic text-gray-100 mb-1.5 leading-relaxed border-l-2 border-orange-400 pl-2">
                                                                        "{t}"
                                                                    </p>
                                                                ))}
                                                                {aspect.texts.length > 3 && (
                                                                    <p className="text-gray-400 mt-1">
                                                                        +{aspect.texts.length - 3} more
                                                                    </p>
                                                                )}
                                                                <div className="absolute top-full left-5 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900" />
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    ) : (
                                        <EmptyState label={`No aspects found for ${selectedCategory}.`} />
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

// ── Small reusable sub-components ──────────────────────────────────────────

const CloseBtn = ({ onClose }) => (
    <button
        onClick={onClose}
        className="text-gray-400 hover:text-gray-600 transition-colors p-1 flex-shrink-0"
        aria-label="Close"
    >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
    </button>
)

const SentimentCard = ({ label, count, color, onClick }) => {
    const isGreen = color === 'green'
    return (
        <div
            onClick={onClick}
            className={`rounded-xl border-2 p-4 cursor-pointer hover:shadow-md transition-shadow ${
                isGreen ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
            }`}
        >
            <p className={`text-xs font-medium mb-1 ${isGreen ? 'text-green-700' : 'text-red-700'}`}>
                {label}
            </p>
            <p className={`text-3xl font-bold ${isGreen ? 'text-green-600' : 'text-red-600'}`}>
                {count}
            </p>
            <p className={`text-xs mt-1 ${isGreen ? 'text-green-600' : 'text-red-600'}`}>
                Tap to explore →
            </p>
        </div>
    )
}

const SentimentBanner = ({ sentiment, count, bgClass, borderClass, textClass, onBack }) => (
    <div className={`${bgClass} ${borderClass} border rounded-xl p-3 flex items-center justify-between`}>
        <span className={`text-sm font-semibold capitalize ${textClass}`}>
            {sentiment} — {count} mentions
        </span>
        <button
            onClick={onBack}
            className="text-xs text-gray-500 hover:text-gray-700 font-medium"
        >
            ← Back
        </button>
    </div>
)

const HorizontalBarChart = ({ data, color, tooltip, onClick, yWidth = 100 }) => (
    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
        <ResponsiveContainer width="100%" height={Math.max(160, data.length * 52)}>
            <BarChart
                data={data}
                layout="vertical"
                margin={{ top: 5, right: 50, left: 5, bottom: 5 }}
            >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                <XAxis
                    type="number"
                    tick={{ fill: '#9ca3af', fontSize: 11 }}
                    axisLine={false} tickLine={false}
                    allowDecimals={false}
                />
                <YAxis
                    dataKey="name"
                    type="category"
                    tick={{ fill: '#374151', fontSize: 12, fontWeight: 500 }}
                    axisLine={false} tickLine={false}
                    width={yWidth}
                />
                <Tooltip content={tooltip} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
                <Bar
                    dataKey="count"
                    fill={color}
                    radius={[0, 8, 8, 0]}
                    maxBarSize={32}
                    onClick={onClick}
                    style={{ cursor: onClick ? 'pointer' : 'default' }}
                    label={{ position: 'right', fill: '#374151', fontSize: 12, fontWeight: 700 }}
                />
            </BarChart>
        </ResponsiveContainer>
    </div>
)

const EmptyState = ({ label }) => (
    <div className="text-center py-10 text-gray-400">
        <p>{label}</p>
    </div>
)

export default AnalyticsOverview
