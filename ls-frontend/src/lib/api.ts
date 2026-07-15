import axios from 'axios'
import Cookies from 'js-cookie'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
  withCredentials: true, // envoie/reçoit les cookies httpOnly d'auth (même origine)
})

// Auto refresh on 401 — le refreshToken httpOnly part automatiquement (cookie).
// On n'intercepte pas les 401 des routes /auth/* (ex. mauvais identifiants au login).
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    const isAuthRoute = original?.url?.includes('/auth/')
    if (error.response?.status === 401 && !original._retry && !isAuthRoute) {
      original._retry = true
      try {
        await axios.post(`${API_URL}/auth/refresh`, {}, { withCredentials: true })
        return api(original) // le nouveau cookie httpOnly est déjà posé par le backend
      } catch {
        clearTokens()
        if (typeof window !== 'undefined') {
          window.location.href = '/auth/login'
        }
      }
    }
    return Promise.reject(error)
  }
)

// Les tokens sont désormais posés en cookies httpOnly par le backend
// (login/register/refresh). setTokens devient un no-op, conservé pour compat d'appel.
export const setTokens = (_accessToken?: string, _refreshToken?: string) => {}

// Purge d'éventuels cookies JS hérités. Les cookies httpOnly, eux, sont effacés
// côté serveur par POST /auth/logout (cf. auth.store.logout).
export const clearTokens = () => {
  Cookies.remove('accessToken')
  Cookies.remove('refreshToken')
}

export default api
