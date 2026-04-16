import { create } from 'zustand'
import { 
  getKPIData, 
  getRequirementTrendData, 
  getProjectProgressData, 
  getTeamPerformanceData,
  getProjectDistributionData 
} from '../services/analysis-api'

interface ChartData {
  date: string
  value: number
  category: string
}

interface AnalysisState {
  // 指标数据
  kpiData: {
    activeProjects: number
    completedTasks: number
    pendingRequirements: number
    teamMembers: number
  }
  
  // 图表数据
  requirementTrendData: ChartData[]
  projectProgressData: ChartData[]
  teamPerformanceData: ChartData[]
  
  // 筛选条件
  filters: {
    dateRange: {
      start: string
      end: string
    }
    projectType: string
    team: string
  }
  
  // 操作
  setFilters: (filters: Partial<AnalysisState['filters']>) => void
  refreshData: () => Promise<void>
  fetchKPIData: () => Promise<void>
  fetchRequirementTrendData: () => Promise<void>
  fetchProjectProgressData: () => Promise<void>
  fetchTeamPerformanceData: () => Promise<void>
  fetchProjectDistributionData: () => Promise<void>
  isLoading: boolean
}

// 模拟数据生成
const generateMockData = (): {
  kpiData: AnalysisState['kpiData']
  requirementTrendData: ChartData[]
  projectProgressData: ChartData[]
  teamPerformanceData: ChartData[]
} => {
  const now = new Date()
  const dates = Array.from({ length: 30 }, (_, i) => {
    const date = new Date(now)
    date.setDate(date.getDate() - 29 + i)
    return date.toISOString().split('T')[0]
  })

  return {
    kpiData: {
      activeProjects: Math.floor(Math.random() * 20) + 10,
      completedTasks: Math.floor(Math.random() * 200) + 50,
      pendingRequirements: Math.floor(Math.random() * 50) + 5,
      teamMembers: Math.floor(Math.random() * 15) + 5
    },
    
    requirementTrendData: dates.map(date => ({
      date,
      value: Math.floor(Math.random() * 30) + 10,
      category: 'Requirements'
    })),
    
    projectProgressData: dates.map(date => ({
      date,
      value: Math.floor(Math.random() * 100),
      category: 'Progress'
    })),
    
    teamPerformanceData: dates.map(date => ({
      date,
      value: Math.floor(Math.random() * 80) + 20,
      category: 'Performance'
    }))
  }
}

export const useAnalysisStore = create<AnalysisState>((set, get) => ({
  ...generateMockData(),
  isLoading: false,
  
  filters: {
    dateRange: {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0]
    },
    projectType: 'all',
    team: 'all'
  },
  
  setFilters: (newFilters) => {
    set(state => ({
      filters: { ...state.filters, ...newFilters }
    }))
    // 自动刷新数据
    get().refreshData()
  },
  
  refreshData: async () => {
    set({ isLoading: true })
    try {
      await Promise.all([
        get().fetchKPIData(),
        get().fetchRequirementTrendData(),
        get().fetchProjectProgressData(),
        get().fetchTeamPerformanceData()
      ])
    } catch (error) {
      console.error('刷新数据失败:', error)
      // 在API不可用时使用模拟数据
      const mockData = generateMockData()
      set(mockData)
    } finally {
      set({ isLoading: false })
    }
  },
  
  fetchKPIData: async () => {
    try {
      const response = await getKPIData(get().filters)
      set({ kpiData: response.data })
    } catch (error) {
      console.error('获取KPI数据失败:', error)
      // 使用模拟数据
      const mockData = generateMockData()
      set({ kpiData: mockData.kpiData })
    }
  },
  
  fetchRequirementTrendData: async () => {
    try {
      const response = await getRequirementTrendData(get().filters)
      set({ requirementTrendData: response.data })
    } catch (error) {
      console.error('获取需求趋势数据失败:', error)
      // 使用模拟数据
      const mockData = generateMockData()
      set({ requirementTrendData: mockData.requirementTrendData })
    }
  },
  
  fetchProjectProgressData: async () => {
    try {
      const response = await getProjectProgressData(get().filters)
      set({ projectProgressData: response.data })
    } catch (error) {
      console.error('获取项目进度数据失败:', error)
      // 使用模拟数据
      const mockData = generateMockData()
      set({ projectProgressData: mockData.projectProgressData })
    }
  },
  
  fetchTeamPerformanceData: async () => {
    try {
      const response = await getTeamPerformanceData(get().filters)
      set({ teamPerformanceData: response.data })
    } catch (error) {
      console.error('获取团队绩效数据失败:', error)
      // 使用模拟数据
      const mockData = generateMockData()
      set({ teamPerformanceData: mockData.teamPerformanceData })
    }
  },
  
  fetchProjectDistributionData: async () => {
    try {
      const response = await getProjectDistributionData(get().filters)
      // 这个数据可能用于图表，但不直接存储在state中
      return response.data
    } catch (error) {
      console.error('获取项目分布数据失败:', error)
      // 返回模拟数据
      return [
        { name: '进行中', value: 45, color: '#3B82F6' },
        { name: '已完成', value: 25, color: '#10B981' },
        { name: '待开始', value: 20, color: '#F59E0B' },
        { name: '暂停', value: 10, color: '#EF4444' }
      ]
    }
  }
}))