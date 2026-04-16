
import { useDraggable } from '@dnd-kit/core'
import { Card, CardContent } from '@/components/ui/card'
import {
  User,
  Flag,
  MoreHorizontal,
  Edit2,
  Trash2,
  GripVertical
} from 'lucide-react'
import { Requirement } from '@/store/requirements-store'
import { useState, useEffect, useRef } from 'react'
import { getDescriptionPreview } from '@/utils/html-utils'

interface RequirementCardProps {
  requirement: Requirement
  onDetail?: (requirement: Requirement) => void
  onEdit?: (requirement: Requirement) => void
  onDelete?: (id: string) => void
  compact?: boolean
}

const RequirementCard = ({ requirement, onDetail, onEdit, onDelete, compact = false }: RequirementCardProps) => {
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
  } = useDraggable({
    id: requirement._id,
  })

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false)
      }
    }

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showMenu])

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500'
      case 'high': return 'bg-orange-500'
      case 'medium': return 'bg-yellow-500'
      case 'low': return 'bg-green-500'
      default: return 'bg-gray-500'
    }
  }

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'critical': return '紧急'
      case 'high': return '高'
      case 'medium': return '中'
      case 'low': return '低'
      default: return '未知'
    }
  }

  const getTypeText = (type: string) => {
    switch (type) {
      case 'feature': return '功能'
      case 'bug': return '缺陷'
      case 'improvement': return '改进'
      case 'task': return '任务'
      default: return '未知'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'feature': return '⚡'
      case 'bug': return '🐛'
      case 'improvement': return '📈'
      case 'task': return '✅'
      default: return '📝'
    }
  }

  const handleCardClick = (e: React.MouseEvent) => {
    console.log('[RequirementCard] Card clicked, showMenu:', showMenu, 'target:', e.target)

    // 如果菜单是打开的，先关闭菜单
    if (showMenu) {
      setShowMenu(false)
      return
    }

    console.log('[RequirementCard] Opening detail for:', requirement._id)
    onDetail?.(requirement)
  }

  const handleMenuToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    console.log('[RequirementCard] Menu toggle clicked, current showMenu:', showMenu)
    setShowMenu(!showMenu)
  }

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    console.log('[RequirementCard] Edit clicked for:', requirement._id)
    setShowMenu(false)
    onEdit?.(requirement)
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    console.log('[RequirementCard] Delete clicked for:', requirement._id)
    setShowMenu(false)
    onDelete?.(requirement._id)
  }

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined

  // 紧凑模式渲染
  if (compact) {
    return (
      <Card
        ref={setNodeRef}
        style={style}
        {...attributes}
        onClick={handleCardClick}
        className="bg-white hover:shadow-md transition-all duration-200 overflow-hidden border border-gray-200/60 hover:border-gray-300/60 group"
      >
        <CardContent className="p-2.5">
          <div className="flex items-center justify-between min-w-0">
            <div className="flex items-center space-x-2 flex-1 min-w-0">
              {/* 拖拽句柄 */}
              <div
                {...listeners}
                className="cursor-grab active:cursor-grabbing flex-shrink-0 opacity-40 group-hover:opacity-100 transition-opacity duration-200"
                onClick={(e) => e.stopPropagation()}
              >
                <GripVertical className="h-3 w-3 text-gray-500" />
              </div>

              <span className="text-xs flex-shrink-0">{getTypeIcon(requirement.type)}</span>
              <h3 
                className="font-medium text-xs truncate min-w-0 flex-1 text-gray-800" 
                title={requirement.title}
              >
                {requirement.title}
              </h3>
            </div>
            
            <div className="flex items-center space-x-2 flex-shrink-0">
              <Flag className={`h-3 w-3 ${getPriorityColor(requirement.priority)} rounded-sm shadow-sm`} title={getPriorityText(requirement.priority)} />
              <div className="flex items-center text-gray-500">
                <User className="h-3 w-3 mr-0.5 text-gray-400" />
                <span className="text-xs truncate max-w-[50px] font-medium" title={typeof requirement.assignee === 'object'
                    ? requirement.assignee?.username || '未指派'
                    : requirement.assignee || '未指派'}>
                  {typeof requirement.assignee === 'object'
                    ? requirement.assignee?.username || '未指派'
                    : requirement.assignee || '未指派'}
                </span>
              </div>
              
              <div className="relative" ref={menuRef}>
                <button
                  onClick={handleMenuToggle}
                  className="text-gray-400 hover:text-gray-600 p-0.5 hover:bg-gray-100 rounded transition-colors duration-200"
                >
                  <MoreHorizontal className="h-3 w-3" />
                </button>

                {/* 下拉菜单 */}
                {showMenu && (
                  <div className="absolute right-0 top-5 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1 min-w-[100px] overflow-hidden">
                    <button
                      onClick={handleEdit}
                      className="w-full px-3 py-1.5 text-left text-xs hover:bg-blue-50 flex items-center space-x-2 text-gray-700 transition-colors duration-200"
                    >
                      <Edit2 className="h-3 w-3 text-blue-500" />
                      <span>编辑</span>
                    </button>
                    <button
                      onClick={handleDelete}
                      className="w-full px-3 py-1.5 text-left text-xs hover:bg-red-50 flex items-center space-x-2 text-red-600 transition-colors duration-200"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>删除</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // 详细模式渲染
  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      onClick={handleCardClick}
      className="bg-white hover:shadow-lg transition-all duration-300 overflow-hidden border border-gray-200/60 hover:border-gray-300/60 group"
    >
      <CardContent className="p-4">
        {/* 标题和优先级 */}
        <div className="flex items-start justify-between mb-3 min-w-0">
          <div className="flex items-start space-x-2.5 flex-1 min-w-0">
            {/* 拖拽句柄 */}
            <div
              {...listeners}
              className="cursor-grab active:cursor-grabbing flex-shrink-0 mt-0.5 opacity-40 group-hover:opacity-100 transition-opacity duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <GripVertical className="h-4 w-4 text-gray-500" />
            </div>

            <span className="text-base mt-0.5 flex-shrink-0">{getTypeIcon(requirement.type)}</span>
            <h3 
              className="font-semibold text-gray-800 line-clamp-2 break-words min-w-0 text-sm leading-snug" 
              title={requirement.title}
            >
              {requirement.title}
            </h3>
          </div>
          <div className="relative" ref={menuRef}>
            <button
              onClick={handleMenuToggle}
              className="text-gray-400 hover:text-gray-600 p-1 flex-shrink-0 hover:bg-gray-100 rounded-md transition-colors duration-200"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>

            {/* 下拉菜单 */}
            {showMenu && (
              <div className="absolute right-0 top-6 bg-white border border-gray-200 rounded-xl shadow-xl z-10 py-1.5 min-w-[130px] overflow-hidden">
                <button
                  onClick={handleEdit}
                  className="w-full px-4 py-2.5 text-left text-sm hover:bg-blue-50 flex items-center space-x-2.5 text-gray-700 transition-colors duration-200"
                >
                  <Edit2 className="h-4 w-4 text-blue-500" />
                  <span>编辑</span>
                </button>
                <button
                  onClick={handleDelete}
                  className="w-full px-4 py-2.5 text-left text-sm hover:bg-red-50 flex items-center space-x-2.5 text-red-600 transition-colors duration-200"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>删除</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 描述 */}
        <p 
          className="text-xs text-gray-500 mb-3 line-clamp-2 break-all overflow-hidden leading-relaxed pl-8" 
          title={getDescriptionPreview(requirement.description, 500)}
        >
          {getDescriptionPreview(requirement.description, 150)}
        </p>

        {/* 标签 */}
        <div className="flex flex-wrap gap-1.5 mb-3 min-w-0 pl-8">
          {requirement.tags.slice(0, 3).map((tag, index) => (
            <span
              key={index}
              className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs rounded-full max-w-full truncate border border-blue-100 font-medium"
              title={tag}
            >
              {tag}
            </span>
          ))}
          {requirement.tags.length > 3 && (
            <span className="text-gray-400 text-xs font-medium">+{requirement.tags.length - 3}</span>
          )}
        </div>

        {/* 元信息：仅显示 ID、优先级、指派人，不显示日期和所属项目以保持卡片简洁 */}
        <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500 min-w-0 pl-8">
          {requirement.businessId && (
            <div className="flex items-center text-gray-400 flex-shrink-0" title={`业务ID: ${requirement.businessId}`}>
              <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">#{requirement.businessId}</span>
            </div>
          )}
          <div className="flex items-center flex-shrink-0">
            <Flag className={`h-3 w-3 mr-1.5 ${getPriorityColor(requirement.priority)} rounded-sm shadow-sm`} />
            <span className="font-medium">{getPriorityText(requirement.priority)}</span>
          </div>
          <div className="flex items-center flex-shrink-0 min-w-0">
            <User className="h-3 w-3 mr-1.5 flex-shrink-0 text-gray-400" />
            <span className="truncate max-w-[80px] font-medium" title={typeof requirement.assignee === 'object'
                ? requirement.assignee?.username || '未指派'
                : requirement.assignee || '未指派'}>
              {typeof requirement.assignee === 'object'
                ? requirement.assignee?.username || '未指派'
                : requirement.assignee || '未指派'}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default RequirementCard
