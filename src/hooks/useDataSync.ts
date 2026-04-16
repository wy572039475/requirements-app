import { useEffect } from 'react'
import { useIntegrationStore } from '../store/integration-store'

export const useDataSync = () => {
  const { syncAllData, syncStatus } = useIntegrationStore()
  
  useEffect(() => {
    // 组件挂载时自动同步数据
    syncAllData()
    
    // 定期同步数据（每5分钟）
    const interval = setInterval(() => {
      syncAllData()
    }, 5 * 60 * 1000)
    
    return () => clearInterval(interval)
  }, [syncAllData])
  
  return { syncStatus }
}