// App constants
export const APP_NAME = 'HomelyMeals'
export const APP_VERSION = '1.0.0'

// API endpoints (to be configured later)
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

// Routes
export const ROUTES = {
  HOME: '/',
  MEALS: '/meals',
  ABOUT: '/about',
  CONTACT: '/contact',
}

// Colors
export const COLORS = {
  PRIMARY: 'orange-600',
  SECONDARY: 'gray-600',
  SUCCESS: 'green-600',
  ERROR: 'red-600',
  WARNING: 'yellow-600',
}
