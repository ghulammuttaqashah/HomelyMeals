import api from './axios'

// Get all cooks (with optional search by meal name and city filter)
export const getAllCooks = async (search = '', city = '') => {
  const params = {}
  if (search) params.search = search
  if (city) params.city = city
  const { data } = await api.get('/api/customer/meals/cooks', { params })
  return data
}

// Get meals by cook ID
export const getMealsByCookId = async (cookId) => {
  const { data } = await api.get(`/api/customer/meals/cook/${cookId}`)
  return data
}

// Get all meals (kept for backward compatibility)
export const getAllMeals = async () => {
  const { data } = await api.get('/api/customer/meals/')
  return data
}

export const checkDeliveryEligibility = async (mealId, customerLocation) => {
  const { data } = await api.post(`/api/customer/meals/${mealId}/check-delivery`, customerLocation)
  return data
}

// Get cook delivery info (location + maxDeliveryDistance)
export const getCookDeliveryInfo = async (cookId) => {
  const { data } = await api.get(`/api/customer/meals/cook/${cookId}/delivery-info`);
  return data
}

// Get delivery charge settings
export const getDeliverySettings = async () => {
  const { data } = await api.get('/api/customer/meals/delivery-settings');
  return data
}

// Get top selling meals for a cook
export const getTopSellingMeals = async (cookId) => {
  const { data } = await api.get(`/api/customer/meals/cook/${cookId}/top-selling`)
  return data
}
