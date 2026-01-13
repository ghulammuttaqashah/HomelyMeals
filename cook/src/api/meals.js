import api from './axios'

export const addMeal = async (mealData) => {
  const { data } = await api.post('/api/cook/meals/add', mealData)
  return data
}

export const getMeals = async () => {
  const { data } = await api.get('/api/cook/meals/all')
  return data
}

export const updateMeal = async (mealId, mealData) => {
  const { data } = await api.put(`/api/cook/meals/update/${mealId}`, mealData)
  return data
}

export const deleteMeal = async (mealId) => {
  const { data } = await api.delete(`/api/cook/meals/delete/${mealId}`)
  return data
}
