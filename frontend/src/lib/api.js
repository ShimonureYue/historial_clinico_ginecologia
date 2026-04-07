import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.DEV
    ? `http://localhost:${import.meta.env.VITE_API_PORT ?? 8000}/api`
    : '/api',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('expediente_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('expediente_token')
      localStorage.removeItem('expediente_user')
      localStorage.removeItem('expediente_permissions')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
