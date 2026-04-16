import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Calendar,
  User,
  Flag,
  Edit2,
  Trash2,
  MoreHorizontal
} from 'lucide-react'
import { Requirement } from '@/store/requirements-store'
import { useState, useRef, useEffect, useMemo } from 'react'
import { getDescriptionPreview } from '@/utils/html-utils'
import { Pagination } from '@/components/ui/pagination'

interface RequirementsListViewProps {
  requirements: Requirement[]
  onDetail?: (requirement: Requirement) => void
  onEdit?: (requirement: Requirement) => void
  onDelete?: (id: string) => void
  onStatusChange?: (id: string, status: string) => void
  pageSize?: number
  compact?: boolean
}

const RequirementsListView = ({
  requirements,
  onDetail,
  onEdit,
  onDelete,
  onStatusChange,
  pageSize = 20,
  compact = false
}: RequirementsListViewProps) => {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [currentPage, setCurrentPage] = useState(1)

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null)
      }
    }

    if (openMenuId) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [openMenuId])

  const getPriorityDisplay = (priority: string) => {
    const config = {
      critical: { text: '紧急', color: 'bg-gradient-to-r from-red-100 to-rose-100 text-red-800 border-red-200', icon: '🔴' },
      high: { text: '高', color: 'bg-gradient-to-r from-orange-100 to-amber-100 text-orange-800 border-orange-200', icon: '🟠' },
      medium: { text: '中', color: 'bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-800 border-yellow-200', icon: '🟡' },
      low: { text: '低', color: 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border-green-200', icon: '🟢' }
    }
    return config[priority as keyof typeof config] || config.medium
  }

  const getStatusDisplay = (status: string) => {
    const config = {
      todo: { text: '待处理', color: 'bg-gradient-to-r from-slate-100 to-gray-100 text-slate-800 border-slate-200' },
      'in-progress': { text: '进行中', color: 'bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 border-blue-200' },
      done: { text: '已完成', color: 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border-green-200' },
      blocked: { text: '已阻塞', color: 'bg-gradient-to-r from-red-100 to-rose-100 text-red-800 border-red-200' }
    }
    return config[status as keyof typeof config] || config.todo
  }

  const getTypeDisplay = (type: string) => {
    const config = {
      feature: { text: '功能', icon: '⚡' },
      bug: { text: '缺陷', icon: '🐛' },
      improvement: { text: '改进', icon: '📈' },
      task: { text: '任务', icon: '✅' }
    }
    return config[type as keyof typeof config] || config.feature
  }

  const handleRowClick = (requirement: Requirement) => {
    console.log('[RequirementsListView] Row clicked:', requirement._id)
    onDetail?.(requirement)
  }

  const handleMenuToggle = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    setOpenMenuId(openMenuId === id ? null : id)
  }

  const handleEdit = (e: React.MouseEvent, requirement: Requirement) => {
    e.stopPropagation()
    setOpenMenuId(null)
    onEdit?.(requirement)
  }

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    setOpenMenuId(null)
    onDelete?.(id)
  }

  const handleDeleteWithRequirement = (e: React.MouseEvent, requirement: Requirement) => {
    e.stopPropagation()
    setOpenMenuId(null)
    onDelete?.(requirement._id)
  }

  const handleStatusChange = (e: React.MouseEvent, id: string, newStatus: string) => {
    e.stopPropagation()
    onStatusChange?.(id, newStatus)
  }

  const statusOptions = [
    { value: 'todo', label: '待处理', color: 'bg-gray-100 text-gray-800' },
    { value: 'in-progress', label: '进行中', color: 'bg-blue-100 text-blue-800' },
    { value: 'done', label: '已完成', color: 'bg-green-100 text-green-800' },
    { value: 'blocked', label: '已阻塞', color: 'bg-red-100 text-red-800' }
  ]

  // 分页逻辑
  const totalPages = Math.ceil(requirements.length / pageSize)
  const paginatedRequirements = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return requirements.slice(start, start + pageSize)
  }, [requirements, currentPage, pageSize])

  // 当 requirements 变化时重置到第一页
  useEffect(() => {
    setCurrentPage(1)
  }, [requirements.length])

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  if (requirements.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>暂无需求</p>
      </div>
    )
  }

  return (
    <Card className="overflow-hidden border border-gray-200/60 shadow-sm">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-50 to-slate-50 border-b border-gray-200/60">
              <tr>
                <th className={`${compact ? 'px-2 py-2.5' : 'px-4 py-3.5'} text-left text-xs font-semibold text-gray-600 uppercase tracking-wider`}>
                  ID
                </th>
                <th className={`${compact ? 'px-2 py-2.5' : 'px-4 py-3.5'} text-left text-xs font-semibold text-gray-600 uppercase tracking-wider`}>
                  标题
                </th>
                {!compact && (
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    类型
                  </th>
                )}
                <th className={`${compact ? 'px-2 py-2.5' : 'px-4 py-3.5'} text-left text-xs font-semibold text-gray-600 uppercase tracking-wider`}>
                  优先级
                </th>
                <th className={`${compact ? 'px-2 py-2.5' : 'px-4 py-3.5'} text-left text-xs font-semibold text-gray-600 uppercase tracking-wider`}>
                  状态
                </th>
                <th className={`${compact ? 'px-2 py-2.5' : 'px-4 py-3.5'} text-left text-xs font-semibold text-gray-600 uppercase tracking-wider`}>
                  指派人
                </th>
                {!compact && (
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    更新时间
                  </th>
                )}
                <th className={`${compact ? 'px-2 py-2.5' : 'px-4 py-3.5'} text-left text-xs font-semibold text-gray-600 uppercase tracking-wider`}>
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedRequirements.map((requirement) => (
                <tr
                  key={requirement._id}
                  onClick={() => handleRowClick(requirement)}
                  className={`hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-indigo-50/50 cursor-pointer transition-all duration-200 ${compact ? 'h-10' : ''} group`}
                >
                  <td className={`${compact ? 'px-2 py-2.5' : 'px-4 py-4'} text-sm text-gray-600 font-mono`}>
                    <span className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">{requirement.businessId || requirement._id.slice(-6)}</span>
                  </td>
                  <td className={`${compact ? 'px-2 py-2.5' : 'px-4 py-4'}`}>
                    <div className="flex items-center space-x-2.5">
                      <span className={`${compact ? 'text-sm' : 'text-base'}`}>{getTypeDisplay(requirement.type).icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className={`font-semibold text-gray-800 ${compact ? 'text-xs truncate' : 'text-sm mb-1'}`}>
                          {requirement.title}
                        </p>
                        {!compact && (
                          <p className="text-xs text-gray-500 line-clamp-1">
                            {getDescriptionPreview(requirement.description, 100)}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  {!compact && (
                    <td className="px-4 py-4">
                      <span className="text-sm font-medium text-gray-700">{getTypeDisplay(requirement.type).text}</span>
                    </td>
                  )}
                  <td className={`${compact ? 'px-2 py-2.5' : 'px-4 py-4'}`}>
                    <Badge className={`${getPriorityDisplay(requirement.priority).color} ${compact ? 'text-xs px-1.5 py-0.5' : 'text-xs px-2.5 py-1'} font-medium border shadow-sm`}>
                      {compact ? getPriorityDisplay(requirement.priority).icon : `${getPriorityDisplay(requirement.priority).icon} ${getPriorityDisplay(requirement.priority).text}`}
                    </Badge>
                  </td>
                  <td className={`${compact ? 'px-2 py-2.5' : 'px-4 py-4'}`}>
                    <Badge className={`${getStatusDisplay(requirement.status).color} ${compact ? 'text-xs px-1.5 py-0.5' : 'text-xs px-2.5 py-1'} font-medium border shadow-sm`}>
                      {getStatusDisplay(requirement.status).text}
                    </Badge>
                  </td>
                  <td className={`${compact ? 'px-2 py-2.5' : 'px-4 py-4'}`}>
                    <div className="flex items-center space-x-1.5">
                      <User className={`${compact ? 'h-3 w-3' : 'h-4 w-4'} text-gray-400`} />
                      <span className={`text-gray-700 ${compact ? 'text-xs truncate max-w-[60px]' : 'text-sm font-medium'}`}>
                        {typeof requirement.assignee === 'object'
                          ? requirement.assignee?.username || '未指派'
                          : requirement.assignee || '未指派'}
                      </span>
                    </div>
                  </td>
                  {!compact && (
                    <td className="px-4 py-4">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600 font-medium">
                          {requirement.updatedAt
                            ? new Date(requirement.updatedAt).toLocaleDateString('zh-CN')
                            : '未知'}
                        </span>
                      </div>
                    </td>
                  )}
                  <td className={`${compact ? 'px-2 py-2.5' : 'px-4 py-4'}`}>
                    <div className="relative">
                      <button
                        onClick={(e) => handleMenuToggle(e, `action-${requirement._id}`)}
                        className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-md transition-colors duration-200 opacity-60 group-hover:opacity-100"
                      >
                        <MoreHorizontal className={`${compact ? 'h-3 w-3' : 'h-4 w-4'}`} />
                      </button>
                      {/* 操作菜单 */}
                      {openMenuId === `action-${requirement._id}` && (
                        <div
                          ref={menuRef}
                          className="absolute right-0 top-6 bg-white border border-gray-200 rounded-xl shadow-xl z-10 py-1.5 min-w-[130px] overflow-hidden"
                        >
                          <button
                            onClick={(e) => handleEdit(e, requirement)}
                            className="w-full px-4 py-2.5 text-left text-sm hover:bg-blue-50 flex items-center space-x-2.5 text-gray-700 transition-colors duration-200"
                          >
                            <Edit2 className="h-3.5 w-3.5 text-blue-500" />
                            <span>编辑</span>
                          </button>
                          <button
                            onClick={(e) => handleDeleteWithRequirement(e, requirement)}
                            className="w-full px-4 py-2.5 text-left text-sm hover:bg-red-50 flex items-center space-x-2.5 text-red-600 transition-colors duration-200"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>删除</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* 分页组件 */}
        {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            total={requirements.length}
            pageSize={pageSize}
            onPageChange={handlePageChange}
          />
        )}
      </CardContent>
    </Card>
  )
}

export default RequirementsListView
