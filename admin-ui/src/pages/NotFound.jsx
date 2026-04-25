import { useNavigate } from 'react-router-dom'
import { FiHome, FiArrowLeft, FiShield } from 'react-icons/fi'

const NotFound = () => {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
      <div className="max-w-md w-full text-center">
        {/* 404 Illustration */}
        <div className="mb-8">
          <div className="relative">
            <h1 className="text-9xl font-black text-slate-200 select-none">404</h1>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center">
                <FiShield className="w-10 h-10 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Message */}
        <div className="mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3">
            Page Not Found
          </h2>
          <p className="text-slate-600 text-sm sm:text-base">
            The admin page you're looking for doesn't exist or you don't have permission to access it.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-white text-slate-700 rounded-lg border-2 border-slate-300 hover:border-orange-500 hover:bg-slate-50 transition-all font-medium shadow-sm"
          >
            <FiArrowLeft className="w-5 h-5" />
            Go Back
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium shadow-lg"
          >
            <FiHome className="w-5 h-5" />
            Admin Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}

export default NotFound
