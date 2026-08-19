import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { httpClient } from '../lib/http/httpClient'
import type { User } from '../types'

interface AuthContextValue {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, nickname: string, password: string) => Promise<void>
  logout: () => Promise<void>
  updateProfile: (updates: { name?: string; nickname?: string }) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    httpClient
      .get<{ user: User }>('/api/me')
      .then((res) => setUser(res.data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  async function login(email: string, password: string) {
    const res = await httpClient.post<{ user: User }>('/api/login', { email, password })
    setUser(res.data.user)
  }

  async function register(name: string, email: string, nickname: string, password: string) {
    await httpClient.post('/api/register', { name, email, nickname, password })
    await login(email, password)
  }

  async function logout() {
    await httpClient.post('/api/logout')
    setUser(null)
  }

  async function updateProfile(updates: { name?: string; nickname?: string }) {
    const res = await httpClient.put<{ user: User }>('/api/me', updates)
    setUser(res.data.user)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
