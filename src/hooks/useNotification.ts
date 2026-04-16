import { useState, useCallback } from 'react'

interface NotificationData {
  id: number
  message: string
  type: 'success' | 'error' | 'warning' | 'info'
}

const useNotification = () => {
  const [notifications, setNotifications] = useState<NotificationData[]>([])

  const addNotification = useCallback((message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    const id = Date.now()
    const newNotification: NotificationData = { id, message, type }
    
    setNotifications(prev => [...prev, newNotification])
    
    // 自动移除通知
    setTimeout(() => {
      removeNotification(id)
    }, 5000)
    
    return id
  }, [])

  const removeNotification = useCallback((id: number) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id))
  }, [])

  const clearAll = useCallback(() => {
    setNotifications([])
  }, [])

  return {
    notifications,
    addNotification,
    removeNotification,
    clearAll
  }
}

export default useNotification