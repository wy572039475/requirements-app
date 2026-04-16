import api from './api'
import axios, { AxiosResponse } from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

// 复用AI分析专用axios实例，避免每次调用都创建新实例
let aiApiInstance: ReturnType<typeof axios.create> | null = null

function getAiApi(timeout: number = 300000) {
  if (!aiApiInstance) {
    aiApiInstance = axios.create({
      baseURL: API_BASE_URL,
      timeout,
      headers: { 'Content-Type': 'application/json' }
    })

    aiApiInstance.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('authToken')
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
        return config
      },
      (error) => Promise.reject(error)
    )

    aiApiInstance.interceptors.response.use(
      (response: AxiosResponse) => response.data,
      (error) => {
        const message = error.response?.data?.message || error.message || 'AI分析请求失败'
        return Promise.reject(new Error(message))
      }
    )
  }
  return aiApiInstance
}

// 获取KPI数据
export const getKPIData = (filters: any) => {
  const params = new URLSearchParams()
  
  if (filters.dateRange?.start) params.append('startDate', filters.dateRange.start)
  if (filters.dateRange?.end) params.append('endDate', filters.dateRange.end)
  if (filters.projectType && filters.projectType !== 'all') params.append('projectType', filters.projectType)
  if (filters.team && filters.team !== 'all') params.append('team', filters.team)
  
  return api.get(`/analysis/kpi?${params.toString()}`)
}

// 获取需求趋势数据
export const getRequirementTrendData = (filters: any) => {
  const params = new URLSearchParams()
  
  if (filters.dateRange?.start) params.append('startDate', filters.dateRange.start)
  if (filters.dateRange?.end) params.append('endDate', filters.dateRange.end)
  
  return api.get(`/analysis/requirements/trend?${params.toString()}`)
}

// 获取项目进度数据
export const getProjectProgressData = (filters: any) => {
  const params = new URLSearchParams()
  
  if (filters.dateRange?.start) params.append('startDate', filters.dateRange.start)
  if (filters.dateRange?.end) params.append('endDate', filters.dateRange.end)
  if (filters.projectType && filters.projectType !== 'all') params.append('projectType', filters.projectType)
  
  return api.get(`/analysis/projects/progress?${params.toString()}`)
}

// 获取团队绩效数据
export const getTeamPerformanceData = (filters: any) => {
  const params = new URLSearchParams()
  
  if (filters.dateRange?.start) params.append('startDate', filters.dateRange.start)
  if (filters.dateRange?.end) params.append('endDate', filters.dateRange.end)
  if (filters.team && filters.team !== 'all') params.append('team', filters.team)
  
  return api.get(`/analysis/team/performance?${params.toString()}`)
}

// 获取项目分布数据
export const getProjectDistributionData = (filters: any) => {
  const params = new URLSearchParams()
  
  if (filters.dateRange?.start) params.append('startDate', filters.dateRange.start)
  if (filters.dateRange?.end) params.append('endDate', filters.dateRange.end)
  if (filters.projectType && filters.projectType !== 'all') params.append('projectType', filters.projectType)
  
  return api.get(`/analysis/projects/distribution?${params.toString()}`)
}

// 获取详细分析报告
export const getDetailedReport = (reportType: string, filters: any) => {
  const params = new URLSearchParams()
  
  if (filters.dateRange?.start) params.append('startDate', filters.dateRange.start)
  if (filters.dateRange?.end) params.append('endDate', filters.dateRange.end)
  if (filters.projectType && filters.projectType !== 'all') params.append('projectType', filters.projectType)
  if (filters.team && filters.team !== 'all') params.append('team', filters.team)
  
  return api.get(`/analysis/reports/${reportType}?${params.toString()}`)
}

