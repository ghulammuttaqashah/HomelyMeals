import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
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
    // Don't trigger handler for signout endpoint or if already handling unauthorized
    const isSignoutEndpoint = error.config?.url?.includes('/signout')
    
    if (
      error.response?.status === 401 &&
      typeof unauthorizedHandler === 'function' &&
      !isSignoutEndpoint &&
      !isHandlingUnauthorized
    ) {
      isHandlingUnauthorized = true
      unauthorizedHandler()
      // Reset flag after a short delay to allow for navigation
      setTimeout(() => {
        isHandlingUnauthorized = false
      }, 1000)
    }
    return Promise.reject(error)
  },
)

export default api

