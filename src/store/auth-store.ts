import { create } from 'zustand'
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware'

export interface User {
  id: string
  username: string
  email: string
  role: 'admin' | 'pm' | 'developer' | 'designer'
  avatar?: string
  lastLogin?: string
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  _hasHydrated: boolean

  // Actions
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>
  register: (userData: {
    username: string
    email: string
    password: string
    role?: string
  }) => Promise<{ success: boolean; message?: string }>
  logout: () => void
  updateUser: (userData: Partial<User>) => void
  setHasHydrated: (state: boolean) => void
}

const STORAGE_KEY = 'req-app-auth'

// 自定义 storage，使用同步读取来避免异步问题
const customStorage: StateStorage = {
  getItem: (name) => {
    const str = localStorage.getItem(name)
    return str || null
  },
  setItem: (name, value) => {
    localStorage.setItem(name, value)
  },
  removeItem: (name) => {
    localStorage.removeItem(name)
  },
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      _hasHydrated: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true })

        try {
          const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
          })

          const data = await response.json()

          if (data.success && data.data) {
            const newState = {
              user: {
                id: data.data.user._id,
                username: data.data.user.username,
                email: data.data.user.email,
                role: data.data.user.role,
                avatar: data.data.user.avatar,
                lastLogin: data.data.user.lastLogin,
              },
              token: data.data.token,
              isAuthenticated: true,
              isLoading: false,
            }
            localStorage.setItem('authToken', data.data.token)
            set(newState)
            return { success: true }
          } else {
            set({ isLoading: false })
            return { success: false, message: data.message || '登录失败' }
          }
        } catch (error) {
          console.error('登录错误:', error)
          set({ isLoading: false })
          return { success: false, message: '网络错误，请检查后端服务是否启动' }
        }
      },

      register: async (userData: { username: string; email: string; password: string; role?: string }) => {
        set({ isLoading: true })

        try {
          const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData),
          })

          const data = await response.json()

          if (data.success && data.data) {
            const newState = {
              user: {
                id: data.data.user._id,
                username: data.data.user.username,
                email: data.data.user.email,
                role: data.data.user.role,
                avatar: data.data.user.avatar,
                lastLogin: data.data.user.lastLogin,
              },
              token: data.data.token,
              isAuthenticated: true,
              isLoading: false,
            }
            localStorage.setItem('authToken', data.data.token)
            set(newState)
            return { success: true }
          } else {
            set({ isLoading: false })
            return { success: false, message: data.message || '注册失败' }
          }
        } catch (error) {
          console.error('注册错误:', error)
          set({ isLoading: false })
          return { success: false, message: '网络错误，请检查后端服务是否启动' }
        }
      },

      logout: () => {
        localStorage.removeItem('authToken')
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        })
      },

      updateUser: (userData) => {
        set((state) => {
          const newUser = state.user ? { ...state.user, ...userData } : null
          return { user: newUser }
        })
      },

      setHasHydrated: (state: boolean) => {
        set({ _hasHydrated: state })
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => customStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          const token = localStorage.getItem('authToken')
          if (token) {
            set({ token, isAuthenticated: true })
          }
          state.setHasHydrated(true)
        }
      }
    }
  )
)
