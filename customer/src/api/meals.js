import api from './axios'

export const getAllMeals = async () => {
  const { data } = await api.get('/api/customer/meals/')
  return data
}

export const checkDeliveryEligibility = async (mealId, customerLocation) => {
  const { data } = await api.post(`/api/customer/meals/${mealId}/check-delivery`, customerLocation)
  return data
}
