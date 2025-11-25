import Loader from './Loader'

const SuspensionModal = ({ isOpen, entityName, entityType = 'entity', reason, onReasonChange, onConfirm, onCancel, isSubmitting }) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-200/50 animate-in zoom-in-95 duration-200">
        <h3 className="text-lg font-bold text-slate-900">Suspend {entityType}</h3>
        <p className="mt-2 text-sm text-slate-600">
          Please provide a reason for suspending <span className="font-medium text-slate-900">{entityName}</span>.
        </p>
        <textarea
          value={reason}
          onChange={(e) => onReasonChange(e.target.value)}
          rows={4}
          className="mt-4 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
          placeholder="Add suspension reason..."
        />
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!reason.trim() || isSubmitting}
            className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <Loader size="sm" className="text-white" />
                Processing…
              </span>
            ) : (
              'Suspend'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default SuspensionModal
