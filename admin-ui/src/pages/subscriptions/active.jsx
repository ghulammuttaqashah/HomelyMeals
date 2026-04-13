import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import ProtectedLayout from '../../components/ProtectedLayout'
import Loader from '../../components/Loader'
import { TableSkeleton } from '../../components/Skeleton'
import BackButton from '../../components/BackButton'
import { getPlans, getSubscriptions } from '../../api/subscriptions'

const ActiveSubscriptionsPage = () => {
  const navigate = useNavigate()
  const [plans, setPlans] = useState([])
  const [subscriptions, setSubscriptions] = useState([])
  const [loadingPlans, setLoadingPlans] = useState(true)
  const [loadingSubscriptions, setLoadingSubscriptions] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [applyingFilters, setApplyingFilters] = useState(false)

  const [filters, setFilters] = useState({
    plan: '',
    status: '',
    search: '',
  })

  const statusOptions = useMemo(
    () => [
      { value: '', label: 'All Statuses' },
      { value: 'active', label: 'Active' },
      { value: 'expired', label: 'Expired' },
      { value: 'pending', label: 'Pending' },
    ],
    [],
  )

  const getSubscriptionStatusClass = (status) => {
    if (status === 'active') return 'bg-green-50 text-green-700 border-green-200'
    if (status === 'pending') return 'bg-amber-50 text-amber-700 border-amber-200'
    return 'bg-red-50 text-red-700 border-red-200'
  }

  const fetchPlans = async () => {
    try {
      setLoadingPlans(true)
      const res = await getPlans()
      setPlans(res.plans || [])
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to load plans')
    } finally {
      setLoadingPlans(false)
    }
  }

  const fetchSubscriptions = async (query = filters) => {
    try {
      setLoadingSubscriptions(true)
      const params = {}
      if (query.plan) params.plan = query.plan
      if (query.status) params.status = query.status
      if (query.search.trim()) params.search = query.search.trim()

      const res = await getSubscriptions(params)
      setSubscriptions(res.subscriptions || [])
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to load subscriptions')
    } finally {
      setLoadingSubscriptions(false)
    }
  }

  useEffect(() => {
    fetchPlans()
    fetchSubscriptions()
  }, [])

  const handleFilterSubmit = async (e) => {
    e.preventDefault()
    try {
      setApplyingFilters(true)
      await fetchSubscriptions(filters)
    } finally {
      setApplyingFilters(false)
    }
  }

  const handleClearFilters = async () => {
    const cleared = { plan: '', status: '', search: '' }
    setFilters(cleared)
    try {
      setApplyingFilters(true)
      await fetchSubscriptions(cleared)
    } finally {
      setApplyingFilters(false)
    }
  }

  const handleRefreshAll = async () => {
    try {
      setRefreshing(true)
      await Promise.all([fetchPlans(), fetchSubscriptions()])
      toast.success('Subscriptions refreshed')
    } catch {
      // errors handled in fetch functions
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <ProtectedLayout title="Active Subscriptions">
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <BackButton onClick={() => navigate('/subscriptions')} />
            <p className="text-sm text-gray-600">Monitor and filter cook subscriptions.</p>
          </div>
          <button
            type="button"
            onClick={handleRefreshAll}
            disabled={refreshing || loadingPlans || loadingSubscriptions}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {refreshing ? <Loader size="sm" /> : null}
            Refresh
          </button>
        </div>

        {/* Filters Section */}
        <form onSubmit={handleFilterSubmit} className="mt-6 rounded-lg border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-5">
          <div className="grid gap-4 md:grid-cols-12">
            <div className="md:col-span-3">
              <label htmlFor="filterPlan" className="mb-2 block text-sm font-semibold text-gray-700">Plan</label>
              <select
                id="filterPlan"
                value={filters.plan}
                onChange={(e) => setFilters((prev) => ({ ...prev, plan: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all cursor-pointer"
                disabled={loadingPlans}
              >
                <option value="">All Plans</option>
                {plans.map((plan) => (
                  <option key={plan._id} value={plan._id}>
                    {plan.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-3">
              <label htmlFor="filterStatus" className="mb-2 block text-sm font-semibold text-gray-700">Status</label>
              <select
                id="filterStatus"
                value={filters.status}
                onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all cursor-pointer"
              >
                {statusOptions.map((item) => (
                  <option key={item.value || 'all'} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-3">
              <label htmlFor="filterSearch" className="mb-2 block text-sm font-semibold text-gray-700">Search</label>
              <input
                id="filterSearch"
                type="text"
                value={filters.search}
                onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                placeholder="Search cook name or ID..."
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm placeholder-gray-500 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
              />
            </div>

            <div className="md:col-span-3 flex items-end">
              <button
                type="submit"
                disabled={applyingFilters}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
              >
                {applyingFilters ? <Loader size="sm" /> : null}
                Apply Filters
              </button>
            </div>
          </div>

          {(filters.plan || filters.status || filters.search) && (
            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                onClick={handleClearFilters}
                disabled={applyingFilters}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
              >
                Clear Filters
              </button>
              <span className="text-xs font-medium text-gray-500">
                {subscriptions.length} subscription{subscriptions.length !== 1 ? 's' : ''} found
              </span>
            </div>
          )}
        </form>
        {/* End Filters Section */}

        {/* Table Section */}
        <div className="relative mt-6">
          {loadingSubscriptions && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-white/70 backdrop-blur-[1.5px] transition-all">
              <Loader label="Loading Subscriptions" />
            </div>
          )}
          {subscriptions.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">No subscriptions match the selected filters.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-3 py-2">Cook ID</th>
                    <th className="px-3 py-2">Cook Name</th>
                    <th className="px-3 py-2">Plan</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Start Date</th>
                    <th className="px-3 py-2">End Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {subscriptions.map((item) => (
                    <tr key={item._id}>
                      <td className="px-3 py-2 text-xs text-gray-700">{item.cook?._id || '-'}</td>
                      <td className="px-3 py-2">{item.cook?.name || '-'}</td>
                      <td className="px-3 py-2">{item.plan?.name || '-'}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-semibold capitalize ${getSubscriptionStatusClass(item.status)}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-3 py-2">{item.start_date ? new Date(item.start_date).toLocaleDateString() : '-'}</td>
                      <td className="px-3 py-2">{item.end_date ? new Date(item.end_date).toLocaleDateString() : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {/* End Table Section */}
      </div>
    </ProtectedLayout>
  )
}

export default ActiveSubscriptionsPage
