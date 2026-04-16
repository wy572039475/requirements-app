/**
 * 评审相关工具函数
 */

import type { Issue, FilterOptions, SortOptions, IssueCategory, Priority } from '@/types/review-types'

console.log('[review-utils] 模块已加载')

/**
 * 根据筛选条件过滤问题列表
 */
export function filterIssues(issues: Issue[], filters: FilterOptions): Issue[] {
  // 空值检查
  if (!issues || !Array.isArray(issues)) {
    console.warn('[review-utils] filterIssues: issues不是数组', issues)
    return []
  }

  return issues.filter(issue => {
    // 按状态筛选
    if (filters.status !== 'all' && issue.status !== filters.status) {
      return false
    }

    // 按分类筛选
    if (filters.category !== 'all' && issue.category !== filters.category) {
      return false
    }

    // 按优先级筛选
    if (filters.priority !== undefined && issue.priority !== filters.priority) {
      return false
    }

    return true
  })
}

/**
 * 根据排序条件排序问题列表
 */
export function sortIssues(issues: Issue[], sort: SortOptions): Issue[] {
  // 空值检查
  if (!issues || !Array.isArray(issues)) {
    console.warn('[review-utils] sortIssues: issues不是数组', issues)
    return []
  }

  return [...issues].sort((a, b) => {
    let comparison = 0

    switch (sort.field) {
      case 'priority':
        // 优先级：数字越小优先级越高
        comparison = a.priority - b.priority
        break
      case 'confidence':
        // 置信度：数字越大越好
        comparison = a.confidence - b.confidence
        break
      case 'status':
        // 状态：待处理(0) < 已忽略(1) < 已处理(2)
        const statusOrder = { '待处理': 0, '已忽略': 1, '已处理': 2 }
        comparison = statusOrder[a.status] - statusOrder[b.status]
        break
      case 'category':
        // 分类：按字符串排序
        comparison = a.category.localeCompare(b.category)
        break
      default:
        comparison = 0
    }

    return sort.order === 'asc' ? comparison : -comparison
  })
}

/**
 * 生成问题ID
 */
export function generateIssueId(): string {
  return `issue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * 统计问题
 */
export function getIssueStatistics(issues: Issue[]) {
  // 空值检查
  if (!issues || !Array.isArray(issues)) {
    console.warn('[review-utils] getIssueStatistics: issues不是数组', issues)
    return {
      total: 0,
      pending: 0,
      processed: 0,
      ignored: 0,
      byCategory: {} as Record<IssueCategory, number>,
      byPriority: {} as Record<Priority, number>
    }
  }

  return {
    total: issues.length,
    pending: issues.filter(i => i.status === '待处理').length,
    processed: issues.filter(i => i.status === '已处理').length,
    ignored: issues.filter(i => i.status === '已忽略').length,
    byCategory: issues.reduce((acc, issue) => {
      if (!issue || !issue.category) return acc
      acc[issue.category] = (acc[issue.category] || 0) + 1
      return acc
    }, {} as Record<IssueCategory, number>),
    byPriority: issues.reduce((acc, issue) => {
      if (!issue || issue.priority === undefined) return acc
      acc[issue.priority] = (acc[issue.priority] || 0) + 1
      return acc
    }, {} as Record<Priority, number>)
  }
}

/**
 * 截断文本
 */
export function truncateText(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) {
    return text
  }
  return text.substring(0, maxLength) + '...'
}

/**
 * 格式化置信度为百分比
 */
export function formatConfidence(confidence: number): string {
  return Math.round(confidence * 100) + '%'
}
