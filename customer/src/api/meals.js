import api from './axios'

export const getAllMeals = async () => {
  const { data } = await api.get('/api/customer/meals')
  return data
}
