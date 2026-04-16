import { useState, useEffect, FC } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Plus,
  Filter,
  Search,
  Download,
  X,
  Folder,
  ChevronDown
} from 'lucide-react'
import * as XLSX from 'xlsx'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { useRequirementsStore } from '@/store/requirements-store'
import RequirementDialog from './RequirementDialog'
import { Requirement } from '@/store/requirements-store'
import { projectsAPI } from '@/services/projects-api'
import { toast } from '@/components/ui/toast-container'

interface RequirementsToolbarProps {
  initialProjectId?: string // 从 URL 传入的初始项目ID
}

const RequirementsToolbar: FC<RequirementsToolbarProps> = ({ initialProjectId }) => {
  const navigate = useNavigate()
  const {
    searchQuery,
    setSearchQuery,
    filter,
    setFilter,
    fetchRequirements,
    error,
    addRequirement,
    updateRequirement,
    requirements
  } = useRequirementsStore()

  const [showFilters, setShowFilters] = useState(false)
  const [showRequirementDialog, setShowRequirementDialog] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editingRequirement, setEditingRequirement] = useState<Requirement | null>(null)

  // 项目列表
  const [projects, setProjects] = useState<any[]>([])
  const [loadingProjects, setLoadingProjects] = useState(false)
  const [selectedProject, setSelectedProject] = useState('')

  // 加载项目列表
  useEffect(() => {
    const loadProjects = async () => {
      setLoadingProjects(true)
      try {
        const response = await projectsAPI.getProjects()
        // API拦截器已经返回response.data，所以直接访问data.projects
        const projectList = response.data?.projects || []
        setProjects(projectList)
        
        // 如果有初始项目ID，设置选中的项目（但不需要再次获取需求，已在父组件处理）
        if (initialProjectId) {
          setSelectedProject(initialProjectId)
        }
      } catch (error) {
        console.error('加载项目列表失败:', error)
        setProjects([])
      } finally {
        setLoadingProjects(false)
      }
    }
    loadProjects()
  }, [initialProjectId])

  const handleFilterChange = (filterType: 'status' | 'priority' | 'assignee' | 'project', value: string) => {
    const currentFilter = filter[filterType] || []
    let newFilter

    if (currentFilter.includes(value)) {
      // 移除筛选条件
      newFilter = currentFilter.filter((item: string) => item !== value)
    } else {
      // 添加筛选条件
      newFilter = [...currentFilter, value]
    }

    setFilter({ [filterType]: newFilter })
    // 筛选在本地进行，不需要重新获取数据
  }

  const clearFilter = (filterType: string) => {
    setFilter({ [filterType]: [] })
    // 筛选在本地进行，不需要重新获取数据
  }

  const clearAllFilters = () => {
    setFilter({ status: [], priority: [], assignee: [], project: [] })
    setSelectedProject('')
    // 筛选在本地进行，不需要重新获取数据
  }

  // 处理项目选择变化
  const handleProjectChange = (projectId: string) => {
    setSelectedProject(projectId)
    setFilter({ project: projectId ? [projectId] : [] })
    // 重新获取数据以应用项目筛选
    fetchRequirements({ projectId: projectId || undefined })
  }

  // 打开新建需求对话框
  const handleOpenNewRequirement = () => {
    setIsEditing(false)
    setEditingRequirement(null)
    setShowRequirementDialog(true)
  }

  // 打开编辑需求对话框
  const handleOpenEditRequirement = (requirement: Requirement) => {
    setIsEditing(true)
    setEditingRequirement(requirement)
    setShowRequirementDialog(true)
  }

  // 保存需求(新建或编辑)
  const handleSaveRequirement = async (data: any) => {
    try {
      if (isEditing && editingRequirement) {
        await updateRequirement(editingRequirement._id, data)
        toast.success('需求更新成功', '操作成功')
      } else {
        await addRequirement(data as any)
        toast.success('需求创建成功', '操作成功')
      }
      setShowRequirementDialog(false)
      setEditingRequirement(null)
      setIsEditing(false)
      
      // 如果是从项目详情跳转过来的,保存成功后返回项目详情
      if (initialProjectId && !isEditing) {
        setTimeout(() => {
          navigate(`/projects/${initialProjectId}`)
        }, 500)
      } else {
        fetchRequirements()
      }
    } catch (error) {
      console.error('保存需求失败:', error)
      toast.error('保存需求失败,请重试', '操作失败')
    }
  }

  // 取消对话框
  const handleCancelDialog = () => {
    setShowRequirementDialog(false)
    setEditingRequirement(null)
    setIsEditing(false)
  }

  // 获取导出用筛选后的需求及表头、行数据
  const getExportData = (): { filteredRequirements: Requirement[]; headers: string[]; rows: (string | number)[][] } | null => {
    let filtered = requirements
    if (filter.status?.length) filtered = filtered.filter(req => filter.status.includes(req.status))
    if (filter.priority?.length) filtered = filtered.filter(req => filter.priority.includes(req.priority))
    if (filter.assignee?.length) {
      filtered = filtered.filter(req => {
        const assigneeName = typeof req.assignee === 'object' ? req.assignee?.username || '' : req.assignee || ''
        return filter.assignee!.includes(assigneeName)
      })
    }
    if (searchQuery?.trim()) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(req =>
        (req.title && req.title.toLowerCase().includes(q)) ||
        (req.description && req.description.toLowerCase().includes(q)) ||
        (req.tags && req.tags.some(tag => tag.toLowerCase().includes(q)))
      )
    }
    if (filtered.length === 0) return null

    const typeMap: Record<string, string> = {
      feature: '功能',
      bug: '缺陷',
      improvement: '改进',
      task: '任务'
    }
    const priorityMap: Record<string, string> = {
      critical: '紧急',
      high: '高',
      medium: '中',
      low: '低'
    }
    const statusMap: Record<string, string> = {
      todo: '待处理',
      'in-progress': '进行中',
      done: '已完成',
      blocked: '已阻塞'
    }
    const headers = ['ID', '标题', '描述', '类型', '优先级', '状态', '指派人', '创建时间', '更新时间', '标签']
    const rows = filtered.map(req => {
      const assigneeName = typeof req.assignee === 'object' ? req.assignee?.username || '未指派' : req.assignee || '未指派'
      return [
        req.businessId || req._id,
        req.title,
        req.description || '',
        typeMap[req.type] || req.type,
        priorityMap[req.priority] || req.priority,
        statusMap[req.status] || req.status,
        assigneeName,
        req.createdAt || '',
        req.updatedAt || '',
        (req.tags || []).join('; ')
      ]
    })
    return { filteredRequirements: filtered, headers, rows }
  }

  // 导出为 CSV
  const handleExportCsv = () => {
    try {
      const data = getExportData()
      if (!data) {
        alert('没有可导出的需求')
        return
      }
      const { filteredRequirements, headers, rows } = data
      const escapeCSV = (value: any) => {
        const str = String(value)
        if (str.includes(',') || str.includes('"') || str.includes('\n')) return '"' + str.replace(/"/g, '""') + '"'
        return str
      }
      const csvContent = [headers.map(escapeCSV).join(','), ...rows.map(row => row.map(escapeCSV).join(','))].join('\n')
      const BOM = '\uFEFF'
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.href = url
      link.download = `需求列表_${new Date().toISOString().split('T')[0]}.csv`
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      setTimeout(() => { document.body.removeChild(link); URL.revokeObjectURL(url) }, 100)
    } catch (error) {
      console.error('[Export] CSV导出失败:', error)
      alert(`导出失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  // 导出为 Excel
  const handleExportExcel = () => {
    try {
      const data = getExportData()
      if (!data) {
        alert('没有可导出的需求')
        return
      }
      const { filteredRequirements, headers, rows } = data
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
      const colWidths = [
        { wch: 24 }, { wch: 30 }, { wch: 40 }, { wch: 8 }, { wch: 8 }, { wch: 10 },
        { wch: 12 }, { wch: 22 }, { wch: 22 }, { wch: 20 }
      ]
      ws['!cols'] = colWidths
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, '需求列表')
      const today = new Date().toISOString().split('T')[0]
      XLSX.writeFile(wb, `需求列表_${today}.xlsx`)
    } catch (error) {
      console.error('[Export] Excel导出失败:', error)
      alert(`导出失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  const statusOptions = [
    { value: 'todo', label: '待处理', color: 'bg-gray-100 text-gray-800' },
    { value: 'in-progress', label: '进行中', color: 'bg-blue-100 text-blue-800' },
    { value: 'done', label: '已完成', color: 'bg-green-100 text-green-800' },
    { value: 'blocked', label: '已阻塞', color: 'bg-rose-100 text-rose-800' }
  ]

  const priorityOptions = [
    { value: 'critical', label: '紧急', color: 'bg-red-100 text-red-800' },
    { value: 'high', label: '高', color: 'bg-orange-100 text-orange-800' },
    { value: 'medium', label: '中', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'low', label: '低', color: 'bg-green-100 text-green-800' }
  ]

  return (
    <>
      <Card className="mb-3">
        <CardContent className="p-4">
          {/* 错误提示 */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
              <div className="flex items-center justify-between">
                <span>{error}</span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => fetchRequirements()}
                  className="h-6 px-2 text-red-700"
                >
                  重试
                </Button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            {/* 左侧：搜索和筛选 */}
            <div className="flex items-center space-x-4 flex-1">
              <div className="relative w-80">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="搜索需求..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4"
                />
              </div>

              {/* 项目筛选 */}
              <div className="flex items-center space-x-2">
                <Folder className="h-4 w-4 text-gray-400" />
                <select
                  value={selectedProject}
                  onChange={(e) => handleProjectChange(e.target.value)}
                  className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  disabled={loadingProjects}
                >
                  <option value="">所有项目</option>
                  {projects.map(project => (
                    <option key={project._id} value={project._id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-2" />
                筛选
              </Button>
            </div>

            {/* 右侧：操作按钮 */}
            <div className="flex items-center space-x-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    导出
                    <ChevronDown className="h-4 w-4 ml-1 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleExportCsv}>
                    导出为 CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportExcel}>
                    导出为 Excel
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button className="bg-primary-600 hover:bg-primary-700" onClick={handleOpenNewRequirement}>
                <Plus className="h-4 w-4 mr-2" />
                新建需求
              </Button>
            </div>
          </div>

          {/* 筛选面板 */}
          {showFilters && (
            <div className="mt-4 p-4 bg-gray-50 rounded-md">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 状态筛选 */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">状态</h4>
                  <div className="space-y-2">
                    {statusOptions.map(option => (
                      <label key={option.value} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={filter.status?.includes(option.value) || false}
                          onChange={() => handleFilterChange('status', option.value)}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <Badge className={option.color}>
                          {option.label}
                        </Badge>
                      </label>
                    ))}
                  </div>
                </div>

                {/* 优先级筛选 */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">优先级</h4>
                  <div className="space-y-2">
                    {priorityOptions.map(option => (
                      <label key={option.value} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={filter.priority?.includes(option.value) || false}
                          onChange={() => handleFilterChange('priority', option.value)}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <Badge className={option.color}>
                          {option.label}
                        </Badge>
                      </label>
                    ))}
                  </div>
                </div>

                {/* 指派人筛选 */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">指派人</h4>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={filter.assignee?.includes('张三') || false}
                        onChange={() => handleFilterChange('assignee', '张三')}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm">张三</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={filter.assignee?.includes('李四') || false}
                        onChange={() => handleFilterChange('assignee', '李四')}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm">李四</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={filter.assignee?.includes('王五') || false}
                        onChange={() => handleFilterChange('assignee', '王五')}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm">王五</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={filter.assignee?.includes('赵六') || false}
                        onChange={() => handleFilterChange('assignee', '赵六')}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm">赵六</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 当前筛选条件显示 */}
          {(filter.status?.length > 0 || filter.priority?.length > 0 || filter.assignee?.length > 0 || filter.project?.length > 0) && (
            <div className="mt-3 flex items-center space-x-2">
              <span className="text-sm text-gray-600">筛选条件:</span>
              <div className="flex items-center space-x-2 flex-wrap">
                {/* 项目筛选条件 */}
                {filter.project && filter.project.length > 0 && filter.project.map(projectId => {
                  const project = projects.find(p => p._id === projectId)
                  return project ? (
                    <Badge key={projectId} className="bg-indigo-100 text-indigo-800">
                      <Folder className="h-3 w-3 mr-1" />
                      {project.name}
                      <button
                        onClick={() => handleProjectChange('')}
                        className="ml-1 text-indigo-700 hover:text-indigo-900"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ) : null
                })}

                {/* 状态筛选条件 */}
                {filter.status && filter.status.length > 0 && filter.status.map(status => {
                  const option = statusOptions.find(opt => opt.value === status)
                  return option ? (
                    <Badge key={status} className={option.color}>
                      {option.label}
                      <button
                        onClick={() => handleFilterChange('status', status)}
                        className="ml-1 text-gray-700 hover:text-gray-900"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ) : null
                })}

                {/* 优先级筛选条件 */}
                {filter.priority && filter.priority.length > 0 && filter.priority.map(priority => {
                  const option = priorityOptions.find(opt => opt.value === priority)
                  return option ? (
                    <Badge key={priority} className={option.color}>
                      {option.label}
                      <button
                        onClick={() => handleFilterChange('priority', priority)}
                        className="ml-1 text-gray-700 hover:text-gray-900"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ) : null
                })}

                {/* 指派人筛选条件 */}
                {filter.assignee && filter.assignee.length > 0 && filter.assignee.map(assignee => (
                  <Badge key={assignee} className="bg-purple-100 text-purple-800">
                    {assignee}
                    <button
                      onClick={() => handleFilterChange('assignee', assignee)}
                      className="ml-1 text-purple-700 hover:text-purple-900"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}

                {/* 清除所有筛选条件 */}
                {(filter.status?.length > 0 || filter.priority?.length > 0 || filter.assignee?.length > 0 || filter.project?.length > 0) && (
                  <button
                    onClick={clearAllFilters}
                    className="text-xs text-gray-500 hover:text-gray-700 underline"
                  >
                    清除所有
                  </button>
                )}
              </div>
            </div>
          )}
      </CardContent>
    </Card>

    {/* 需求对话框（新建/编辑） */}
    {showRequirementDialog && (
      <RequirementDialog
        isOpen={showRequirementDialog}
        isEditing={isEditing}
        requirement={editingRequirement}
        onCancel={handleCancelDialog}
        onSave={handleSaveRequirement}
        initialProjectId={selectedProject} // 传递当前选中的项目ID
      />
    )}
    </>
  )
}

export default RequirementsToolbar
