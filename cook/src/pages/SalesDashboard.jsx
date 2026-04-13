import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, ComposedChart, Line
} from 'recharts'
import { getSalesAnalytics } from '../api/sales'
import { FiArrowLeft } from 'react-icons/fi'
import Header from '../components/Header'
import Footer from '../components/Footer'
import Loader from '../components/Loader'

const periods = [
    { key: 'daily', label: 'Daily', description: 'Last 30 days' },
    { key: 'weekly', label: 'Weekly', description: 'Last 12 weeks' },
    { key: 'monthly', label: 'Monthly', description: 'Last 12 months' },
    { key: 'yearly', label: 'Yearly', description: 'All time' },
]

const formatCurrency = (value) => {
    if (value >= 100000) return `Rs ${(value / 1000).toFixed(0)}k`
    if (value >= 1000) return `Rs ${(value / 1000).toFixed(1)}k`
    return `Rs ${value}`
}

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-xl">
            <p className="mb-2 text-sm font-bold text-gray-900 border-b border-gray-100 pb-2">{label}</p>
            {payload.map((item, i) => (
                <div key={i} className="flex items-center gap-2 py-0.5">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-xs text-gray-600">{item.name}:</span>
                    <span className="text-xs font-bold text-gray-900">
                        {item.name === 'Revenue (Rs)' ? `Rs ${item.value.toLocaleString()}` : item.value}
                    </span>
                </div>
            ))}
        </div>
    )
}