// 导出数据
export const exportData = (exportType: 'pdf' | 'excel' | 'csv', data: any, filters: any) => {
  const params = new URLSearchParams()
  
  if (filters.dateRange?.start) params.append('startDate', filters.dateRange.start)
  if (filters.dateRange?.end) params.append('endDate', filters.dateRange.end)
  if (filters.projectType && filters.projectType !== 'all') params.append('projectType', filters.projectType)
  if (filters.team && filters.team !== 'all') params.append('team', filters.team)
  
  // 创建直接fetch调用以支持responseType
  const token = localStorage.getItem('authToken')
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  
  return fetch(`/api/analysis/export/${exportType}?${params.toString()}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  }).then(response => {
    if (!response.ok) {
      throw new Error('导出失败')
    }
    return response.blob()
  })
}

// AI分析文档
export const analyzeDocument = (content: string, type: string = 'txt') => {
  return getAiApi(300000).post('/analysis/analyze', { content, type })
}

// 获取AI分析配置
export const getAIAnalysisConfig = () => {
  return api.get('/analysis/config')
}

// AI分析接口
export const analyzeInterfaces = (content: string, type: string = 'txt') => {
  return getAiApi(120000).post('/analysis/analyze-interfaces', { content, type })
}

// ==================== 需求拆解归档 API ====================

/** 路由返回 { success, data?, message? }，业务层需要内层 data */
function unwrapFeatureBreakdownResponse<T>(
  response: AxiosResponse<{ success?: boolean; data?: T; message?: string }>
): T {
  const body = response.data
  if (!body || typeof body !== 'object') {
    return body as unknown as T
  }
  if (body.success === false) {
    throw new Error(body.message || '请求失败')
  }
  if ('data' in body && body.data !== undefined) {
    return body.data as T
  }
  return body as unknown as T
}

export const featureBreakdownApi = {
  getList(params?: { page?: number; pageSize?: number; keyword?: string }) {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.set('page', String(params.page))
    if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize))
    if (params?.keyword) searchParams.set('keyword', params.keyword)
    return api
      .get(`/feature-breakdowns?${searchParams.toString()}`)
      .then(unwrapFeatureBreakdownResponse<{ list: unknown[]; total: number; page: number; pageSize: number }>)
  },

  getDetail(id: string) {
    return api.get(`/feature-breakdowns/${id}`).then(unwrapFeatureBreakdownResponse)
  },

  save(data: {
    title: string
    sourceType: 'text' | 'document' | 'requirement'
    sourceContent?: string
    sourceFileName?: string
    sourceFileType?: string
    sourceRequirementId?: string
    sourceRequirementTitle?: string
    features: Array<{ id: string; name: string; description: string; kanoModel: string; priority: string; businessRules: string }>
    projectId?: string
  }) {
    return api.post('/feature-breakdowns', data).then(unwrapFeatureBreakdownResponse)
  },

  update(id: string, data: { title: string }) {
    return api.put(`/feature-breakdowns/${id}`, data).then(unwrapFeatureBreakdownResponse)
  },

  delete(id: string) {
    return api.delete(`/feature-breakdowns/${id}`).then(unwrapFeatureBreakdownResponse)
  },

  getStats() {
    return api.get('/feature-breakdowns/stats/summary').then(unwrapFeatureBreakdownResponse)
  },

  /** 上传源文件（归档时保存原始文档） */
  uploadSourceFile(file: File) {
    const formData = new FormData()
    formData.append('file', file)
    const token = localStorage.getItem('authToken')
    return fetch('/api/feature-breakdowns/upload-source', {
      method: 'POST',
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: formData
    }).then(async (res) => {
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.message || '上传失败')
      }
      return data.data as { filePath: string; fileName: string; fileType: string; fileSize: number }
    })
  },

  /** 获取源文件下载链接 */
  getDownloadSourceUrl(id: string) {
    return `/api/feature-breakdowns/${id}/download-source`
  }
}

// ==================== 接口归档 API ====================

export const interfaceArchiveApi = {
  getList(params?: { page?: number; pageSize?: number; keyword?: string }) {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.set('page', String(params.page))
    if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize))
    if (params?.keyword) searchParams.set('keyword', params.keyword)
    return api
      .get(`/interface-archives?${searchParams.toString()}`)
      .then(unwrapFeatureBreakdownResponse<{ list: unknown[]; total: number; page: number; pageSize: number }>)
  },

  getDetail(id: string) {
    return api.get(`/interface-archives/${id}`).then(unwrapFeatureBreakdownResponse)
  },

  save(data: {
    title: string
    sourceType: 'text' | 'document' | 'requirement'
    sourceContent?: string
    sourceFileName?: string
    sourceFileType?: string
    sourceRequirementId?: string
    sourceRequirementTitle?: string
    interfaces: Array<{
      id: string; name: string; method: string; path: string;
      description: string; requestParams: string; responseParams: string;
      responseFormat: string; priority: string; category: string;
      _raw?: { systemName?: string; interfaceType?: string; confidenceScore?: number; aiSuggestion?: string }
    }>
    projectId?: string
  }) {
    return api.post('/interface-archives', data).then(unwrapFeatureBreakdownResponse)
  },

  update(id: string, data: { title: string }) {
    return api.put(`/interface-archives/${id}`, data).then(unwrapFeatureBreakdownResponse)
  },

  delete(id: string) {
    return api.delete(`/interface-archives/${id}`).then(unwrapFeatureBreakdownResponse)
  },

  getStats() {
    return api.get('/interface-archives/stats/summary').then(unwrapFeatureBreakdownResponse)
  }
}

// ==================== AI 评审历史 API（服务端持久化） ====================

export const reviewHistoryApi = {
  // 获取评审历史列表
  getList(params?: { page?: number; pageSize?: number; status?: string; projectId?: string }) {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.set('page', String(params.page))
    if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize))
    if (params?.status) searchParams.set('status', params.status)
    if (params?.projectId) searchParams.set('projectId', params.projectId)
    return api.get(`/ai-reviews?${searchParams.toString()}`)
  },

  // 获取评审详情
  getDetail(id: string) {
    return api.get(`/ai-reviews/${id}`)
  },

  // 保存评审结果
  save(data: {
    title: string
    requirement: string
    inputMethod: string
    fileName?: string
    fileType?: string
    review: { overallScore: number; issues: any[] }
    projectId?: string
  }) {
    return api.post('/ai-reviews', data)
  },

  // 更新问题状态
  updateIssueStatus(reviewId: string, issueId: string, status: string, note?: string) {
    return api.patch(`/ai-reviews/${reviewId}/issues/${issueId}`, { status, note })
  },

  // 删除评审记录
  delete(id: string) {
    return api.delete(`/ai-reviews/${id}`)
  },

  // 获取评审统计
  getStats() {
    return api.get('/ai-reviews/stats/summary')
  }
}