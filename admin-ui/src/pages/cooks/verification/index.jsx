import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import ProtectedLayout from '../../../components/ProtectedLayout'
import Loader from '../../../components/Loader'
import BackButton from '../../../components/BackButton'
import { getSubmittedCookDocuments } from '../../../api/cookDocuments'

// Backend returns: { cooks: [{ cook: {...}, documents: {...} }] }
const getCookIdentifier = (item) => item?.cook?.id ?? item?.cook?._id ?? item?.cookId ?? item?.id

const getCookName = (item) => item?.cook?.name ?? 'Unnamed Cook'

const getCookEmail = (item) => item?.cook?.email ?? 'N/A'

const getVerificationStatus = (item) => item?.cook?.verificationStatus ?? 'pending'

const VerificationList = () => {
  const navigate = useNavigate()
  const [cooks, setCooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchSubmitted = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getSubmittedCookDocuments()
      const list = Array.isArray(data) ? data : data?.cooks || []
      setCooks(list)
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to load submitted cooks'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSubmitted()
  }, [])

  return (
    <ProtectedLayout title="Cook Document Verification">
      <div className="rounded-lg bg-white shadow-sm border border-gray-200">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <BackButton onClick={() => navigate('/cooks')} />
            <div>
              <h3 className="text-base font-semibold text-slate-900">Submitted Cooks</h3>
              <p className="text-sm text-slate-500">Review pending document submissions</p>
            </div>
          </div>
          <button
            type="button"
            onClick={fetchSubmitted}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader size="sm" />
                Refreshing...
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </>
            )}
          </button>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader size="lg" />
          </div>
        ) : error ? (
          <div className="px-6 py-16 text-center">
            <p className="text-sm font-semibold text-slate-900">Unable to fetch submitted cooks.</p>
            <p className="mt-1 text-xs text-slate-500">{error}</p>
          </div>
        ) : cooks.length ? (
          <div className="grid gap-4 px-6 py-6 md:grid-cols-2">
            {cooks.map((item, idx) => {
              const cookId = getCookIdentifier(item)
              const cookName = getCookName(item)
              const cookEmail = getCookEmail(item)
              const status = getVerificationStatus(item)
              return (
              <div
                key={cookId || idx}
                className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div>
                      <p className="text-base font-semibold text-slate-900">{cookName}</p>
                      <p className="text-sm text-slate-500">{cookEmail}</p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        status === 'approved'
                          ? 'bg-emerald-50 text-emerald-600'
                          : status === 'rejected'
                            ? 'bg-red-50 text-red-600'
                            : 'bg-amber-50 text-amber-600'
                    }`}
                  >
                      {status}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => cookId && navigate(`/cooks/verification/${cookId}`)}
                  disabled={!cookId}
                  className="mt-6 w-full rounded-lg bg-orange-600 py-2.5 text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                >
                  View Documents
                </button>
              </div>
            )})}
          </div>
        ) : (
          <div className="px-6 py-16 text-center">
            <p className="text-sm font-semibold text-slate-900">No submissions yet.</p>
            <p className="mt-1 text-xs text-slate-500">When cooks upload their documents, you'll see them here.</p>
          </div>
        )}
      </div>
    </ProtectedLayout>
  )
}

export default VerificationList

