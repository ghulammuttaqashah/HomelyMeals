import api from './axios'

export const addMeal = async (mealData) => {
  const { data } = await api.post('/api/cook/meals/add', mealData)
  return data
}

export const getMeals = async () => {
  const { data } = await api.get('/api/cook/meals/all')
  return data
}
