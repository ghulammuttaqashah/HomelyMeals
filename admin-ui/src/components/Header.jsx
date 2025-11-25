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
    <header className="border-b border-gray-200 bg-white shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 lg:px-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Admin Panel</p>
          <h1 className="text-xl font-bold text-orange-600">Homely Meals Admin</h1>
        </div>
        {showNav && (
          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  [
                    'rounded-lg px-4 py-2 text-sm font-medium',
                    isActive
                      ? 'bg-orange-100 text-orange-700 shadow-sm'
                      : 'text-gray-600',
                  ].join(' ')
                }
              >
                {item.label}
              </NavLink>
            ))}
            <button
              type="button"
              onClick={logout}
              className="ml-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm"
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

