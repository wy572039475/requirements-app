import { FC, useEffect, useState } from 'react'
import { RefreshCw, Clock } from 'lucide-react'
import { useDashboardStore } from '../store/dashboard-store'
import { Button } from './ui/button'

interface DashboardRefreshProps {
  autoRefresh?: boolean
  refreshInterval?: number // 自动刷新间隔（秒）
}

const DashboardRefresh: FC<DashboardRefreshProps> = ({
  autoRefresh = false,
  refreshInterval = 60
}) => {
  const { refreshData, isLoading, lastUpdated, error, clearError } = useDashboardStore()
  const [timeUntilRefresh, setTimeUntilRefresh] = useState(refreshInterval)

  // 自动刷新逻辑
  useEffect(() => {
    if (!autoRefresh) return

    const timer = setInterval(() => {
      setTimeUntilRefresh(prev => {
        if (prev <= 1) {
          refreshData()
          return refreshInterval
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [autoRefresh, refreshInterval, refreshData])

  const handleRefresh = async () => {
    clearError()
    await refreshData()
    setTimeUntilRefresh(refreshInterval)
  }

  const formatLastUpdated = () => {
    if (!lastUpdated) return '从未更新'
    
    const now = new Date()
    const updated = new Date(lastUpdated)
    const diff = now.getTime() - updated.getTime()
    
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    
    if (hours > 0) {
      return `${hours}小时前更新`
    } else if (minutes > 0) {
      return `${minutes}分钟前更新`
    } else if (seconds > 0) {
      return `${seconds}秒前更新`
    } else {
      return '刚刚更新'
    }
  }

  return (
    <div className="flex items-center space-x-3">
      {/* 自动刷新状态 */}
      {autoRefresh && (
        <div className="flex items-center text-sm text-gray-500">
          <Clock className="h-4 w-4 mr-1" />
          <span>
            {isLoading ? '刷新中...' : `${timeUntilRefresh}秒后自动刷新`}
          </span>
        </div>
      )}
      
      {/* 最后更新时间 */}
      {lastUpdated && (
        <div className="text-sm text-gray-500">
          <span className="mr-2">•</span>
          <span>{formatLastUpdated()}</span>
        </div>
      )}
      
      {/* 刷新按钮 */}
      <Button
        onClick={handleRefresh}
        disabled={isLoading}
        variant="outline"
        size="sm"
        className="flex items-center space-x-2"
      >
        <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        <span>{isLoading ? '刷新中' : '刷新'}</span>
      </Button>
      
      {/* 错误提示 */}
      {error && (
        <div className="text-sm text-red-600">
          {error}
        </div>
      )}
    </div>
  )
}

export default DashboardRefresh
