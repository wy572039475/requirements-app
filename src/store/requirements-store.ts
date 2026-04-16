import { create } from 'zustand'
import {
  fetchRequirements,
  createRequirement,
  updateRequirement as updateRequirementAPI,
  deleteRequirement as deleteRequirementAPI,
  updateRequirementStatus,
  addComment as addCommentAPI,
  updateComment as updateCommentAPI,
  deleteComment as deleteCommentAPI,
  uploadAttachment as uploadAttachmentAPI,
  deleteAttachment as deleteAttachmentAPI,
  toggleAcceptanceCriteria as toggleAcceptanceCriteriaAPI,
  updateAcceptanceCriteria as updateAcceptanceCriteriaAPI,
  addDependency as addDependencyAPI,
  removeDependency as removeDependencyAPI,
  batchUpdateStatus as batchUpdateStatusAPI,
  batchDeleteRequirements as batchDeleteRequirementsAPI,
  batchUpdatePriority as batchUpdatePriorityAPI,
  batchAssignRequirements as batchAssignRequirementsAPI
} from '../services/requirements-api'

export interface Requirement {
  _id: string
  title: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  status: 'todo' | 'in-progress' | 'done' | 'blocked'
  type: 'feature' | 'bug' | 'improvement' | 'task'
  assignee?: string
  assigneeId?: string
  author?: any
  createdAt: string
  updatedAt: string
  tags: string[]
  projectId?: string
  project?: {
    _id: string
    name: string
  }
  storyPoints?: number
  acceptanceCriteria?: Array<{ description: string; isCompleted: boolean }> | string[]
  dueDate?: string
  estimatedHours?: number
  actualHours?: number
  dependencies?: any[]
  attachments?: Array<{ filename: string; url: string; uploadedBy: any; uploadedAt: string }>
  comments?: Array<{ user: any; content: string; createdAt: string }>
  businessId?: string
  sourceRequirementId?: string
}

interface RequirementsState {
  requirements: Requirement[]
  selectedRequirement: Requirement | null
  filter: {
    status: string[]
    priority: string[]
    assignee: string[]
    project: string[]
  }
  searchQuery: string
  isLoading: boolean
  error: string | null

