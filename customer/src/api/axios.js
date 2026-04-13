import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000',
  withCredentials: true,
})

let unauthorizedHandler = null
let isHandlingUnauthorized = false

export const setUnauthorizedHandler = (handler) => {
  unauthorizedHandler = handler
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isSignoutEndpoint = error.config?.url?.includes('/signout')
    const isAuthMeEndpoint = error.config?.url?.includes('/auth/me')
    
    // Silently handle expected 401 on /auth/me (checking if logged in)
    if (error.response?.status === 401 && isAuthMeEndpoint) {
      // This is expected when not logged in, silently reject without logging
      const silentError = new Error('Not authenticated')
      silentError.response = error.response
      silentError.config = error.config
      silentError.__EXPECTED_AUTH_ERROR__ = true
      return Promise.reject(silentError)
    }
    
    if (
      error.response?.status === 401 &&
      typeof unauthorizedHandler === 'function' &&
      !isSignoutEndpoint &&
      !isHandlingUnauthorized
    ) {
      isHandlingUnauthorized = true
      unauthorizedHandler()
      setTimeout(() => {
        isHandlingUnauthorized = false
      }, 1000)
    }
    return Promise.reject(error)
  },
)

export default api
