import { create } from 'zustand'
import { useRequirementsStore } from './requirements-store'
import { useAnalysisStore } from './analysis-store'

// 活动记录接口
export interface RecentActivity {
  id: string
  user: string
  action: string
  target: string
  time: string
  avatar?: string
  type?: 'requirement' | 'project' | 'prd' | 'prototype' | 'analysis'
}

// 统计数据接口
export interface DashboardStats {
  pendingRequirements: number
  inProgressRequirements: number
  completedRequirements: number
  totalRequirements: number
  activeProjects: number
  completedTasks: number
  prototypes: number
  reports: number
}

interface DashboardState {
  // 统计数据
  stats: DashboardStats
  
  // 最近活动
  recentActivities: RecentActivity[]
  
  // 项目进度数据
  projectProgress: Array<{
    id: string
    name: string
    progress: number
    status: string
    color: string
  }>
  
  // 加载状态
  isLoading: boolean
  error: string | null
  
  // 最后更新时间
  lastUpdated: string | null
  
  // 操作方法
  refreshData: () => Promise<void>
  loadRecentActivities: () => Promise<void>
  loadProjectProgress: () => Promise<void>
  calculateStats: () => Promise<void>
  clearError: () => void
}

// 生成模拟活动数据
const generateMockActivities = (): RecentActivity[] => {
  const users = ['张三', '李四', '王五', '赵六', '陈七']
  const actions = ['创建了需求', '更新了PRD', '完成了原型', '提交了报告', '创建了项目', '更新了任务']
  const targets = ['用户登录功能', '支付模块', '仪表板界面', '用户行为分析', '订单管理系统', '数据分析平台']
  const types: Array<'requirement' | 'project' | 'prd' | 'prototype' | 'analysis'> = ['requirement', 'prd', 'prototype', 'analysis', 'project']
  
  const times = ['2分钟前', '10分钟前', '30分钟前', '1小时前', '2小时前', '3小时前', '昨天', '昨天']
  
  return Array.from({ length: 8 }, (_, i) => ({
    id: `activity-${i}`,
    user: users[i % users.length],
    action: actions[i % actions.length],
    target: targets[i % targets.length],
    time: times[i],
    type: types[i % types.length]
  }))
}

// 生成模拟项目进度数据
const generateMockProjectProgress = () => {
  return [
    { id: '1', name: '用户管理系统', progress: 75, status: 'in-progress', color: 'bg-blue-500' },
    { id: '2', name: '支付模块优化', progress: 45, status: 'in-progress', color: 'bg-green-500' },
    { id: '3', name: '数据分析平台', progress: 30, status: 'planning', color: 'bg-purple-500' },
    { id: '4', name: '移动端适配', progress: 60, status: 'in-progress', color: 'bg-orange-500' },
    { id: '5', name: '订单系统', progress: 90, status: 'testing', color: 'bg-pink-500' }
  ]
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  stats: {
    pendingRequirements: 0,
    inProgressRequirements: 0,
    completedRequirements: 0,
    totalRequirements: 0,
    activeProjects: 0,
    completedTasks: 0,
    prototypes: 0,
    reports: 0
  },
  
  recentActivities: generateMockActivities(),
  projectProgress: generateMockProjectProgress(),
  isLoading: false,
  error: null,
  lastUpdated: null,
  
  refreshData: async () => {
    set({ isLoading: true, error: null })
    
    try {
      // 并行加载所有数据
      await Promise.all([
        get().loadRecentActivities(),
        get().loadProjectProgress(),
        get().calculateStats()
      ])
      
      set({ 
        lastUpdated: new Date().toISOString(),
        isLoading: false
      })
    } catch (error) {
      console.error('刷新仪表盘数据失败:', error)
      set({ 
        error: (error as Error).message || '刷新数据失败',
        isLoading: false
      })
    }
  },
  
  calculateStats: async () => {
    try {
      // 从requirements store获取数据
      const requirementsStore = useRequirementsStore.getState()
      const requirements = requirementsStore.requirements
      
      // 计算需求统计数据
      const stats: DashboardStats = {
        pendingRequirements: requirements.filter(r => r.status === 'todo').length,
        inProgressRequirements: requirements.filter(r => r.status === 'in-progress').length,
        completedRequirements: requirements.filter(r => r.status === 'done').length,
        totalRequirements: requirements.length,
        activeProjects: 0,
        completedTasks: 0,
        prototypes: 5, // 模拟数据
        reports: 3   // 模拟数据
      }
      
      // 从analysis store获取KPI数据
      const analysisStore = useAnalysisStore.getState()
      stats.activeProjects = analysisStore.kpiData.activeProjects
      stats.completedTasks = analysisStore.kpiData.completedTasks
      
      set({ stats })
    } catch (error) {
      console.error('计算统计数据失败:', error)
      // 使用模拟数据作为后备
      set({ 
        stats: {
          pendingRequirements: Math.floor(Math.random() * 10) + 5,
          inProgressRequirements: Math.floor(Math.random() * 10) + 5,
          completedRequirements: Math.floor(Math.random() * 20) + 10,
          totalRequirements: 0,
          activeProjects: Math.floor(Math.random() * 10) + 5,
          completedTasks: Math.floor(Math.random() * 50) + 20,
          prototypes: Math.floor(Math.random() * 5) + 2,
          reports: Math.floor(Math.random() * 5) + 1
        }
      })
    }
  },
  
  loadRecentActivities: async () => {
    try {
      // 这里可以调用API获取真实的活动记录
      // 暂时使用模拟数据
      set({ 
        recentActivities: generateMockActivities()
      })
    } catch (error) {
      console.error('加载最近活动失败:', error)
      // 使用模拟数据作为后备
      set({ 
        recentActivities: generateMockActivities()
      })
    }
  },
  
  loadProjectProgress: async () => {
    try {
      // 这里可以调用API获取真实的项目进度数据
      // 暂时使用模拟数据
      set({ 
        projectProgress: generateMockProjectProgress()
      })
    } catch (error) {
      console.error('加载项目进度失败:', error)
      // 使用模拟数据作为后备
      set({ 
        projectProgress: generateMockProjectProgress()
      })
    }
  },
  
  clearError: () => {
    set({ error: null })
  }
}))
