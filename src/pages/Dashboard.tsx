import { FC, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDashboardStore } from '../store/dashboard-store'
import { useRequirementsStore } from '../store/requirements-store'
import DashboardKPICards from '../components/DashboardKPICards'
import QuickActions from '../components/QuickActions'
import RecentActivities from '../components/RecentActivities'
import ProjectProgress from '../components/ProjectProgress'
import DashboardFilters from '../components/DashboardFilters'
import DashboardRefresh from '../components/DashboardRefresh'
import DashboardSkeleton from '../components/DashboardSkeleton'
import { DashboardFilterValues } from '../components/DashboardFilters'

const Dashboard: FC = () => {
  const navigate = useNavigate()
  const { refreshData, isLoading, error, clearError, stats, recentActivities, projectProgress } = useDashboardStore()
  const { fetchRequirements } = useRequirementsStore()
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)

  // 页面加载时初始化数据
  useEffect(() => {
    initializeDashboard()
  }, [])

  // 初始化仪表盘数据
  const initializeDashboard = async () => {
    try {
      // 并行加载所有数据
      await Promise.all([
        refreshData(),
        fetchRequirements()
      ])
      setIsInitialized(true)
    } catch (error) {
      console.error('初始化仪表盘失败:', error)
      setIsInitialized(true)
    }
  }

  // 处理筛选条件变化
  const handleApplyFilters = (filters: DashboardFilterValues) => {
    console.log('应用筛选条件:', filters)
    
    // 根据筛选条件过滤需求数据
    if (filters.status && filters.status.length > 0) {
      const requirementsStore = useRequirementsStore.getState()
      const filteredRequirements = requirementsStore.requirements.filter(req => 
        filters.status.includes(req.status)
      )
      console.log('筛选后的需求数量:', filteredRequirements.length)
    }
    
    // 根据优先级筛选
    if (filters.priority && filters.priority.length > 0) {
      const requirementsStore = useRequirementsStore.getState()
      const filteredRequirements = requirementsStore.requirements.filter(req => 
        filters.priority.includes(req.priority)
      )
      console.log('按优先级筛选后的需求数量:', filteredRequirements.length)
    }
    
    // 刷新数据以反映筛选结果
    refreshData()
  }

  return (
    <div className="space-y-6">
      {!isInitialized ? (
        <DashboardSkeleton />
      ) : (
        <>
          {/* 页面标题和操作栏 */}
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">工作台</h1>
              <p className="text-gray-600 mt-2">欢迎回来！这是您今天的工作概览。</p>
            </div>
            <DashboardRefresh
              autoRefresh={autoRefresh}
              refreshInterval={60}
            />
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between">
              <span>{error}</span>
              <button
                onClick={clearError}
                className="text-red-700 hover:text-red-900"
              >
                关闭
              </button>
            </div>
          )}

          {/* 筛选器 */}
          <DashboardFilters onApplyFilters={handleApplyFilters} />

          {/* KPI 统计卡片 */}
          <DashboardKPICards />

          {/* 快捷操作和最近活动 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <QuickActions />
            <RecentActivities />
          </div>

          {/* 项目进度 */}
          <ProjectProgress />

          {/* 加载中状态覆盖层 */}
          {isLoading && (
            <div className="fixed inset-0 bg-black bg-opacity-5 flex items-center justify-center z-50 pointer-events-none">
              <div className="bg-white p-6 rounded-lg shadow-lg">
                <div className="flex items-center space-x-3">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <span className="text-gray-700">加载中...</span>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default Dashboard
