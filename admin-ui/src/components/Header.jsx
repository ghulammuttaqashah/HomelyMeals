import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const navItems = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'Customers', path: '/customers' },
  { label: 'Cooks', path: '/cooks' },
]

const Header = ({ showNav = true }) => {
  const { logout } = useAuth()

  return (
    <header className="border-b border-slate-200/50 bg-white/80 backdrop-blur-sm shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 lg:px-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Admin Panel</p>
          <h1 className="text-xl font-bold text-slate-900">Homely Meals Admin</h1>
        </div>
        {showNav && (
          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  [
                    'rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-brand-100 text-brand-700 shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                  ].join(' ')
                }
              >
                {item.label}
              </NavLink>
            ))}
            <button
              type="button"
              onClick={logout}
              className="ml-2 rounded-lg border-2 border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-50 hover:shadow-sm"
            >
              Logout
            </button>
          </nav>
        )}
      </div>
    </header>
  )
}

export default Header

