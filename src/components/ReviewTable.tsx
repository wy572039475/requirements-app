/**
 * 评审建议表格组件
 */

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  ArrowUpDown,
  Filter,
  ChevronDown,
  Eye,
  Check,
  X,
  MoreHorizontal
} from 'lucide-react'
import type {
  Issue,
  FilterOptions,
  SortOptions,
  IssueCategory,
  IssueStatus,
  Priority
} from '@/types/review-types'
import {
  PRIORITY_CONFIG,
  CATEGORY_COLORS,
  ISSUE_STATUS_CONFIG
} from '@/types/review-types'
import {
  filterIssues,
  sortIssues,
  truncateText,
  formatConfidence
} from '@/utils/review-utils'

interface ReviewTableProps {
  issues: Issue[]
  onIssueUpdate: (issueId: string, updates: Partial<Issue>) => void
  onIssueViewDetail?: (issue: Issue) => void
}

export const ReviewTable = ({ issues, onIssueUpdate, onIssueViewDetail }: ReviewTableProps) => {
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    status: 'all',
    category: 'all'
  })
  const [sortOptions, setSortOptions] = useState<SortOptions>({
    field: 'priority',
    order: 'asc'
  })
  const [showFilters, setShowFilters] = useState(false)
  const [editingNote, setEditingNote] = useState<string | null>(null)

  // 过滤和排序
  const filteredIssues = filterIssues(issues, filterOptions)
  const sortedIssues = sortIssues(filteredIssues, sortOptions)

  // 统计信息
  const stats = {
    total: issues.length,
    pending: issues.filter(i => i.status === '待处理').length,
    processed: issues.filter(i => i.status === '已处理').length,
    ignored: issues.filter(i => i.status === '已忽略').length
  }

  // 处理状态更新
  const handleStatusChange = (issueId: string, newStatus: IssueStatus) => {
    onIssueUpdate(issueId, { status: newStatus })
  }

  // 处理备注编辑
  const handleNoteChange = (issueId: string, note: string) => {
    onIssueUpdate(issueId, { note })
    setEditingNote(null)
  }

  // 处理排序切换
  const handleSort = (field: SortOptions['field']) => {
    setSortOptions(prev => ({
      field,
      order: prev.field === field && prev.order === 'asc' ? 'desc' : 'asc'
    }))
  }

  // 处理筛选变更
  const handleFilterChange = (key: keyof FilterOptions, value: any) => {
    setFilterOptions(prev => ({ ...prev, [key]: value }))
  }

  return (
    <div className="space-y-4">
      {/* 统计信息 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div>
                <span className="text-sm text-gray-600">问题总数</span>
                <span className="ml-2 text-lg font-bold">{stats.total}</span>
              </div>
              <div>
                <span className="text-sm text-gray-600">待处理</span>
                <span className="ml-2 text-lg font-bold text-orange-600">{stats.pending}</span>
              </div>
              <div>
                <span className="text-sm text-gray-600">已处理</span>
                <span className="ml-2 text-lg font-bold text-green-600">{stats.processed}</span>
              </div>
              <div>
                <span className="text-sm text-gray-600">已忽略</span>
                <span className="ml-2 text-lg font-bold text-yellow-600">{stats.ignored}</span>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              {showFilters ? '隐藏筛选' : '显示筛选'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 筛选栏 */}
      {showFilters && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-4">
              <div>
                <label className="text-sm text-gray-600 block mb-1">处理状态</label>
                <Select
                  value={filterOptions.status}
                  onValueChange={(value) => handleFilterChange('status', value)}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部</SelectItem>
                    <SelectItem value="待处理">待处理</SelectItem>
                    <SelectItem value="已处理">已处理</SelectItem>
                    <SelectItem value="已忽略">已忽略</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">问题分类</label>
                <Select
                  value={filterOptions.category}
                  onValueChange={(value) => handleFilterChange('category', value)}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部</SelectItem>
                    <SelectItem value="完整性">完整性</SelectItem>
                    <SelectItem value="一致性">一致性</SelectItem>
                    <SelectItem value="清晰性">清晰性</SelectItem>
                    <SelectItem value="可测试性">可测试性</SelectItem>
                    <SelectItem value="安全性">安全性</SelectItem>
                    <SelectItem value="性能/体验">性能/体验</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFilterOptions({ status: 'all', category: 'all' })}
              >
                清除筛选
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 表格 */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 w-16">
                    序号
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 w-24">
                    分类
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 w-48">
                    <button
                      className="flex items-center space-x-1 hover:text-gray-900"
                      onClick={() => handleSort('category')}
                    >
                      问题描述
                      <ArrowUpDown className="h-4 w-4" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 w-64">
                    修改建议
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 w-20">
                    <button
                      className="flex items-center space-x-1 hover:text-gray-900"
                      onClick={() => handleSort('priority')}
                    >
                      优先级
                      <ArrowUpDown className="h-4 w-4" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 w-24">
                    <button
                      className="flex items-center space-x-1 hover:text-gray-900"
                      onClick={() => handleSort('confidence')}
                    >
                      置信度
                      <ArrowUpDown className="h-4 w-4" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 w-48">
                    引用原文
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 w-28">
                    处理状态
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 w-48">
                    备注
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 w-24">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedIssues.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center">
                        <Check className="h-12 w-12 text-green-500 mb-4" />
                        <p className="text-lg font-medium">没有问题</p>
                        <p className="text-sm">需求文档质量优秀，或者已被全部处理</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  sortedIssues.map((issue, index) => (
                    <tr
                      key={issue.id}
                      className={`border-b hover:bg-gray-50 transition-colors ${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                      }`}
                    >
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {index + 1}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant="secondary"
                          className={`${CATEGORY_COLORS[issue.category]} text-white`}
                        >
                          {issue.category}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-900 font-medium">
                          {truncateText(issue.issue_desc, 50)}
                        </div>
                        {(issue.issue_desc?.length ?? 0) > 50 && (
                          <Button
                            variant="link"
                            size="sm"
                            className="p-0 h-auto text-blue-600"
                            onClick={() => onIssueViewDetail?.(issue)}
                          >
                            查看完整描述
                          </Button>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-700">
                          {truncateText(issue.suggestion, 80)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={PRIORITY_CONFIG[issue.priority].color}>
                          {PRIORITY_CONFIG[issue.priority].label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2 w-full">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${issue.confidence * 100}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-600 whitespace-nowrap">
                            {formatConfidence(issue.confidence)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {issue.evidence ? (
                          <div className="space-y-1">
                            <div className="text-sm text-gray-600 italic">
                              {truncateText(issue.evidence, 40)}
                            </div>
                            {issue.page_reference && (
                              <div className="text-xs text-gray-400">
                                {issue.page_reference}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Select
                          value={issue.status}
                          onValueChange={(value: IssueStatus) =>
                            handleStatusChange(issue.id, value)
                          }
                        >
                          <SelectTrigger className="w-24 h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="待处理">待处理</SelectItem>
                            <SelectItem value="已处理">已处理</SelectItem>
                            <SelectItem value="已忽略">已忽略</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-4 py-3">
                        {editingNote === issue.id ? (
                          <div className="flex items-center space-x-1">
                            <Textarea
                              value={issue.note || ''}
                              onChange={(e) =>
                                onIssueUpdate(issue.id, { note: e.target.value })
                              }
                              className="min-h-[60px] text-sm resize-none"
                              placeholder="添加备注..."
                              autoFocus
                              onBlur={() => handleNoteChange(issue.id, issue.note || '')}
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingNote(null)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div
                            className="text-sm text-gray-600 cursor-pointer hover:text-gray-900 min-h-[40px] p-2 rounded hover:bg-gray-100"
                            onClick={() => setEditingNote(issue.id)}
                          >
                            {issue.note || (
                              <span className="text-gray-400">点击添加备注...</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onIssueViewDetail?.(issue)}
                            title="查看详情"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStatusChange(issue.id, '已处理')}
                            title="标记为已处理"
                            disabled={issue.status === '已处理'}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default ReviewTable
