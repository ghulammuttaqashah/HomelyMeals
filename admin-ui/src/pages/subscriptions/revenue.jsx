import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import ProtectedLayout from '../../components/ProtectedLayout'
import Loader from '../../components/Loader'
import BackButton from '../../components/BackButton'
import { getSubscriptionRevenue } from '../../api/subscriptions'

const RevenuePage = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [summary, setSummary] = useState({
    totalRevenue: 0,
    totalSubscriptions: 0,
    todayRevenue: 0,
    todaySubscriptions: 0,
    monthRevenue: 0,
    monthSubscriptions: 0,
  })
  const [perPlan, setPerPlan] = useState([])
  const [periodFilter, setPeriodFilter] = useState('month')
  const [planSearch, setPlanSearch] = useState('')

  const formatCurrency = (value) => `Rs ${Number(value || 0).toLocaleString()}`

  const periodConfig = {
    today: {
      label: 'Today',
      revenue: summary.todayRevenue,
      subscriptions: summary.todaySubscriptions,
    },
    month: {
      label: 'This Month',
      revenue: summary.monthRevenue,
      subscriptions: summary.monthSubscriptions,
    },
    total: {
      label: 'Total',
      revenue: summary.totalRevenue,
      subscriptions: summary.totalSubscriptions,
    },
  }

  const filteredPerPlan = useMemo(() => {
    const search = planSearch.trim().toLowerCase()

    const rows = perPlan.filter((row) => {
      const name = String(row.planName || '').toLowerCase()
      return !search || name.includes(search)
    })

    return rows.sort((a, b) => Number(b.revenue || 0) - Number(a.revenue || 0))
  }, [perPlan, planSearch])

  const filteredRevenueTotal = useMemo(
    () => filteredPerPlan.reduce((sum, row) => sum + Number(row.revenue || 0), 0),
    [filteredPerPlan],
  )

  const fetchRevenue = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      const res = await getSubscriptionRevenue()
      setSummary(res.summary || summary)
      setPerPlan(res.perPlan || [])
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to load revenue data')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchRevenue()
  }, [])

  return (
    <ProtectedLayout title="Subscription Revenue">
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <BackButton onClick={() => navigate('/subscriptions')} />

            <div>
              <h3 className="text-lg font-bold text-gray-900">Revenue Overview</h3>
              <p className="text-sm text-gray-600">Live earnings from successful subscription purchases.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => fetchRevenue(true)}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {refreshing ? <Loader size="sm" /> : null}
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="mt-6 flex flex-col items-center justify-center py-20 bg-white rounded-lg border border-gray-100">
            <Loader size="lg" label="Loading Revenue Data" />
          </div>
        ) : (
          <>
            <div className="mt-6 rounded-lg border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-5">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-3">
                  <label htmlFor="periodFilter" className="text-sm font-semibold text-gray-700 whitespace-nowrap">Period:</label>
                  <select
                    id="periodFilter"
                    value={periodFilter}
                    onChange={(e) => setPeriodFilter(e.target.value)}
                    className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:border-gray-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all cursor-pointer"
                  >
                    <option value="today">Today</option>
                    <option value="month">This Month</option>
                    <option value="total">Overall Total</option>
                  </select>
                </div>
                
                <div className="flex-1 min-w-[250px]">
                  <input
                    type="text"
                    value={planSearch}
                    onChange={(e) => setPlanSearch(e.target.value)}
                    placeholder="Search by plan name..."
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm placeholder-gray-500 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                  />
                </div>
                
                {(planSearch || periodFilter !== 'month') && (
                  <button
                    type="button"
                    onClick={() => {
                      setPlanSearch('')
                      setPeriodFilter('month')
                    }}
                    className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors whitespace-nowrap"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Today</p>
                <p className="mt-2 text-2xl font-bold text-emerald-900">{formatCurrency(summary.todayRevenue)}</p>
                <p className="mt-1 text-sm text-emerald-700">{summary.todaySubscriptions} subscriptions</p>
              </div>
              <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-orange-700">This Month</p>
                <p className="mt-2 text-2xl font-bold text-orange-900">{formatCurrency(summary.monthRevenue)}</p>
                <p className="mt-1 text-sm text-orange-700">{summary.monthSubscriptions} subscriptions</p>
              </div>
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">Total</p>
                <p className="mt-2 text-2xl font-bold text-blue-900">{formatCurrency(summary.totalRevenue)}</p>
                <p className="mt-1 text-sm text-blue-700">{summary.totalSubscriptions} subscriptions</p>
              </div>
            </div>

            <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Selected Period</p>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-800">{periodConfig[periodFilter].label}</p>
                  <p className="text-xs text-gray-500">{periodConfig[periodFilter].subscriptions} subscriptions</p>
                </div>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(periodConfig[periodFilter].revenue)}</p>
              </div>
            </div>

            <div className="mt-8">
              <h4 className="text-sm font-semibold text-gray-800">Per Plan Breakdown</h4>
              <p className="mt-1 text-xs text-gray-500">
                Filtered plans: {filteredPerPlan.length} | Filtered revenue: {formatCurrency(filteredRevenueTotal)}
              </p>
              {filteredPerPlan.length === 0 ? (
                <p className="mt-2 text-sm text-gray-500">No revenue data available yet.</p>
              ) : (
                <div className="mt-3 overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                      <tr>
                        <th className="px-3 py-2">Plan</th>
                        <th className="px-3 py-2">Price</th>
                        <th className="px-3 py-2">Subscriptions</th>
                        <th className="px-3 py-2">Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredPerPlan.map((row) => (
                        <tr key={row.planId}>
                          <td className="px-3 py-2 font-medium text-gray-800">{row.planName || '-'}</td>
                          <td className="px-3 py-2 text-gray-700">{formatCurrency(row.planPrice)}</td>
                          <td className="px-3 py-2 text-gray-700">{row.subscriptions || 0}</td>
                          <td className="px-3 py-2 font-semibold text-gray-900">{formatCurrency(row.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </ProtectedLayout>
  )
}

export default RevenuePage
