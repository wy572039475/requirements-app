/**
 * AI需求评审相关类型定义
 */

// 问题处理状态
export type IssueStatus = '待处理' | '已处理' | '已忽略'

// 处理状态对应的显示文本和颜色
export const ISSUE_STATUS_CONFIG = {
  '待处理': { label: '待处理', color: 'bg-gray-100 text-gray-800' },
  '已处理': { label: '已处理', color: 'bg-green-100 text-green-800' },
  '已忽略': { label: '已忽略', color: 'bg-yellow-100 text-yellow-800' }
}

// 优先级类型
export type Priority = 1 | 2 | 3 | 4

// 优先级对应的显示文本和颜色
export const PRIORITY_CONFIG = {
  1: { label: '严重', color: 'bg-red-100 text-red-800', badgeColor: '#dc2626' },
  2: { label: '重要', color: 'bg-orange-100 text-orange-800', badgeColor: '#ea580c' },
  3: { label: '一般', color: 'bg-yellow-100 text-yellow-800', badgeColor: '#ca8a04' },
  4: { label: '建议', color: 'bg-gray-100 text-gray-800', badgeColor: '#6b7280' }
}

// 问题分类
export type IssueCategory = '完整性' | '一致性' | '清晰性' | '可测试性' | '安全性' | '性能/体验'

// 问题分类对应的颜色
export const CATEGORY_COLORS = {
  '完整性': 'bg-blue-600',
  '一致性': 'bg-purple-600',
  '清晰性': 'bg-green-600',
  '可测试性': 'bg-yellow-600',
  '安全性': 'bg-red-600',
  '性能/体验': 'bg-indigo-600'
}

/**
 * 问题接口
 */
export interface Issue {
  id: string                              // 唯一标识
  category: IssueCategory                 // 问题分类
  issue_desc: string                      // 问题描述
  suggestion: string                      // 修改建议
  priority: Priority                      // 优先级
  confidence: number                      // 置信度 0.0-1.0
  evidence?: string                        // 引用原文（可选）
  page_reference?: string                 // 页码或章节位置（可选）
  reasoning?: string                      // 推理过程（可选）
  status: IssueStatus                     // 处理状态（新增）
  note?: string                           // 备注（新增）
}

/**
 * 评审结果接口
 */
export interface ReviewResult {
  id: string
  requirement: string
  htmlContent?: string        // HTML内容（用于Word文档的预览）
  title: string              // 需求标题
  creator: string             // 创建人
  inputMethod: 'text' | 'document'
  fileName?: string
  fileData?: string           // 文件数据（base64编码，用于预览和下载）
  fileType?: string           // 文件类型
  fileSize?: number           // 文件大小
  timestamp: string           // 创建时间
  completedAt?: string       // 评审完成时间
  status: 'analyzing' | 'completed' | 'error'
  error?: string
  review: {
    overallScore: number
    issues: Issue[]
  }
}

/**
 * 存储的历史记录接口
 */
export interface StoredReviewHistory {
  reviews: ReviewResult[]
  lastUpdated: string
}

/**
 * 表格筛选条件
 */
export interface FilterOptions {
  status: IssueStatus | 'all'
  category: IssueCategory | 'all'
  priority?: Priority
}

/**
 * 表格排序选项
 */
export interface SortOptions {
  field: 'priority' | 'confidence' | 'category' | 'status'
  order: 'asc' | 'desc'
}
