import { ReactNode } from 'react'
import { createContext, useContext } from 'react'
import useNotification from '@/hooks/useNotification'
import Notification from './Notification'

interface NotificationContextType {
  addNotification: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => number
  removeNotification: (id: number) => void
  clearAll: () => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export const useNotificationContext = () => {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotificationContext must be used within a NotificationProvider')
  }
  return context
}

interface NotificationProviderProps {
  children: ReactNode
}

const NotificationProvider = ({ children }: NotificationProviderProps) => {
  const { notifications, addNotification, removeNotification, clearAll } = useNotification()

  return (
    <NotificationContext.Provider value={{ addNotification, removeNotification, clearAll }}>
      {children}
      
      {/* 渲染所有通知 */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {notifications.map(notification => (
          <Notification
            key={notification.id}
            message={notification.message}
            type={notification.type}
            onClose={() => removeNotification(notification.id)}
          />
        ))}
      </div>
    </NotificationContext.Provider>
  )
}

export default NotificationProvider