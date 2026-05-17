import axios from "axios"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8002"

const api = axios.create({
  baseURL: API_URL,
})

api.interceptors.request.use((config) => {
  if (!config.headers.Authorization) {
    const token = localStorage.getItem("token")
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }
  return config
})

export default api