const SalesDashboard = () => {
    const navigate = useNavigate()
    const [period, setPeriod] = useState('monthly')
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)

    const currentPeriod = periods.find(p => p.key === period)

    const fetchData = useCallback(async () => {
        try {
            setLoading(true)
            const result = await getSalesAnalytics(period)
            setData(result)
        } catch (error) {
            console.error('Failed to fetch sales data:', error)
            toast.error('Failed to load sales data')
        } finally {
            setLoading(false)
        }
    }, [period])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    return (
        <div className="flex min-h-screen flex-col bg-gray-50">
            <Header showSignOut={true} />

            <main className="flex-1">
                <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 py-6 sm:py-8">
                    {/* Page Header */}
                    <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                        <div>
                            <button
                                onClick={() => navigate('/dashboard')}
                                className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-orange-600 transition-colors"
                            >
                                <FiArrowLeft className="w-4 h-4" />
                                Back to Dashboard
                            </button>
                            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Sales Analytics</h1>
                            <p className="text-xs sm:text-sm text-gray-500 mt-1">
                                {currentPeriod.description} &middot; Track your revenue and order trends
                            </p>
                        </div>

                        {/* Period Selector */}
                        <div className="flex rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
                            {periods.map((p) => (
                                <button
                                    key={p.key}
                                    onClick={() => setPeriod(p.key)}
                                    className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${period === p.key
                                        ? 'bg-orange-500 text-white shadow-sm'
                                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                        }`}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {loading ? (
                        <div className="rounded-lg border border-gray-200 bg-white py-16 shadow-sm">
                            <div className="flex flex-col items-center gap-3">
                                <Loader size="lg" />
                                <p className="text-sm font-medium text-gray-600">Loading sales analytics...</p>
                            </div>
                        </div>
                    ) : !data ? (
                        <div className="rounded-lg bg-white p-12 text-center shadow-sm border border-gray-200">
                            <p className="text-gray-500">No data available</p>
                        </div>
                    ) : (
                        <>
                            {/* Summary Cards — period-specific */}
                            <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 p-5 shadow-md text-white">
                                    <div className="flex items-center justify-between mb-3">
                                        <p className="text-xs font-medium text-orange-100 uppercase tracking-wider">
                                            Total Revenue
                                        </p>
                                        <div className="rounded-lg bg-white/20 p-1.5">
                                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                    </div>
                                    <p className="text-2xl sm:text-3xl font-bold">
                                        Rs {data.summary.totalRevenue.toLocaleString()}
                                    </p>
                                    <p className="text-xs text-orange-100 mt-1">{currentPeriod.description}</p>
                                </div>

                                <div className="rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 p-5 shadow-md text-white">
                                    <div className="flex items-center justify-between mb-3">
                                        <p className="text-xs font-medium text-purple-100 uppercase tracking-wider">
                                            Total Orders
                                        </p>
                                        <div className="rounded-lg bg-white/20 p-1.5">
                                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                            </svg>
                                        </div>
                                    </div>
                                    <p className="text-2xl sm:text-3xl font-bold">
                                        {data.summary.totalOrders.toLocaleString()}
                                    </p>
                                    <p className="text-xs text-purple-100 mt-1">{currentPeriod.description}</p>
                                </div>

                                <div className="rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 p-5 shadow-md text-white">
                                    <div className="flex items-center justify-between mb-3">
                                        <p className="text-xs font-medium text-amber-100 uppercase tracking-wider">
                                            Avg Order Value
                                        </p>
                                        <div className="rounded-lg bg-white/20 p-1.5">
                                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                            </svg>
                                        </div>
                                    </div>
                                    <p className="text-2xl sm:text-3xl font-bold">
                                        Rs {data.summary.averageOrderValue.toLocaleString()}
                                    </p>
                                    <p className="text-xs text-amber-100 mt-1">Per delivered order</p>
                                </div>
                            </div>

                            {/* Revenue & Orders Chart — combined bar + line */}
                            <div className="mb-6 rounded-xl bg-white p-4 sm:p-6 shadow-sm border border-gray-200">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-5 gap-2">
                                    <div>
                                        <h2 className="text-base sm:text-lg font-semibold text-gray-900">Revenue & Orders Over Time</h2>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            Bars show revenue in Rs &middot; Line shows number of orders
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-4 text-xs">
                                        <div className="flex items-center gap-1.5">
                                            <span className="h-3 w-3 rounded-sm bg-orange-500" />
                                            <span className="text-gray-600">Revenue (Rs)</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <span className="h-0.5 w-4 bg-purple-500 rounded" />
                                            <span className="text-gray-600">Orders</span>
                                        </div>
                                    </div>
                                </div>
                                {data.chartData.length > 0 ? (
                                    <div className="h-72 sm:h-80">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <ComposedChart data={data.chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                                                <defs>
                                                    <linearGradient id="revenueBarGradient" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="0%" stopColor="#f97316" stopOpacity={0.9} />
                                                        <stop offset="100%" stopColor="#fb923c" stopOpacity={0.6} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                                                <XAxis
                                                    dataKey="label"
                                                    tick={{ fontSize: 11, fill: '#6b7280' }}
                                                    tickLine={false}
                                                    axisLine={{ stroke: '#e5e7eb' }}
                                                    label={{
                                                        value: period === 'daily' ? 'Date' : period === 'weekly' ? 'Week' : period === 'monthly' ? 'Month' : 'Year',
                                                        position: 'insideBottom',
                                                        offset: -2,
                                                        style: { fontSize: 11, fill: '#9ca3af', fontWeight: 500 }
                                                    }}
                                                />
                                                <YAxis
                                                    yAxisId="revenue"
                                                    orientation="left"
                                                    tickFormatter={formatCurrency}
                                                    tick={{ fontSize: 10, fill: '#f97316' }}
                                                    tickLine={false}
                                                    axisLine={false}
                                                    label={{
                                                        value: 'Revenue (Rs)',
                                                        angle: -90,
                                                        position: 'insideLeft',
                                                        offset: 10,
                                                        style: { fontSize: 10, fill: '#f97316', fontWeight: 500 }
                                                    }}
                                                />
                                                <YAxis
                                                    yAxisId="orders"
                                                    orientation="right"
                                                    allowDecimals={false}
                                                    tick={{ fontSize: 10, fill: '#8b5cf6' }}
                                                    tickLine={false}
                                                    axisLine={false}
                                                    label={{
                                                        value: 'Orders',
                                                        angle: 90,
                                                        position: 'insideRight',
                                                        offset: 10,
                                                        style: { fontSize: 10, fill: '#8b5cf6', fontWeight: 500 }
                                                    }}
                                                />
                                                <Tooltip content={<CustomTooltip />} />
                                                <Bar
                                                    yAxisId="revenue"
                                                    dataKey="revenue"
                                                    name="Revenue (Rs)"
                                                    fill="url(#revenueBarGradient)"
                                                    radius={[4, 4, 0, 0]}
                                                    maxBarSize={40}
                                                />
                                                <Line
                                                    yAxisId="orders"
                                                    type="monotone"
                                                    dataKey="orders"
                                                    name="Orders"
                                                    stroke="#8b5cf6"
                                                    strokeWidth={2.5}
                                                    dot={{ r: 4, fill: '#8b5cf6', stroke: '#fff', strokeWidth: 2 }}
                                                    activeDot={{ r: 6, fill: '#8b5cf6', stroke: '#fff', strokeWidth: 2 }}
                                                />
                                            </ComposedChart>
                                        </ResponsiveContainer>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center h-64 text-gray-400">
                                        <div className="text-center">
                                            <svg className="mx-auto h-12 w-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                            </svg>
                                            <p className="text-sm font-medium">No sales data for this period</p>
                                            <p className="text-xs mt-1">Complete orders to see your analytics here</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Top Selling Meals */}
                            <div className="rounded-xl bg-white p-4 sm:p-6 shadow-sm border border-gray-200">
                                <div className="mb-4">
                                    <h2 className="text-base sm:text-lg font-semibold text-gray-900">Top Selling Meals</h2>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        Your best-performing meals by quantity sold &middot; {currentPeriod.description}
                                    </p>
                                </div>
                                {data.topMeals.length > 0 ? (
                                    <div className="space-y-4">
                                        {data.topMeals.map((meal, index) => {
                                            const maxQty = data.topMeals[0].quantity
                                            const percentage = maxQty > 0 ? (meal.quantity / maxQty) * 100 : 0
                                            const colors = [
                                                'bg-orange-500', 'bg-amber-500', 'bg-yellow-500', 'bg-green-500', 'bg-teal-500'
                                            ]
                                            return (
                                                <div key={meal.name}>
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div className="flex items-center gap-3">
                                                            <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white ${colors[index]}`}>
                                                                {index + 1}
                                                            </span>
                                                            <span className="text-sm font-medium text-gray-900">{meal.name}</span>
                                                        </div>
                                                        <div className="flex items-center gap-4">
                                                            <span className="text-xs text-gray-500">
                                                                <span className="font-semibold text-gray-700">{meal.quantity}</span> sold
                                                            </span>
                                                            <span className="text-sm font-bold text-gray-900 min-w-[80px] text-right">
                                                                Rs {meal.revenue.toLocaleString()}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="ml-10 h-2.5 rounded-full bg-gray-100 overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full ${colors[index]} transition-all duration-700 ease-out`}
                                                            style={{ width: `${percentage}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center h-32 text-gray-400">
                                        <div className="text-center">
                                            <p className="text-sm font-medium">No meal data available</p>
                                            <p className="text-xs mt-1">Deliver orders to see your top meals here</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </main>

            <Footer />
        </div>
    )
}

export default SalesDashboard
