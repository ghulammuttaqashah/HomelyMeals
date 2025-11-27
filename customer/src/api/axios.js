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
