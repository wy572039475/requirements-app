
import { useEffect, useState } from 'react'
import { DndContext, DragEndEvent, DragStartEvent, DragOverEvent } from '@dnd-kit/core'
import { useRequirementsStore } from '@/store/requirements-store'
import StatusColumn from './StatusColumn'
import RequirementsListView from './RequirementsListView'
import RequirementsReports from './RequirementsReports'
import RequirementDetail from './RequirementDetail'
import RequirementDialog from './RequirementDialog'
import RequirementDeleteDialog from './RequirementDeleteDialog'
import { Requirement } from '@/store/requirements-store'
import { Grid3X3, List, X, BarChart3, Minimize2, Maximize2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

const statusConfig = [
  { key: 'todo', title: '待处理', color: 'bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200' },
  { key: 'in-progress', title: '进行中', color: 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200' },
  { key: 'done', title: '已完成', color: 'bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200' },
  { key: 'blocked', title: '已阻塞', color: 'bg-gradient-to-br from-rose-50 to-rose-100 border-rose-200' }
] as const

type ViewMode = 'board' | 'list' | 'reports'

const RequirementsBoard = () => {
  const {
    requirements,
    filter,
    searchQuery,
    updateStatus,
    fetchRequirements,
    isLoading,
    error,
    setSelectedRequirement,
    updateRequirement,
    deleteRequirement
  } = useRequirementsStore()
  const [selectedRequirementForDetail, setSelectedRequirementForDetail] = useState<Requirement | null>(null)
  const [showRequirementDetail, setShowRequirementDetail] = useState(false)
  const [showRequirementDialog, setShowRequirementDialog] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editingRequirement, setEditingRequirement] = useState<Requirement | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deletingRequirement, setDeletingRequirement] = useState<Requirement | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('board')
  const [compactMode, setCompactMode] = useState(false)

  // 不再在组件挂载时获取数据，由父组件 Requirements 页面统一管理

  const handleDragStart = (event: DragStartEvent) => {
    console.log('Drag started:', event.active.id)
    // 阻止拖拽时的点击事件
    if (event.event) {
      event.event.stopPropagation()
    }
  }

  const handleDragOver = (event: DragOverEvent) => {
    console.log('Drag over:', event)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    console.log('Drag ended:', { active: event.active.id, over: event.over?.id })
    
    const { active, over } = event
    
    if (!over) {
      console.log('Drop target is null, ignoring')
      return
    }
    
    const requirementId = active.id as string
    const targetStatus = over.id as string
    
    console.log('Will update:', { requirementId, currentStatus: active.id as string, targetStatus })
    
    if (['todo', 'in-progress', 'done', 'blocked'].includes(targetStatus)) {
      try {
        await updateStatus(requirementId, targetStatus as any)
        console.log('Status update completed successfully')
      } catch (error) {
        console.error('Status update failed:', error)
      }
    }
  }

  const getRequirementsByStatus = (status: string) => {
    // 安全检查：确保requirements存在
    if (!requirements || !Array.isArray(requirements)) {
      return []
    }

    // 当用户选择了状态筛选时：每列只显示「属于该列且通过状态筛选」的需求，避免同一条需求出现在多列
    if (filter.status && filter.status.length > 0) {
      if (!filter.status.includes(status)) return []
    }

    // 基础过滤：只显示属于当前列的需求（req.status === status）
    let filtered = requirements.filter(req => req.status === status)
    console.log('[getRequirementsByStatus] 状态过滤后:', filtered.length)

    // 应用优先级筛选
    if (filter.priority && filter.priority.length > 0) {
      filtered = filtered.filter(req => filter.priority.includes(req.priority))
    }

    // 应用指派人筛选（处理assignee可能是对象或字符串的情况）
    if (filter.assignee && filter.assignee.length > 0) {
      filtered = filtered.filter(req => {
        const assigneeName = typeof req.assignee === 'object'
          ? req.assignee?.username || ''
          : req.assignee || ''
        return filter.assignee.includes(assigneeName)
      })
    }

    // 应用搜索查询
    if (searchQuery && searchQuery.trim()) {
      const searchQueryLower = searchQuery.toLowerCase()
      filtered = filtered.filter(req => {
        const titleMatch = req.title && req.title.toLowerCase().includes(searchQueryLower)
        const descriptionMatch = req.description && req.description.toLowerCase().includes(searchQueryLower)
        const tagMatch = req.tags && req.tags.some(tag => tag.toLowerCase().includes(searchQueryLower))
        return titleMatch || descriptionMatch || tagMatch
      })
    }

    return filtered
  }

  // 获取所有过滤后的需求（用于列表视图）
  const getFilteredRequirements = () => {
    console.log('[getFilteredRequirements] 开始:', {
      totalRequirements: requirements.length,
      filter,
      searchQuery
    })

    // 安全检查：确保requirements存在
    if (!requirements || !Array.isArray(requirements)) {
      console.error('[getFilteredRequirements] requirements不存在或不是数组')
      return []
    }

    let filtered = [...requirements]

    // 应用状态筛选
    if (filter.status && filter.status.length > 0) {
      filtered = filtered.filter(req => filter.status.includes(req.status))
      console.log('[getFilteredRequirements] 状态过滤后:', filtered.length)
    }

    // 应用优先级筛选
    if (filter.priority && filter.priority.length > 0) {
      filtered = filtered.filter(req => filter.priority.includes(req.priority))
      console.log('[getFilteredRequirements] 优先级过滤后:', filtered.length)
    }

    // 应用指派人筛选
    if (filter.assignee && filter.assignee.length > 0) {
      filtered = filtered.filter(req => {
        const assigneeName = typeof req.assignee === 'object'
          ? req.assignee?.username || ''
          : req.assignee || ''
        return filter.assignee.includes(assigneeName)
      })
      console.log('[getFilteredRequirements] 指派人过滤后:', filtered.length)
    }

    // 应用搜索查询
    if (searchQuery && searchQuery.trim()) {
      const searchQueryLower = searchQuery.toLowerCase()
      filtered = filtered.filter(req => {
        const titleMatch = req.title && req.title.toLowerCase().includes(searchQueryLower)
        const descriptionMatch = req.description && req.description.toLowerCase().includes(searchQueryLower)
        const tagMatch = req.tags && req.tags.some(tag => tag.toLowerCase().includes(searchQueryLower))
        return titleMatch || descriptionMatch || tagMatch
      })
      console.log('[getFilteredRequirements] 搜索过滤后:', filtered.length)
    }

    console.log('[getFilteredRequirements] 最终结果:', filtered.length)

    return filtered
  }

  // 处理点击需求卡片查看详情
  const handleDetail = (requirement: Requirement) => {
    console.log('[RequirementsBoard] handleDetail 点击需求:', requirement._id, requirement)
    if (!requirement || !requirement._id) {
      console.error('[RequirementsBoard] handleDetail 需求或ID为空')
      return
    }
    setSelectedRequirementForDetail(requirement)
    setShowRequirementDetail(true)
    setSelectedRequirement(requirement)
  }

  // 处理编辑需求
  const handleEdit = (requirement: Requirement) => {
    console.log('[RequirementsBoard] handleEdit 编辑需求:', requirement._id)
    setIsEditing(true)
    setEditingRequirement(requirement)
    setShowRequirementDialog(true)
    setShowRequirementDetail(false)
  }

  // 处理删除需求
  const handleDelete = (id: string) => {
    console.log('[RequirementsBoard] handleDelete 删除需求:', id)
    const requirement = requirements.find(r => r._id === id)
    if (requirement) {
      setDeletingRequirement(requirement)
      setShowDeleteDialog(true)
      setShowRequirementDetail(false)
    }
  }

  // 确认删除
  const handleConfirmDelete = async () => {
    if (deletingRequirement) {
      await deleteRequirement(deletingRequirement._id)
      setShowDeleteDialog(false)
      setDeletingRequirement(null)
      fetchRequirements()
    }
  }

  // 保存需求
  const handleSaveRequirement = async (data: any) => {
    try {
      if (isEditing && editingRequirement) {
        console.log('[RequirementsBoard] 更新现有需求:', editingRequirement._id)
        await updateRequirement(editingRequirement._id, data)
      } else {
        console.log('[RequirementsBoard] 创建新需求:', data)
        // 需要导入addRequirement或者使用全局store
        const { addRequirement } = useRequirementsStore.getState()
        await addRequirement(data as any)
      }
      setShowRequirementDialog(false)
      setEditingRequirement(null)
      setIsEditing(false)
      fetchRequirements()
    } catch (error) {
      console.error('保存需求失败:', error)
    }
  }

  // 取消对话框
  const handleCancelDialog = () => {
    setShowRequirementDialog(false)
    setEditingRequirement(null)
    setIsEditing(false)
  }

  // 处理列表视图中的状态变更
  const handleListViewStatusChange = async (id: string, status: string) => {
    console.log('[RequirementsBoard] handleListViewStatusChange:', { id, status })
    await updateStatus(id, status as any)
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载需求列表中...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">加载失败</div>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            onClick={() => fetchRequirements()}
          >
            重试
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* 视图切换器 */}
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center text-sm text-gray-600">
          {viewMode === 'board' && (
            <span className="font-medium">共 {requirements.length} 条需求</span>
          )}
        </div>
        <Card className="border border-gray-200/60 shadow-sm">
          <CardContent className="p-1.5">
            <div className="flex space-x-1">
              <Button
                variant={viewMode === 'board' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('board')}
                className={viewMode === 'board' ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md border-0' : 'hover:bg-gray-100'}
              >
                <Grid3X3 className="h-4 w-4 mr-2" />
                看板视图
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className={viewMode === 'list' ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md border-0' : 'hover:bg-gray-100'}
              >
                <List className="h-4 w-4 mr-2" />
                列表视图
              </Button>
              <Button
                variant={viewMode === 'reports' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('reports')}
                className={viewMode === 'reports' ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md border-0' : 'hover:bg-gray-100'}
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                报表视图
              </Button>
              <div className="w-px bg-gray-200 mx-1"></div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCompactMode(!compactMode)}
                title={compactMode ? '切换到详细模式' : '切换到紧凑模式'}
                className={compactMode ? 'bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-600 border border-blue-200/50' : 'hover:bg-gray-100'}
              >
                {compactMode ? (
                  <Maximize2 className="h-4 w-4 mr-2" />
                ) : (
                  <Minimize2 className="h-4 w-4 mr-2" />
                )}
                {compactMode ? '详细' : '紧凑'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 内容区域 */}
      <div className="flex-1">
        {viewMode === 'board' && (
          // 看板视图
          <DndContext
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div className="flex space-x-6 h-full overflow-x-auto pb-2">
              {statusConfig.map((status) => (
                <StatusColumn
                  key={status.key}
                  id={status.key}
                  title={status.title}
                  color={status.color}
                  requirements={getRequirementsByStatus(status.key)}
                  onDetail={handleDetail}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  compact={compactMode}
                />
              ))}
            </div>
          </DndContext>
        )}

        {viewMode === 'list' && (
          // 列表视图
          <RequirementsListView
            requirements={getFilteredRequirements()}
            onDetail={handleDetail}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onStatusChange={handleListViewStatusChange}
            compact={compactMode}
          />
        )}

        {viewMode === 'reports' && (
          // 报表视图
          <RequirementsReports requirements={requirements} />
        )}
      </div>

      {/* 需求详情对话框 */}
      {showRequirementDetail && selectedRequirementForDetail && (
        <RequirementDetail
          isOpen={showRequirementDetail}
          requirement={selectedRequirementForDetail}
          onClose={() => setShowRequirementDetail(false)}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onUpdateStatus={updateStatus}
        />
      )}

      {/* 需求编辑对话框 */}
      {showRequirementDialog && (
        <RequirementDialog
          isOpen={showRequirementDialog}
          isEditing={isEditing}
          requirement={editingRequirement}
          onCancel={handleCancelDialog}
          onSave={handleSaveRequirement}
        />
      )}

      {/* 删除确认对话框 */}
      {showDeleteDialog && deletingRequirement && (
        <RequirementDeleteDialog
          isOpen={showDeleteDialog}
          requirement={deletingRequirement}
          onCancel={() => setShowDeleteDialog(false)}
          onConfirm={handleConfirmDelete}
        />
      )}
    </div>
  )
}

export default RequirementsBoard