  // Actions
  fetchRequirements: (filters?: any) => Promise<void>
  addRequirement: (requirement: Omit<Requirement, '_id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  updateRequirement: (id: string, updates: Partial<Requirement>) => Promise<void>
  deleteRequirement: (id: string) => Promise<void>
  setSelectedRequirement: (requirement: Requirement | null) => void
  updateStatus: (id: string, status: Requirement['status']) => Promise<void>
  setFilter: (filter: Partial<RequirementsState['filter']>) => void
  setSearchQuery: (query: string) => void
  setError: (error: string | null) => void

  // 新增功能
  addComment: (id: string, content: string) => Promise<void>
  updateComment: (requirementId: string, commentIndex: number, content: string) => Promise<void>
  deleteComment: (requirementId: string, commentIndex: number) => Promise<void>
  addAttachment: (id: string, filename: string, url: string) => Promise<void>
  deleteAttachment: (requirementId: string, attachmentIndex: number) => Promise<void>
  updateAcceptanceCriteria: (id: string, criteria: Array<{ description: string; isCompleted: boolean }>) => Promise<void>
  toggleAcceptanceCriteria: (id: string, criteriaIndex: number) => Promise<void>
  addDependency: (id: string, dependencyId: string) => Promise<void>
  removeDependency: (id: string, dependencyId: string) => Promise<void>
  batchUpdateStatus: (requirementIds: string[], status: Requirement['status']) => Promise<void>
  batchDeleteRequirements: (requirementIds: string[]) => Promise<void>
  batchUpdatePriority: (requirementIds: string[], priority: Requirement['priority']) => Promise<void>
  batchAssignRequirements: (requirementIds: string[], assigneeId: string | null) => Promise<void>
  clearError: () => void
}

// 模拟数据作为备用
const mockRequirements: Requirement[] = [
  {
    _id: '1',
    title: '用户登录功能优化',
    description: '优化用户登录流程，增加第三方登录支持',
    priority: 'high',
    status: 'todo',
    type: 'feature',
    assignee: '张三',
    createdAt: '2024-01-15',
    updatedAt: '2024-01-15',
    tags: ['功能', '登录', '优化']
  },
  {
    _id: '2',
    title: '支付模块重构',
    description: '重构支付模块，支持更多支付方式和更好的错误处理',
    priority: 'critical',
    status: 'in-progress',
    type: 'improvement',
    assignee: '李四',
    createdAt: '2024-01-10',
    updatedAt: '2024-01-20',
    tags: ['支付', '重构', '核心功能']
  }
]

export const useRequirementsStore = create<RequirementsState>((set) => ({
  requirements: [], // 初始化为空数组，由 fetchRequirements 从服务器获取数据
  selectedRequirement: null,
  filter: {
    status: [],
    priority: [],
    assignee: [],
    project: []
  },
  searchQuery: '',
  isLoading: false,
  error: null,

  fetchRequirements: async (filters) => {
    set({ isLoading: true, error: null })

    try {
      // 若未传筛选参数，使用 store 内当前的项目筛选，避免刷新后丢失“按项目”筛选
      const state = useRequirementsStore.getState()
      const hasExplicitFilters = filters != null && Object.keys(filters).length > 0
      const effectiveFilters = hasExplicitFilters
        ? filters
        : (state.filter?.project?.length
            ? { projectId: state.filter.project[0] }
            : {})
      const response = await fetchRequirements(effectiveFilters)
      // 后端返回 { success, data: [...], pagination, stats }
      // axios response.data 就是这个对象，需要取出其中的 data 数组
      const raw = response.data
      const requirementsData = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.data)
          ? raw.data
          : []
      set({
        requirements: requirementsData,
        isLoading: false
      })
    } catch (error) {
      console.error('获取需求列表失败:', error)
      set({
        error: (error as Error).message || '获取需求列表失败',
        isLoading: false
      })
    }
  },
  
  addRequirement: async (requirementData) => {
    set({ isLoading: true, error: null })

    try {
      // 转换数据格式：使用assignee作为assigneeId，并包含所有必要字段
      const requestData: any = {
        title: requirementData.title,
        description: requirementData.description,
        priority: requirementData.priority,
        type: requirementData.type,
        status: requirementData.status,
        projectId: requirementData.projectId
      }
      if (requirementData.assigneeId) {
        requestData.assigneeId = requirementData.assigneeId
      } else if (requirementData.assignee) {
        requestData.assigneeId = requirementData.assignee
      }

      // 可选字段
      if (requirementData.dueDate) {
        requestData.dueDate = new Date(requirementData.dueDate).toISOString()
      }
      if (requirementData.estimatedHours) {
        requestData.estimatedHours = Number(requirementData.estimatedHours)
      }
      if (requirementData.actualHours) {
        requestData.actualHours = Number(requirementData.actualHours)
      }
      if (requirementData.tags && requirementData.tags.length > 0) {
        requestData.tags = requirementData.tags
      }
      // 验收标准：只要存在且为数组就发送（包括空数组），避免填写了却未保存
      if (Array.isArray(requirementData.acceptanceCriteria)) {
        requestData.acceptanceCriteria = requirementData.acceptanceCriteria.map((c: any) => {
          if (typeof c === 'string') {
            return { description: c, isCompleted: false }
          }
          return {
            description: c.description || '',
            isCompleted: c.isCompleted || false
          }
        })
      }
      if (requirementData.attachments && requirementData.attachments.length > 0) {
        requestData.attachments = requirementData.attachments
      }

      console.log('[addRequirement] 发送请求数据:', requestData)

      const response = await createRequirement(requestData)
      // API拦截器已经返回response.data，后端返回的data字段就是需求对象
      const newRequirement = response.data

      console.log('[addRequirement] 服务器返回数据:', newRequirement)

      set((state) => ({
        requirements: [...state.requirements, newRequirement],
        isLoading: false
      }))
    } catch (error) {
      console.error('创建需求失败:', error)
      set({
        error: (error as Error).message || '创建需求失败',
        isLoading: false
      })
    }
  },

  updateRequirement: async (id, updates) => {
    set({ isLoading: true, error: null })

    try {
      // 构建更新载荷，确保验收标准一定会被发送（避免填写了却未保存）
      const payload: any = { ...updates }
      if (Array.isArray(updates.acceptanceCriteria)) {
        payload.acceptanceCriteria = updates.acceptanceCriteria.map((c: any) => {
          if (typeof c === 'string') return { description: c, isCompleted: false }
          return { description: c.description || '', isCompleted: c.isCompleted || false }
        })
      }
      console.log('[updateRequirement] 更新需求:', { id, payload })

      const response = await updateRequirementAPI(id, payload)
      // API拦截器已经返回response.data，后端返回的data字段就是需求对象
      const updatedRequirement = response.data

      console.log('[updateRequirement] 服务器返回数据:', updatedRequirement)

      set((state) => ({
        requirements: state.requirements.map(req =>
          req._id === id ? updatedRequirement : req
        ),
        isLoading: false
      }))
    } catch (error) {
      console.error('更新需求失败:', error)
      set({
        error: (error as Error).message || '更新需求失败',
        isLoading: false
      })
    }
  },
  
  deleteRequirement: async (id) => {
    set({ isLoading: true, error: null })
    
    try {
      await deleteRequirementAPI(id)
      
      set((state) => ({
        requirements: state.requirements.filter(req => req._id !== id),
        isLoading: false
      }))
    } catch (error) {
      console.error('删除需求失败:', error)
      set({ 
        error: (error as Error).message || '删除需求失败',
        isLoading: false 
      })
    }
  },
  
  setSelectedRequirement: (requirement) => {
    set({ selectedRequirement: requirement })
  },
  
  updateStatus: async (id, status) => {
    console.log('[updateStatus] 开始更新:', { id, status })
    
    // 保存原始状态以便回滚
    let originalRequirement = null
    
    try {
      // 先保存原始状态
      set((state) => {
        originalRequirement = state.requirements.find(r => r._id === id)
        console.log('[updateStatus] 保存原始状态:', originalRequirement)
        
        // 乐观更新UI - 直接更新需求状态
        const updated = state.requirements.map(req => {
          if (req._id === id) {
            console.log('[updateStatus] 乐观更新:', req, '->', { ...req, status })
            return { ...req, status }
          }
          return req
        })
        
        console.log('[updateStatus] 乐观更新后:', updated.find(r => r._id === id))
        return { requirements: updated }
      })
      
      // 调用API更新
      console.log('[updateStatus] 调用API更新状态')
      const response = await updateRequirementStatus(id, status)
      console.log('[updateStatus] API响应:', response.data)

      // 用服务器返回的最新数据更新状态
      set((state) => {
        const updated = state.requirements.map(req => {
          if (req._id === id) {
            console.log('[updateStatus] 服务器数据更新:', response.data, '替换:', req)
            // API拦截器已返回response.data，后端返回的data字段就是需求对象
            return response.data || req
          }
          return req
        })
        console.log('[updateStatus] 服务器数据更新后:', updated.find(r => r._id === id))
        return { requirements: updated }
      })
    } catch (error) {
      console.error('[updateStatus] 更新需求状态失败:', error)
      // 回滚到原始状态并清除 loading
      set((state) => ({
        error: (error as Error).message || '更新需求状态失败',
        isLoading: false,
        requirements: state.requirements.map(req => {
          if (req._id === id && originalRequirement) {
            console.log('[updateStatus] 回滚到原始状态:', originalRequirement)
            return originalRequirement
          }
          return req
        })
      }))
    }
  },
  
  setFilter: (newFilter) => {
    set((state) => ({
      filter: { ...state.filter, ...newFilter }
    }))
  },
  
  setSearchQuery: (query) => {
    set({ searchQuery: query })
  },
  
  setError: (error) => {
    set({ error })
  },

  // 新增功能实现
  addComment: async (id, content) => {
    set({ isLoading: true, error: null })

    try {
      const response = await addCommentAPI(id, content)
      const updatedRequirement = response.data

      set((state) => ({
        requirements: state.requirements.map(req =>
          req._id === id ? updatedRequirement : req
        ),
        isLoading: false
      }))
    } catch (error) {
      console.error('添加评论失败:', error)
      set({
        error: (error as Error).message || '添加评论失败',
        isLoading: false
      })
    }
  },

  updateComment: async (requirementId, commentIndex, content) => {
    set({ isLoading: true, error: null })
    try {
      const response = await updateCommentAPI(requirementId, commentIndex, content)
      const updatedRequirement = response.data
      set((state) => ({
        requirements: state.requirements.map(req =>
          req._id === requirementId ? updatedRequirement : req
        ),
        isLoading: false
      }))
    } catch (error) {
      console.error('更新评论失败:', error)
      set({
        error: (error as Error).message || '更新评论失败',
        isLoading: false
      })
    }
  },

  deleteComment: async (requirementId, commentIndex) => {
    set({ isLoading: true, error: null })

    try {
      const response = await deleteCommentAPI(requirementId, commentIndex)
      const updatedRequirement = response.data

      set((state) => ({
        requirements: state.requirements.map(req =>
          req._id === requirementId ? updatedRequirement : req
        ),
        isLoading: false
      }))
    } catch (error) {
      console.error('删除评论失败:', error)
      set({
        error: (error as Error).message || '删除评论失败',
        isLoading: false
      })
    }
  },

  addAttachment: async (id, filename, url) => {
    set({ isLoading: true, error: null })

    try {
      const response = await uploadAttachmentAPI(id, filename, url)
      const updatedRequirement = response.data

      set((state) => ({
        requirements: state.requirements.map(req =>
          req._id === id ? updatedRequirement : req
        ),
        isLoading: false
      }))
    } catch (error) {
      console.error('添加附件失败:', error)
      set({
        error: (error as Error).message || '添加附件失败',
        isLoading: false
      })
    }
  },

  deleteAttachment: async (requirementId, attachmentIndex) => {
    set({ isLoading: true, error: null })

    try {
      const response = await deleteAttachmentAPI(requirementId, attachmentIndex)
      const updatedRequirement = response.data

      set((state) => ({
        requirements: state.requirements.map(req =>
          req._id === requirementId ? updatedRequirement : req
        ),
        isLoading: false
      }))
    } catch (error) {
      console.error('删除附件失败:', error)
      set({
        error: (error as Error).message || '删除附件失败',
        isLoading: false
      })
    }
  },

  updateAcceptanceCriteria: async (id, criteria) => {
    set({ isLoading: true, error: null })

    try {
      const response = await updateAcceptanceCriteriaAPI(id, criteria)
      const updatedRequirement = response.data

      set((state) => ({
        requirements: state.requirements.map(req =>
          req._id === id ? updatedRequirement : req
        ),
        isLoading: false
      }))
    } catch (error) {
      console.error('更新验收标准失败:', error)
      set({
        error: (error as Error).message || '更新验收标准失败',
        isLoading: false
      })
    }
  },

  toggleAcceptanceCriteria: async (id, criteriaIndex) => {
    set({ isLoading: true, error: null })

    try {
      const response = await toggleAcceptanceCriteriaAPI(id, criteriaIndex)
      const updatedRequirement = response.data

      set((state) => ({
        requirements: state.requirements.map(req =>
          req._id === id ? updatedRequirement : req
        ),
        isLoading: false
      }))
    } catch (error) {
      console.error('切换验收标准状态失败:', error)
      set({ 
        error: (error as Error).message || '切换验收标准状态失败',
        isLoading: false 
      })
    }
  },

  addDependency: async (id, dependencyId) => {
    set({ isLoading: true, error: null })

    try {
      const response = await addDependencyAPI(id, dependencyId)
      const updatedRequirement = response.data

      set((state) => ({
        requirements: state.requirements.map(req =>
          req._id === id ? updatedRequirement : req
        ),
        isLoading: false
      }))
    } catch (error) {
      console.error('添加依赖失败:', error)
      set({
        error: (error as Error).message || '添加依赖失败',
        isLoading: false
      })
      throw error
    }
  },

  removeDependency: async (id, dependencyId) => {
    set({ isLoading: true, error: null })

    try {
      const response = await removeDependencyAPI(id, dependencyId)
      const updatedRequirement = response.data

      set((state) => ({
        requirements: state.requirements.map(req =>
          req._id === id ? updatedRequirement : req
        ),
        isLoading: false
      }))
    } catch (error) {
      console.error('删除依赖失败:', error)
      set({
        error: (error as Error).message || '删除依赖失败',
        isLoading: false
      })
    }
  },

  batchUpdateStatus: async (requirementIds, status) => {
    console.log('[batchUpdateStatus] 开始批量更新:', { requirementIds, status })
    
    // 保存原始需求以便回滚
    const originalRequirements: Requirement[] = []
    
    try {
      // 保存原始状态并乐观更新
      set((state) => {
        // 保存原始需求
        requirementIds.forEach(id => {
          const req = state.requirements.find(r => r._id === id)
          if (req) {
            originalRequirements.push({ ...req })
          }
        })
        
        // 乐观更新
        const updated = state.requirements.map(req => {
          if (requirementIds.includes(req._id)) {
            return { ...req, status }
          }
          return req
        })
        
        console.log('[batchUpdateStatus] 乐观更新了', requirementIds.length, '个需求')
        return { requirements: updated, isLoading: true }
      })

      // 调用API
      const response = await batchUpdateStatusAPI(requirementIds, status)
      console.log('[batchUpdateStatus] API响应:', response.data)

      // 重新获取需求列表以确保数据同步
      const { fetchRequirements } = useRequirementsStore.getState()
      await fetchRequirements()
      
    } catch (error) {
      console.error('[batchUpdateStatus] 批量更新失败:', error)
      
      // 回滚
      set((state) => ({
        error: (error as Error).message || '批量更新状态失败',
        isLoading: false,
        requirements: state.requirements.map(req => {
          const original = originalRequirements.find(r => r._id === req._id)
          return original || req
        })
      }))
    }
  },

  batchDeleteRequirements: async (requirementIds) => {
    console.log('[batchDeleteRequirements] 开始批量删除:', requirementIds)
    
    set({ isLoading: true, error: null })
    
    try {
      await batchDeleteRequirementsAPI(requirementIds)
      
      set((state) => ({
        requirements: state.requirements.filter(req => !requirementIds.includes(req._id)),
        isLoading: false
      }))
      
      console.log('[batchDeleteRequirements] 成功删除', requirementIds.length, '个需求')
    } catch (error) {
      console.error('[batchDeleteRequirements] 批量删除失败:', error)
      set({
        error: (error as Error).message || '批量删除失败',
        isLoading: false
      })
      throw error
    }
  },

  batchUpdatePriority: async (requirementIds, priority) => {
    console.log('[batchUpdatePriority] 开始批量更新优先级:', { requirementIds, priority })
    
    set({ isLoading: true, error: null })
    
    try {
      await batchUpdatePriorityAPI(requirementIds, priority)
      
      // 乐观更新
      set((state) => ({
        requirements: state.requirements.map(req => {
          if (requirementIds.includes(req._id)) {
            return { ...req, priority }
          }
          return req
        }),
        isLoading: false
      }))
      
      console.log('[batchUpdatePriority] 成功更新', requirementIds.length, '个需求优先级')
    } catch (error) {
      console.error('[batchUpdatePriority] 批量更新优先级失败:', error)
      set({
        error: (error as Error).message || '批量更新优先级失败',
        isLoading: false
      })
      throw error
    }
  },

  batchAssignRequirements: async (requirementIds, assigneeId) => {
    console.log('[batchAssignRequirements] 开始批量指派:', { requirementIds, assigneeId })
    
    set({ isLoading: true, error: null })
    
    try {
      await batchAssignRequirementsAPI(requirementIds, assigneeId)
      
      // 刷新数据
      const { fetchRequirements } = useRequirementsStore.getState()
      await fetchRequirements()
      
      console.log('[batchAssignRequirements] 成功指派', requirementIds.length, '个需求')
    } catch (error) {
      console.error('[batchAssignRequirements] 批量指派失败:', error)
      set({
        error: (error as Error).message || '批量指派失败',
        isLoading: false
      })
      throw error
    }
  },

  clearError: () => {
    set({ error: null })
  }
}))