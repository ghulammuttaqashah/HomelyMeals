import { useLocation } from 'react-router-dom'
import ProgressBar from './ProgressBar'
import Header from './Header'
import Footer from './Footer'

const ProtectedLayout = ({ children, title }) => {
  const location = useLocation()

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <ProgressBar isLoading={false} />
      <Header showNav={true} />
      <main className="mx-auto flex-1 w-full max-w-7xl px-4 py-8 lg:px-6">
        {title && (
          <h2 className="mb-6 text-3xl font-bold text-orange-600">
            {title}
          </h2>
        )}
        <div key={location.pathname} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          {children}
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default ProtectedLayout
