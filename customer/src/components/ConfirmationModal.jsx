import { FiAlertTriangle } from 'react-icons/fi'

const ConfirmationModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = 'Confirm', 
  cancelText = 'Cancel',
  type = 'warning' 
}) => {
  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose} 
      />

      {/* Modal wrapper */}
      <div className="fixed inset-0 z-[101] flex items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
          <div className="flex flex-col items-center text-center">
            {/* Icon */}
            <div className={`mb-4 flex h-14 w-14 items-center justify-center rounded-full ${
              type === 'danger' ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600'
            }`}>
              <FiAlertTriangle className="h-7 w-7" />
            </div>

            {/* Title & Message */}
            <h3 className="mb-2 text-xl font-bold text-gray-900">{title}</h3>
            <p className="mb-8 text-sm leading-relaxed text-gray-600">
              {message}
            </p>

            {/* Actions */}
            <div className="flex w-full flex-col gap-3 sm:flex-row">
              <button
                onClick={onClose}
                className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 active:bg-gray-100"
              >
                {cancelText}
              </button>
              <button
                onClick={() => {
                  onConfirm()
                  onClose()
                }}
                className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-200 transition-all active:scale-95 ${
                  type === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-600 hover:bg-orange-700'
                }`}
              >
                {confirmText}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default ConfirmationModal
