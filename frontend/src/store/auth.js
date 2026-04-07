import { create } from 'zustand'
import api from '../lib/api'

function safeParse(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback }
  catch { localStorage.removeItem(key); return fallback }
}

const useAuthStore = create((set, get) => ({
  token: localStorage.getItem('expediente_token') || null,
  user: safeParse('expediente_user', null),
  permissions: safeParse('expediente_permissions', {}),

  login: async (correo, password) => {
    const { data } = await api.post('/auth/login', { correo, password })
    localStorage.setItem('expediente_token', data.access_token)
    localStorage.setItem('expediente_user', JSON.stringify(data.user))
    localStorage.setItem('expediente_permissions', JSON.stringify(data.permissions))
    set({ token: data.access_token, user: data.user, permissions: data.permissions })
    return data
  },

  logout: () => {
    localStorage.removeItem('expediente_token')
    localStorage.removeItem('expediente_user')
    localStorage.removeItem('expediente_permissions')
    set({ token: null, user: null, permissions: {} })
  },

  isAuthenticated: () => !!get().token,

  hasPermission: (modulo, tipo = 'lectura') => {
    const perms = get().permissions
    if (!perms || !perms[modulo]) return false
    return !!perms[modulo][tipo]
  },
}))

export default useAuthStore
