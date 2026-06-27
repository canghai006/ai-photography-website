import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { User } from '../types/auth'

type AuthContextValue = {
  user: User | null
  loading: boolean
  login: (login: string, password: string) => Promise<void>
  register: (input: { username: string; displayName: string; email: string; password: string }) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

async function requestAuth(url: string, options?: RequestInit) {
  const response = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  })
  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.error || '操作失败，请稍后重试')
  }
  return response.status === 204 ? null : response.json()
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    requestAuth('/api/auth/me')
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    async login(login, password) {
      const data = await requestAuth('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ login, password }),
      })
      setUser(data.user)
    },
    async register(input) {
      const data = await requestAuth('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(input),
      })
      setUser(data.user)
    },
    async logout() {
      await requestAuth('/api/auth/logout', { method: 'POST' })
      setUser(null)
    },
  }), [user, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
