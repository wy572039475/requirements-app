import { FC, useState, useEffect } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Plus, ChevronDown } from 'lucide-react'
import { Requirement } from '@/store/requirements-store'
import RequirementCard from './RequirementCard'
import { Button } from '@/components/ui/button'

const PAGE_SIZE = 5

interface StatusColumnProps {
  id: string
  title: string
  color: string
  requirements: Requirement[]
  onDetail?: (requirement: Requirement) => void
  onEdit?: (requirement: Requirement) => void
  onDelete?: (id: string) => void
  compact?: boolean
}

const StatusColumn: FC<StatusColumnProps> = ({ 
  id, 
  title, 
  color, 
  requirements, 
  onDetail, 
  onEdit, 
  onDelete,
  compact = false
}) => {
  const { setNodeRef } = useDroppable({
    id,
  })
  
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  
  // 当 requirements 变化时重置可见数量
  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [requirements.length])
  
  const visibleRequirements = requirements.slice(0, visibleCount)
  const hasMore = requirements.length > visibleCount
  const remainingCount = requirements.length - visibleCount
  
  const handleLoadMore = () => {
    setVisibleCount(prev => prev + PAGE_SIZE)
  }

  return (
    <div className={`flex-1 min-w-[280px] max-w-[400px] ${color} rounded-xl p-3 border-2 overflow-hidden flex flex-col shadow-sm hover:shadow-md transition-shadow duration-300`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-gray-800 text-sm tracking-wide">{title}</h3>
        <div className="flex items-center space-x-2">
          <span className="bg-white/80 backdrop-blur-sm text-gray-700 text-xs px-2.5 py-1 rounded-full font-medium shadow-sm border border-gray-200/50">
            {requirements.length}
          </span>
          <button className="p-1.5 hover:bg-white/60 rounded-lg transition-all duration-200 hover:shadow-sm">
            <Plus className="h-4 w-4 text-gray-600" />
          </button>
        </div>
      </div>

      <div ref={setNodeRef} className={`space-y-2 overflow-y-auto flex-1 pr-1 min-h-0 ${compact ? 'space-y-2' : ''}`}>
        <SortableContext items={visibleRequirements.map(r => r._id)} strategy={verticalListSortingStrategy}>
          {visibleRequirements.map((requirement) => (
            <RequirementCard
              key={requirement._id}
              requirement={requirement}
              onDetail={onDetail}
              onEdit={onEdit}
              onDelete={onDelete}
              compact={compact}
            />
          ))}
        </SortableContext>
      </div>
      
      {/* 加载更多按钮 */}
      {hasMore && (
        <div className="mt-2 pt-2 border-t border-gray-200/50 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLoadMore}
            className="w-full text-gray-600 hover:text-gray-800 hover:bg-white/60 backdrop-blur-sm transition-all duration-200"
          >
            <ChevronDown className="h-4 w-4 mr-1" />
            加载更多 ({remainingCount} 条)
          </Button>
        </div>
      )}
    </div>
  )
}

export default StatusColumn
