import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import ProtectedLayout from '../../components/ProtectedLayout'
import Loader from '../../components/Loader'
import { TableSkeleton } from '../../components/Skeleton'
import BackButton from '../../components/BackButton'
import { createPlan, deletePlan, getPlans, updatePlan } from '../../api/subscriptions'

const PLAN_PRESETS = {
  monthly: { label: '1 Month', name: 'Monthly', duration: 30, defaultPrice: 500 },
  quarter: { label: '3 Months', name: 'Quarterly', duration: 90, defaultPrice: 1400 },
  halfYear: { label: '6 Months', name: 'Semi-Annual', duration: 180, defaultPrice: 2600 },
  annual: { label: '12 Months', name: 'Annual', duration: 365, defaultPrice: 4800 },
}

const PRESET_STORAGE_KEY = 'admin.subscriptionPlanPresetPrices.v1'

const PlanManagementPage = () => {
  const navigate = useNavigate()
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [createForm, setCreateForm] = useState({ name: '', price: '', duration: '' })
  const [selectedPreset, setSelectedPreset] = useState('monthly')
  const [presetPrices, setPresetPrices] = useState(() => {
    try {
      const raw = localStorage.getItem(PRESET_STORAGE_KEY)
      const parsed = raw ? JSON.parse(raw) : {}
      return {
        monthly: Number(parsed.monthly || PLAN_PRESETS.monthly.defaultPrice),
        quarter: Number(parsed.quarter || PLAN_PRESETS.quarter.defaultPrice),
        halfYear: Number(parsed.halfYear || PLAN_PRESETS.halfYear.defaultPrice),
        annual: Number(parsed.annual || PLAN_PRESETS.annual.defaultPrice),
      }
    } catch {
      return {
        monthly: PLAN_PRESETS.monthly.defaultPrice,
        quarter: PLAN_PRESETS.quarter.defaultPrice,
        halfYear: PLAN_PRESETS.halfYear.defaultPrice,
        annual: PLAN_PRESETS.annual.defaultPrice,
      }
    }
  })
  const [editRows, setEditRows] = useState({})
  const [creatingPlan, setCreatingPlan] = useState(false)
  const [savingPlanId, setSavingPlanId] = useState('')
  const [deletingPlanId, setDeletingPlanId] = useState('')

  useEffect(() => {
    localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(presetPrices))
  }, [presetPrices])

  useEffect(() => {
    if (selectedPreset === 'custom') {
      setCreateForm({ name: '', price: '', duration: '' })
      return
    }

    const preset = PLAN_PRESETS[selectedPreset]
    if (!preset) return

    setCreateForm({
      name: preset.name,
      duration: String(preset.duration),
      price: String(presetPrices[selectedPreset] || preset.defaultPrice),
    })
  }, [selectedPreset, presetPrices])

  const fetchPlans = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      const res = await getPlans()
      const list = res.plans || []
      setPlans(list)
      setEditRows(
        list.reduce((acc, plan) => {
          acc[plan._id] = {
            name: plan.name,
            price: String(plan.price),
            duration: String(plan.duration),
            status: plan.status,
          }
          return acc
        }, {}),
      )
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to load plans')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchPlans()
  }, [])

  const handleCreatePlan = async (e) => {
    e.preventDefault()
    try {
      setCreatingPlan(true)
      const payload = {
        name: createForm.name.trim(),
        price: Number(createForm.price),
        duration: Number(createForm.duration),
      }

      if (!payload.name || payload.price <= 0 || payload.duration <= 0) {
        toast.error('Please enter valid plan details')
        return
      }

      await createPlan(payload)
      toast.success('Plan created successfully')
      setCreateForm({ name: '', price: '', duration: '' })
      await fetchPlans(true)
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to create plan')
    } finally {
      setCreatingPlan(false)
    }
  }

  const handleSavePlan = async (planId) => {
    const row = editRows[planId]
    if (!row) return

    try {
      setSavingPlanId(planId)
      const payload = {
        name: row.name.trim(),
        price: Number(row.price),
        duration: Number(row.duration),
        status: row.status,
      }

      if (!payload.name || payload.price <= 0 || payload.duration <= 0) {
        toast.error('Enter a valid name, price, and duration')
        return
      }

      await updatePlan(planId, payload)
      toast.success('Plan updated')
      await fetchPlans(true)
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to update plan')
    } finally {
      setSavingPlanId('')
    }
  }

  const handleDeletePlan = async (planId, planName) => {
    const confirmed = window.confirm(`Delete plan \"${planName}\"? This action cannot be undone.`)
    if (!confirmed) return

    try {
      setDeletingPlanId(planId)
      await deletePlan(planId)
      toast.success('Plan deleted')
      await fetchPlans(true)
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to delete plan')
    } finally {
      setDeletingPlanId('')
    }
  }

  return (
    <ProtectedLayout title="Plan Management">
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <BackButton onClick={() => navigate('/subscriptions')} />
            <p className="text-sm text-gray-600">Create and manage subscription plans.</p>
          </div>
          <button
            type="button"
            onClick={() => fetchPlans(true)}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {refreshing ? <Loader size="sm" /> : null}
            Refresh
          </button>
        </div>

        <form onSubmit={handleCreatePlan} className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
          <select
            value={selectedPreset}
            onChange={(e) => setSelectedPreset(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
          >
            <option value="monthly">1 Month (Monthly)</option>
            <option value="quarter">3 Months (Quarterly)</option>
            <option value="halfYear">6 Months (Semi-Annual)</option>
            <option value="annual">12 Months (Annual)</option>
            <option value="custom">Other (Custom)</option>
          </select>
          <input
            type="text"
            value={createForm.name}
            onChange={(e) => setCreateForm((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="Plan name"
            readOnly={selectedPreset !== 'custom'}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
          />
          <input
            type="number"
            min="1"
            value={createForm.price}
            onChange={(e) => setCreateForm((prev) => ({ ...prev, price: e.target.value }))}
            placeholder="Price"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
          />
          <input
            type="number"
            min="1"
            value={createForm.duration}
            onChange={(e) => setCreateForm((prev) => ({ ...prev, duration: e.target.value }))}
            placeholder="Duration (days)"
            readOnly={selectedPreset !== 'custom'}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={creatingPlan}
            className="sm:col-span-2 lg:col-span-4 xl:col-span-1 inline-flex items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {creatingPlan ? <Loader size="sm" /> : null}
            Create Plan
          </button>
        </form>

        <div className="mt-5 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <h4 className="text-sm font-semibold text-gray-800">Preset Price Settings</h4>
          <p className="mt-1 text-xs text-gray-600">Update default prices for quick plan creation presets.</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(PLAN_PRESETS).map(([key, preset]) => (
              <label key={key} className="rounded-lg border border-gray-200 bg-white p-3">
                <p className="text-xs font-semibold text-gray-700">{preset.label}</p>
                <p className="mt-0.5 text-xs text-gray-500">{preset.duration} days</p>
                <input
                  type="number"
                  min="1"
                  value={presetPrices[key]}
                  onChange={(e) =>
                    setPresetPrices((prev) => ({
                      ...prev,
                      [key]: Number(e.target.value || 0),
                    }))
                  }
                  className="mt-2 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                />
              </label>
            ))}
          </div>
        </div>

        <div className="relative mt-5 overflow-hidden rounded-lg">
          {/* Loading Overlay */}
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 backdrop-blur-[1.5px] transition-all">
              <Loader label="Loading Plans" />
            </div>
          )}

          <div className="overflow-x-auto">
            <table className={`w-full divide-y divide-gray-200 text-sm ${loading ? 'opacity-50' : ''}`} style={{minWidth: '600px'}}>
              <thead className="bg-gray-50 text-left text-xs uppercase font-black tracking-widest text-gray-500">
                <tr>
                  <th className="px-2 sm:px-3 py-3">Name</th>
                  <th className="px-2 sm:px-3 py-3">Price</th>
                  <th className="px-2 sm:px-3 py-3">Duration</th>
                  <th className="px-2 sm:px-3 py-3">Status</th>
                  <th className="px-2 sm:px-3 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {plans.length === 0 && !loading ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-10 text-center text-gray-500 italic">No plans found.</td>
                  </tr>
                ) : plans.length > 0 ? (
                  plans.map((plan) => {
                    const row = editRows[plan._id] || {}
                    return (
                      <tr key={plan._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-2 sm:px-3 py-3">
                          <input
                            type="text"
                            value={row.name || ''}
                            onChange={(e) =>
                              setEditRows((prev) => ({
                                ...prev,
                                [plan._id]: { ...prev[plan._id], name: e.target.value },
                              }))
                            }
                            className="w-full min-w-[100px] rounded-md border border-gray-300 px-2 sm:px-3 py-1.5 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all font-medium text-sm"
                          />
                        </td>
                        <td className="px-2 sm:px-3 py-3">
                          <input
                            type="number"
                            min="1"
                            value={row.price || ''}
                            onChange={(e) =>
                              setEditRows((prev) => ({
                                ...prev,
                                [plan._id]: { ...prev[plan._id], price: e.target.value },
                              }))
                            }
                            className="w-20 sm:w-24 rounded-md border border-gray-300 px-2 sm:px-3 py-1.5 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all font-medium text-sm"
                          />
                        </td>
                        <td className="px-2 sm:px-3 py-3">
                          <input
                            type="number"
                            min="1"
                            value={row.duration || ''}
                            onChange={(e) =>
                              setEditRows((prev) => ({
                                ...prev,
                                [plan._id]: { ...prev[plan._id], duration: e.target.value },
                              }))
                            }
                            className="w-20 sm:w-24 rounded-md border border-gray-300 px-2 sm:px-3 py-1.5 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all font-medium text-sm"
                          />
                        </td>
                        <td className="px-2 sm:px-3 py-3">
                          <select
                            value={row.status || 'active'}
                            onChange={(e) =>
                              setEditRows((prev) => ({
                                ...prev,
                                [plan._id]: { ...prev[plan._id], status: e.target.value },
                              }))
                            }
                            className="rounded-md border border-gray-300 px-2 sm:px-3 py-1.5 focus:border-orange-500 transition-all font-medium text-sm"
                          >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                          </select>
                        </td>
                        <td className="px-2 sm:px-3 py-3 text-right">
                          <div className="flex items-center justify-end gap-1 sm:gap-2">
                            <button
                              type="button"
                              onClick={() => handleSavePlan(plan._id)}
                              disabled={savingPlanId === plan._id || deletingPlanId === plan._id}
                              className="inline-flex items-center justify-center gap-1 sm:gap-2 rounded-lg bg-orange-600 px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-bold text-white hover:bg-orange-700 disabled:opacity-50 transition-all shadow-sm"
                            >
                              {savingPlanId === plan._id ? <Loader size="sm" /> : 'Save'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeletePlan(plan._id, row.name || plan.name)}
                              disabled={deletingPlanId === plan._id || savingPlanId === plan._id}
                              className="inline-flex items-center justify-center gap-1 sm:gap-2 rounded-lg border border-red-200 bg-red-50 px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-bold text-red-700 hover:bg-red-100 disabled:opacity-50 transition-all"
                            >
                              {deletingPlanId === plan._id ? <Loader size="sm" /> : 'Delete'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  [...Array(5)].map((_, i) => (
                    <tr key={i} className="invisible pointer-events-none">
                      <td colSpan={5} className="px-3 py-3">&nbsp;</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </ProtectedLayout>
  )
}

export default PlanManagementPage
