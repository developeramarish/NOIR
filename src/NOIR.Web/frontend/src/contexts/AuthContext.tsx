import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { getCurrentUser, logout as logoutApi } from '@/services/auth'
import { useBroadcastChannel } from '@/hooks/useBroadcastChannel'
import type { CurrentUser } from '@/types'

type AuthBroadcastMessage = { type: 'logout' }

interface AuthContextValue {
  user: CurrentUser | null
  isLoading: boolean
  isAuthenticated: boolean
  checkAuth: () => Promise<void>
  refreshUser: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const checkAuth = useCallback(async () => {
    setIsLoading(true)
    try {
      const currentUser = await getCurrentUser()
      setUser(currentUser)
    } catch {
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * Silently refresh user data without triggering loading state.
   * Use this after local mutations (profile update, avatar change) to avoid UI flash.
   */
  const refreshUser = useCallback(async () => {
    try {
      const currentUser = await getCurrentUser()
      setUser(currentUser)
    } catch {
      // Keep existing user data on refresh failure
      // Don't set to null - this is a background refresh
    }
  }, [])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  // Broadcast logout to other tabs so they redirect to login
  const { postMessage: broadcastAuth } = useBroadcastChannel<AuthBroadcastMessage>(
    'noir-auth',
    useCallback((data) => {
      if (data.type === 'logout') {
        // Another tab logged out — clear local state and redirect
        setUser(null)
        window.location.href = '/login'
      }
    }, []),
  )

  const logout = useCallback(async () => {
    broadcastAuth({ type: 'logout' })
    await logoutApi()
    setUser(null)
  }, [broadcastAuth])

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated: !!user, checkAuth, refreshUser, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuthContext = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuthContext must be used within AuthProvider')
  }
  return context
}
