import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Search,
  FileText,
  Paperclip,
  Check,
  X,
  Filter,
  Database
} from 'lucide-react'
import { useRequirementsStore } from '@/store/requirements-store'
import type { Requirement } from '@/store/requirements-store'
import { getDescriptionPreview } from '@/utils/html-utils'

interface RequirementSelectorDialogProps {
  open: boolean
  onClose: () => void
  onSelect: (requirement: Requirement) => void
  filters?: {
    status?: string[]
    priority?: string[]
  }
}

const RequirementSelectorDialog: React.FC<RequirementSelectorDialogProps> = ({
  open,
  onClose,
  onSelect,
  filters = {}
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRequirementId, setSelectedRequirementId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [priorityFilter, setPriorityFilter] = useState<string[]>([])

  const { requirements, fetchRequirements, isLoading } = useRequirementsStore()

  // 初始化时加载需求列表（传入空对象避免 store 中的 projectId 筛选干扰，并设置较大的 limit 获取所有需求）
  useEffect(() => {
    if (open) {
      fetchRequirements({ limit: 1000 })
    }
  }, [open, fetchRequirements])

  // 应用初始筛选条件
  useEffect(() => {
    if (filters.status && filters.status.length > 0) {
      setStatusFilter(filters.status)
    }
    if (filters.priority && filters.priority.length > 0) {
      setPriorityFilter(filters.priority)
    }
  }, [filters])

  // 筛选需求
  const filteredRequirements = requirements.filter((req) => {
    // 搜索筛选
    const searchLower = searchQuery.toLowerCase()
    const matchesSearch =
      !searchQuery ||
      req.title.toLowerCase().includes(searchLower) ||
      req.description?.toLowerCase().includes(searchLower) ||
      req.businessId?.toLowerCase().includes(searchLower)

    // 状态筛选
    const matchesStatus =
      statusFilter.length === 0 || statusFilter.includes(req.status)

    // 优先级筛选
    const matchesPriority =
      priorityFilter.length === 0 || priorityFilter.includes(req.priority)

    return matchesSearch && matchesStatus && matchesPriority
  })

  // 状态选项
  const statusOptions = [
    { value: 'todo', label: '待处理', color: 'bg-gray-100 text-gray-800' },
    { value: 'in-progress', label: '进行中', color: 'bg-blue-100 text-blue-800' },
    { value: 'done', label: '已完成', color: 'bg-green-100 text-green-800' },
    { value: 'blocked', label: '已阻塞', color: 'bg-red-100 text-red-800' }
  ]

  // 优先级选项
  const priorityOptions = [
    { value: 'low', label: '低', color: 'bg-gray-100 text-gray-700' },
    { value: 'medium', label: '中', color: 'bg-blue-100 text-blue-700' },
    { value: 'high', label: '高', color: 'bg-orange-100 text-orange-700' },
    { value: 'critical', label: '紧急', color: 'bg-red-100 text-red-700' }
  ]

  // 切换状态筛选
  const toggleStatusFilter = (status: string) => {
    setStatusFilter(prev =>
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    )
  }

  // 切换优先级筛选
  const togglePriorityFilter = (priority: string) => {
    setPriorityFilter(prev =>
      prev.includes(priority)
        ? prev.filter(p => p !== priority)
        : [...prev, priority]
    )
  }

  // 清除所有筛选
  const clearFilters = () => {
    setSearchQuery('')
    setStatusFilter([])
    setPriorityFilter([])
  }

  // 选择需求
  const handleSelect = (requirement: Requirement) => {
    setSelectedRequirementId(requirement._id)
    onSelect(requirement)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center space-x-2">
            <Database className="h-5 w-5 text-indigo-600" />
            <span>从需求池选择需求</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          {/* 搜索和筛选区域 */}
          <div className="flex-shrink-0 space-y-3 pb-4 border-b">
            {/* 搜索框 */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索需求标题、描述或编号..."
                className="pl-10"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* 筛选器 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 flex-1">
                <Filter className="h-4 w-4 text-gray-500 flex-shrink-0" />
                <span className="text-sm text-gray-600 flex-shrink-0">状态：</span>
                <div className="flex flex-wrap gap-1.5">
                  {statusOptions.map(option => (
                    <Badge
                      key={option.value}
                      variant={statusFilter.includes(option.value) ? 'default' : 'outline'}
                      className={`cursor-pointer text-xs px-2 py-0.5 ${
                        statusFilter.includes(option.value) ? option.color : ''
                      }`}
                      onClick={() => toggleStatusFilter(option.value)}
                    >
                      {option.label}
                    </Badge>
                  ))}
                </div>

                <span className="text-sm text-gray-600 flex-shrink-0 ml-4">优先级：</span>
                <div className="flex flex-wrap gap-1.5">
                  {priorityOptions.map(option => (
                    <Badge
                      key={option.value}
                      variant={priorityFilter.includes(option.value) ? 'default' : 'outline'}
                      className={`cursor-pointer text-xs px-2 py-0.5 ${
                        priorityFilter.includes(option.value) ? option.color : ''
                      }`}
                      onClick={() => togglePriorityFilter(option.value)}
                    >
                      {option.label}
                    </Badge>
                  ))}
                </div>
              </div>

              {(statusFilter.length > 0 || priorityFilter.length > 0) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  className="text-xs"
                >
                  清除筛选
                </Button>
              )}
            </div>
          </div>

          {/* 需求列表 */}
          <div className="flex-1 overflow-y-auto py-4 space-y-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-gray-500">加载中...</div>
              </div>
            ) : filteredRequirements.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="h-12 w-12 text-gray-300 mb-4" />
                <p className="text-gray-600 font-medium">
                  {searchQuery || statusFilter.length > 0 || priorityFilter.length > 0
                    ? '未找到匹配的需求'
                    : '暂无需求'}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {searchQuery || statusFilter.length > 0 || priorityFilter.length > 0
                    ? '尝试调整搜索或筛选条件'
                    : '请先创建需求'}
                </p>
              </div>
            ) : (
              filteredRequirements.map((requirement) => (
                <Card
                  key={requirement._id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedRequirementId === requirement._id
                      ? 'ring-2 ring-indigo-500 border-indigo-500'
                      : 'hover:border-indigo-300'
                  }`}
                  onClick={() => handleSelect(requirement)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        {/* 需求编号和标题 */}
                        <div className="flex items-center space-x-2 mb-2">
                          {requirement.businessId && (
                            <Badge variant="outline" className="text-xs font-mono">
                              {requirement.businessId}
                            </Badge>
                          )}
                          <h3 className="font-semibold text-gray-900 truncate">
                            {requirement.title}
                          </h3>
                        </div>

                        {/* 需求描述 */}
                        {requirement.description && (
                          <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                            {getDescriptionPreview(requirement.description, 200)}
                          </p>
                        )}

                        {/* 元信息 */}
                        <div className="flex items-center space-x-2 flex-wrap gap-1.5">
                          <Badge
                            variant="outline"
                            className={`text-xs ${
                              statusOptions.find(s => s.value === requirement.status)?.color || ''
                            }`}
                          >
                            {statusOptions.find(s => s.value === requirement.status)?.label || requirement.status}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={`text-xs ${
                              priorityOptions.find(p => p.value === requirement.priority)?.color || ''
                            }`}
                          >
                            {priorityOptions.find(p => p.value === requirement.priority)?.label || requirement.priority}
                          </Badge>
                          {requirement.type && (
                            <Badge variant="outline" className="text-xs">
                              {requirement.type}
                            </Badge>
                          )}
                          {requirement.attachments && requirement.attachments.length > 0 && (
                            <Badge variant="outline" className="text-xs flex items-center space-x-1">
                              <Paperclip className="h-3 w-3" />
                              <span>{requirement.attachments.length}个附件</span>
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* 选中标记 */}
                      {selectedRequirementId === requirement._id && (
                        <div className="flex-shrink-0 ml-3">
                          <div className="h-6 w-6 rounded-full bg-indigo-600 flex items-center justify-center">
                            <Check className="h-4 w-4 text-white" />
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* 底部信息 */}
          <div className="flex-shrink-0 pt-4 border-t text-sm text-gray-600">
            共 {filteredRequirements.length} 个需求
            {filteredRequirements.length !== requirements.length && `（从 ${requirements.length} 个筛选）`}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default RequirementSelectorDialog
