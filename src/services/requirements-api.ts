import api from './api'

export interface RequirementRequest {
  title: string
  description: string
  type?: 'feature' | 'bug' | 'improvement' | 'task'
  status?: 'todo' | 'in-progress' | 'done' | 'blocked'
  acceptanceCriteria?: Array<{ description: string; isCompleted: boolean }>
  priority: 'low' | 'medium' | 'high' | 'critical'
  storyPoints?: number
  assigneeId: string
  projectId?: string
  tags?: string[]
  dueDate?: string
  estimatedHours?: number
  actualHours?: number
  attachments?: Array<{ filename: string; url: string }>
  businessId?: string
  sourceRequirementId?: string
}

export interface RequirementUpdate {
  title?: string
  description?: string
  type?: 'feature' | 'bug' | 'improvement' | 'task'
  status?: 'todo' | 'in-progress' | 'done' | 'blocked'
  acceptanceCriteria?: Array<{ description: string; isCompleted: boolean }>
  priority?: 'low' | 'medium' | 'high' | 'critical'
  storyPoints?: number
  assigneeId?: string
  projectId?: string
  tags?: string[]
  dueDate?: string
  estimatedHours?: number
  actualHours?: number
  attachments?: Array<{ filename: string; url: string }>
}

// 获取需求列表
export const fetchRequirements = async (filters = {}) => {
  const params = new URLSearchParams()
  
  Object.entries(filters).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach(v => params.append(key, v))
    } else if (value !== undefined && value !== '') {
      params.append(key, String(value))
    }
  })
  
  const queryString = params.toString()
  return api.get(`/requirements${queryString ? `?${queryString}` : ''}`)
}

// 获取单个需求详情
export const fetchRequirement = async (id: string) => {
  return api.get(`/requirements/${id}`)
}

// 创建新需求
export const createRequirement = async (data: RequirementRequest) => {
  return api.post('/requirements', data)
}

// 更新需求
export const updateRequirement = async (id: string, data: RequirementUpdate) => {
  return api.put(`/requirements/${id}`, data)
}

// 删除需求
export const deleteRequirement = async (id: string) => {
  return api.delete(`/requirements/${id}`)
}

// 更新需求状态
export const updateRequirementStatus = async (id: string, status: string) => {
  return api.put(`/requirements/${id}/status`, { status })
}

// 添加评论
export const addComment = async (id: string, content: string) => {
  return api.post(`/requirements/${id}/comments`, { content })
}

// 更新评论
export const updateComment = async (id: string, commentIndex: number, content: string) => {
  return api.put(`/requirements/${id}/comments/${commentIndex}`, { content })
}

// 删除评论
export const deleteComment = async (id: string, commentIndex: number) => {
  return api.delete(`/requirements/${id}/comments/${commentIndex}`)
}

// 上传附件
export const uploadAttachment = async (id: string, filename: string, url: string) => {
  return api.post(`/requirements/${id}/attachments`, { filename, url })
}

// 删除附件
export const deleteAttachment = async (id: string, attachmentIndex: number) => {
  return api.delete(`/requirements/${id}/attachments/${attachmentIndex}`)
}

// 更新验收标准
export const updateAcceptanceCriteria = async (id: string, criteria: Array<{ description: string; isCompleted: boolean } | string>) => {
  // 确保所有验收标准都是对象格式
  const normalizedCriteria = criteria.map(c => {
    if (typeof c === 'string') {
      return { description: c, isCompleted: false }
    }
    return c
  })
  return api.put(`/requirements/${id}/acceptance-criteria`, { criteria: normalizedCriteria })
}

// 切换验收标准状态
export const toggleAcceptanceCriteria = async (id: string, criteriaIndex: number) => {
  return api.put(`/requirements/${id}/acceptance-criteria/${criteriaIndex}/toggle`)
}

// 添加依赖
export const addDependency = async (id: string, dependencyId: string) => {
  return api.post(`/requirements/${id}/dependencies`, { dependencyId })
}

// 删除依赖
export const removeDependency = async (id: string, dependencyId: string) => {
  return api.delete(`/requirements/${id}/dependencies/${dependencyId}`)
}

// 批量更新需求状态
export const batchUpdateStatus = async (requirementIds: string[], status: string) => {
  return api.put('/requirements/batch/status', { requirementIds, status })
}

// 批量删除需求
export const batchDeleteRequirements = async (requirementIds: string[]) => {
  return api.delete('/requirements/batch', { data: { requirementIds } })
}

// 批量更新需求优先级
export const batchUpdatePriority = async (requirementIds: string[], priority: string) => {
  return api.put('/requirements/batch/priority', { requirementIds, priority })
}

// 批量指派需求
export const batchAssignRequirements = async (requirementIds: string[], assigneeId: string | null) => {
  return api.put('/requirements/batch/assign', { requirementIds, assigneeId })
}