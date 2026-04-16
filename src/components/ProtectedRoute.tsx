import React, { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/auth-store'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: string[]
}

const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const user = useAuthStore((state) => state.user)
  const token = useAuthStore((state) => state.token)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const _hasHydrated = useAuthStore((state) => state._hasHydrated)
  const location = useLocation()
  const [isReady, setIsReady] = useState(false)

  // 等待水合完成
  useEffect(() => {
    // 检查水合状态
    if (_hasHydrated) {
      setIsReady(true)
      return
    }
    
    // 如果水合还未完成，设置一个较短的延迟来检查
    const checkHydration = () => {
      // 直接从 localStorage 检查是否有认证信息
      try {
        const authStorage = localStorage.getItem('req-app-auth')
        if (authStorage) {
          const authData = JSON.parse(authStorage)
          if (authData?.state?.token && authData?.state?.isAuthenticated) {
            // 有有效的认证信息，可以继续
            setIsReady(true)
            return
          }
        }
      } catch (e) {
        console.warn('[ProtectedRoute] 读取localStorage失败:', e)
      }
      
      // 没有认证信息，也设置为就绪（会重定向到登录页）
      setIsReady(true)
    }
    
    // 给 zustand 一点时间来完成水合
    const timer = setTimeout(checkHydration, 100)
    return () => clearTimeout(timer)
  }, [_hasHydrated])

  // 水合未完成时显示加载状态
  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    )
  }

  // 检查是否已认证：需要 isAuthenticated 为 true 且 token 存在
  if (!isAuthenticated || !token) {
    console.log('[ProtectedRoute] 未认证，重定向到登录页', { isAuthenticated, hasToken: !!token })
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // 如果指定了允许的角色，检查用户角色
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <div>无权限访问该页面</div>
  }

  return <>{children}</>
}

export default ProtectedRoute
