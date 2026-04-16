import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 300000,
  headers: {
    'Content-Type': 'application/json'
  }
})

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken')
      localStorage.removeItem('req-app-auth')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const aiRequirementsAPI = {
  healthCheck: () => api.get('/ai-requirements/health'),
  analyze: (data: { requirement: string; [key: string]: any }) =>
    api.post('/ai-requirements/analyze', data)
}

export default api
