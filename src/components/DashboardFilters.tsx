import { FC, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Filter, X } from 'lucide-react'
import { Button } from './ui/button'

interface DashboardFiltersProps {
  onApplyFilters: (filters: DashboardFilterValues) => void
}

export interface DashboardFilterValues {
  dateRange: 'today' | 'week' | 'month' | 'quarter' | 'year' | 'all'
  projectType: string
  team: string
  status: string[]
  priority: string[]
}

const DashboardFilters: FC<DashboardFiltersProps> = ({ onApplyFilters }) => {
  const [filters, setFilters] = useState<DashboardFilterValues>({
    dateRange: 'all',
    projectType: 'all',
    team: 'all',
    status: [],
    priority: []
  })

  const [isOpen, setIsOpen] = useState(false)

  const dateRangeOptions = [
    { value: 'today', label: '今天' },
    { value: 'week', label: '本周' },
    { value: 'month', label: '本月' },
    { value: 'quarter', label: '本季度' },
    { value: 'year', label: '今年' },
    { value: 'all', label: '全部' }
  ]

  const projectTypeOptions = [
    { value: 'all', label: '全部类型' },
    { value: 'web', label: 'Web应用' },
    { value: 'mobile', label: '移动应用' },
    { value: 'desktop', label: '桌面应用' },
    { value: 'api', label: 'API服务' }
  ]

  const teamOptions = [
    { value: 'all', label: '全部团队' },
    { value: 'team1', label: '前端团队' },
    { value: 'team2', label: '后端团队' },
    { value: 'team3', label: '设计团队' },
    { value: 'team4', label: '测试团队' }
  ]

  const statusOptions = [
    { value: 'todo', label: '待处理' },
    { value: 'in-progress', label: '进行中' },
    { value: 'testing', label: '测试中' },
    { value: 'done', label: '已完成' },
    { value: 'blocked', label: '已阻塞' }
  ]

  const priorityOptions = [
    { value: 'low', label: '低优先级' },
    { value: 'medium', label: '中优先级' },
    { value: 'high', label: '高优先级' },
    { value: 'critical', label: '紧急' }
  ]

  const handleStatusToggle = (value: string) => {
    setFilters(prev => ({
      ...prev,
      status: prev.status.includes(value)
        ? prev.status.filter(s => s !== value)
        : [...prev.status, value]
    }))
  }

  const handlePriorityToggle = (value: string) => {
    setFilters(prev => ({
      ...prev,
      priority: prev.priority.includes(value)
        ? prev.priority.filter(p => p !== value)
        : [...prev.priority, value]
    }))
  }

  const handleApplyFilters = () => {
    onApplyFilters(filters)
    setIsOpen(false)
  }

  const handleResetFilters = () => {
    const resetFilters: DashboardFilterValues = {
      dateRange: 'all',
      projectType: 'all',
      team: 'all',
      status: [],
      priority: []
    }
    setFilters(resetFilters)
    onApplyFilters(resetFilters)
    setIsOpen(false)
  }

  const getActiveFilterCount = () => {
    let count = 0
    if (filters.dateRange !== 'all') count++
    if (filters.projectType !== 'all') count++
    if (filters.team !== 'all') count++
    if (filters.status.length > 0) count++
    if (filters.priority.length > 0) count++
    return count
  }

  return (
    <>
      {/* 筛选按钮 */}
      <div className="mb-6">
        <Button
          onClick={() => setIsOpen(!isOpen)}
          variant={isOpen ? "default" : "outline"}
          className="flex items-center space-x-2"
        >
          <Filter className="h-4 w-4" />
          <span>筛选</span>
          {getActiveFilterCount() > 0 && (
            <span className="bg-primary-100 text-primary-600 text-xs font-medium px-2 py-0.5 rounded-full">
              {getActiveFilterCount()}
            </span>
          )}
        </Button>
      </div>

      {/* 筛选面板 */}
      {isOpen && (
        <Card className="mb-6 border-2 border-blue-200">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <Filter className="h-5 w-5" />
                <span>筛选条件</span>
              </CardTitle>
              <Button
                onClick={() => setIsOpen(false)}
                variant="ghost"
                size="sm"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 时间范围 */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                时间范围
              </label>
              <div className="flex flex-wrap gap-2">
                {dateRangeOptions.map(option => (
                  <button
                    key={option.value}
                    onClick={() => setFilters(prev => ({ ...prev, dateRange: option.value as any }))}
                    className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                      filters.dateRange === option.value
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 项目类型 */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                项目类型
              </label>
              <div className="flex flex-wrap gap-2">
                {projectTypeOptions.map(option => (
                  <button
                    key={option.value}
                    onClick={() => setFilters(prev => ({ ...prev, projectType: option.value }))}
                    className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                      filters.projectType === option.value
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 团队 */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                团队
              </label>
              <div className="flex flex-wrap gap-2">
                {teamOptions.map(option => (
                  <button
                    key={option.value}
                    onClick={() => setFilters(prev => ({ ...prev, team: option.value }))}
                    className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                      filters.team === option.value
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 状态（多选） */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                状态
              </label>
              <div className="flex flex-wrap gap-2">
                {statusOptions.map(option => (
                  <button
                    key={option.value}
                    onClick={() => handleStatusToggle(option.value)}
                    className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                      filters.status.includes(option.value)
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 优先级（多选） */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                优先级
              </label>
              <div className="flex flex-wrap gap-2">
                {priorityOptions.map(option => (
                  <button
                    key={option.value}
                    onClick={() => handlePriorityToggle(option.value)}
                    className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                      filters.priority.includes(option.value)
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex items-center justify-end space-x-3 pt-4 border-t">
              <Button
                onClick={handleResetFilters}
                variant="outline"
              >
                重置
              </Button>
              <Button
                onClick={handleApplyFilters}
              >
                应用筛选
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  )
}

export default DashboardFilters
