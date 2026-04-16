import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Calendar,
  Users,
  Settings,
  MoreHorizontal,
  Plus,
  FileText,
  Search,
  X
} from 'lucide-react'
import { projectsAPI } from '../services/projects-api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import AddTaskDialog from '@/components/AddTaskDialog'
import ManageMembersDialog from '@/components/ManageMembersDialog'
import ProjectSettingsDialog from '@/components/ProjectSettingsDialog'
import ExportReportDialog from '@/components/ExportReportDialog'
import RequirementDialog from '@/components/RequirementDialog'
import TaskDetailDialog from '@/components/TaskDetailDialog'
import ConfirmDialog from '@/components/ui/confirm-dialog'
import { toast } from '@/components/ui/toast-container'
import { Pagination } from '@/components/ui/pagination'

interface Project {
  _id: string
  name: string
  description: string
  status: '规划中' | '进行中' | '测试中' | '已完成' | '已归档'
  priority: '低' | '中' | '高' | '紧急'
  owner: {
    _id: string
    username: string
    email: string
  }
  members: Array<{
    user: {
      _id: string
      username: string
      email?: string
    }
    role: string
    joinedAt: string
  }>
  startDate?: string
  endDate?: string
  progress: number
  createdAt: string
  updatedAt: string
}

interface Task {
  _id: string
  title: string
  description: string
  status: '待办' | '进行中' | '已完成' | '已阻塞'
  priority: '低' | '中' | '高' | '紧急'
  assignee: {
    _id: string
    username: string
  }
  dueDate: string
  createdAt: string
}

const ProjectDetail = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [project, setProject] = useState<Project | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [requirements, setRequirements] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAddTaskDialogOpen, setIsAddTaskDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [isManageMembersOpen, setIsManageMembersOpen] = useState(false)
  const [isProjectSettingsOpen, setIsProjectSettingsOpen] = useState(false)
  const [isExportReportOpen, setIsExportReportOpen] = useState(false)
  const [isAddRequirementOpen, setIsAddRequirementOpen] = useState(false)
  const [viewingRequirement, setViewingRequirement] = useState<any>(null)
  const [viewingTask, setViewingTask] = useState<Task | null>(null)
  const [taskSearchTerm, setTaskSearchTerm] = useState('')
  const [requirementSearchTerm, setRequirementSearchTerm] = useState('')
  
  // 分页状态
  const [taskPagination, setTaskPagination] = useState({
    current: 1,
    pages: 1,
    total: 0,
    limit: 10
  })
  const [requirementPagination, setRequirementPagination] = useState({
    current: 1,
    pages: 1,
    total: 0,
    limit: 10
  })
  
  // 确认对话框状态
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    type: 'warning' as 'danger' | 'warning' | 'info' | 'success',
    title: '',
    message: '',
    onConfirm: () => {},
  })

  // 从API获取项目数据
  useEffect(() => {
    if (!id) return

    const fetchProjectData = async () => {
      try {
        setIsLoading(true)
        const [projectResponse, tasksResponse, requirementsResponse] = await Promise.all([
          projectsAPI.getProject(id),
          projectsAPI.getTasks(id, { page: 1, limit: taskPagination.limit }),
          projectsAPI.getProjectRequirements(id, { page: 1, limit: requirementPagination.limit })
        ])
        setProject(projectResponse.data.project)
        setTasks(tasksResponse.data.tasks || [])
        if (tasksResponse.data.pagination) {
          setTaskPagination(tasksResponse.data.pagination)
        }
        const reqData = requirementsResponse.data
        setRequirements(Array.isArray(reqData)
          ? reqData
          : Array.isArray(reqData?.data)
            ? reqData.data
            : [])
        if (requirementsResponse.data?.pagination) {
          setRequirementPagination(requirementsResponse.data.pagination)
        }
      } catch (error) {
        console.error('获取项目数据失败:', error)
        toast.error('获取项目详情失败，请刷新重试', '加载失败')
      } finally {
        setIsLoading(false)
      }
    }

    fetchProjectData()
  }, [id])

  const getStatusColor = (status: string) => {
    switch (status) {
      case '规划中': return 'bg-blue-50 text-blue-700 border border-blue-200'
      case '进行中': return 'bg-emerald-50 text-emerald-700 border border-emerald-200'
      case '测试中': return 'bg-amber-50 text-amber-700 border border-amber-200'
      case '已完成': return 'bg-slate-50 text-slate-700 border border-slate-200'
      case '已归档': return 'bg-gray-50 text-gray-600 border border-gray-300'
      default: return 'bg-gray-50 text-gray-700 border border-gray-200'
    }
  }

  const getStatusText = (status: string) => {
    return status
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case '紧急': return 'bg-red-50 text-red-700 border border-red-200 font-semibold'
      case '高': return 'bg-orange-50 text-orange-700 border border-orange-200 font-medium'
      case '中': return 'bg-blue-50 text-blue-700 border border-blue-200'
      case '低': return 'bg-emerald-50 text-emerald-700 border border-emerald-200'
      default: return 'bg-gray-50 text-gray-700 border border-gray-200'
    }
  }

  const getPriorityText = (priority: string) => {
    return priority
  }

  const getRoleText = (role: string) => {
    switch (role) {
      case 'owner': return '项目负责人'
      case 'pm': return '产品经理'
      case 'developer': return '开发工程师'
      case 'designer': return '设计师'
      case 'tester': return '测试工程师'
      default: return role
    }
  }

  const getTaskStatusColor = (status: string) => {
    switch (status) {
      case '待办': return 'bg-slate-50 text-slate-700 border border-slate-200'
      case '进行中': return 'bg-blue-50 text-blue-700 border border-blue-200'
      case '已完成': return 'bg-emerald-50 text-emerald-700 border border-emerald-200'
      case '已阻塞': return 'bg-red-50 text-red-700 border border-red-200'
      default: return 'bg-gray-50 text-gray-700 border border-gray-200'
    }
  }

  const getTaskStatusText = (status: string) => {
    return status
  }

  // 处理进度更新
  const handleUpdateProgress = async (progress: number) => {
    if (!id) return

    try {
      console.log('[ProjectDetail] 更新项目进度:', id, progress)
      await projectsAPI.updateProject(id, { progress })
      console.log('[ProjectDetail] 进度更新成功')
      
      // 重新获取项目数据以更新UI
      const projectResponse = await projectsAPI.getProject(id)
      setProject(projectResponse.data.project)
      toast.success(`项目进度已更新至 ${progress}%`, '更新成功')
    } catch (error) {
      console.error('[ProjectDetail] 更新进度失败:', error)
      toast.error('更新进度失败，请重试', '操作失败')
    }
  }

  // 处理任务操作
  const handleTaskEdit = (e: React.MouseEvent, task: Task) => {
    e.stopPropagation()
    console.log('[ProjectDetail] 编辑任务:', task._id)
    setEditingTask(task)
    setIsAddTaskDialogOpen(true)
  }

  const handleTaskComplete = (e: React.MouseEvent, task: Task) => {
    e.stopPropagation()
    setConfirmDialog({
      isOpen: true,
      type: 'success',
      title: '标记任务完成',
      message: `确定要将任务"${task.title}"标记为已完成吗？`,
        onConfirm: async () => {
        console.log('[ProjectDetail] 标记任务完成:', task._id)
        try {
          await projectsAPI.updateTask(task._id, { status: '已完成' })
          console.log('[ProjectDetail] 任务状态更新成功')
          toast.success('任务已标记为完成', '任务完成')
          refreshTasks()
          setConfirmDialog(prev => ({ ...prev, isOpen: false }))
        } catch (error) {
          console.error('[ProjectDetail] 更新任务状态失败:', error)
          toast.error('更新任务状态失败，请重试', '操作失败')
          setConfirmDialog(prev => ({ ...prev, isOpen: false }))
        }
      }
    })
  }

  const handleTaskDelete = (e: React.MouseEvent, task: Task) => {
    e.stopPropagation()
    setConfirmDialog({
      isOpen: true,
      type: 'danger',
      title: '删除任务',
      message: `确定要删除任务"${task.title}"吗？删除后将无法恢复，此操作不可撤销！`,
      onConfirm: async () => {
        console.log('[ProjectDetail] 删除任务:', task._id)
        try {
          await projectsAPI.deleteTask(task._id)
          console.log('[ProjectDetail] 任务删除成功')
          toast.success('任务已删除', '删除成功')
          refreshTasks()
          setConfirmDialog(prev => ({ ...prev, isOpen: false }))
        } catch (error) {
          console.error('[ProjectDetail] 删除任务失败:', error)
          toast.error('删除任务失败，请重试', '操作失败')
          setConfirmDialog(prev => ({ ...prev, isOpen: false }))
        }
      }
    })
  }

  // 处理添加成员
  const handleAddMember = () => {
    console.log('[ProjectDetail] 打开成员管理')
    setIsManageMembersOpen(true)
  }

  // 处理项目设置
  const handleProjectSettings = () => {
    console.log('[ProjectDetail] 打开项目设置')
    setIsProjectSettingsOpen(true)
  }

  // 处理导出报告
  const handleExportReport = () => {
    console.log('[ProjectDetail] 打开导出报告')
    setIsExportReportOpen(true)
  }

  // 处理添加需求 - 直接打开对话框
  const handleAddRequirement = () => {
    console.log('[ProjectDetail] 打开添加需求对话框')
    setIsAddRequirementOpen(true)
  }

  // 处理查看需求详情
  const handleViewRequirement = (requirement: any) => {
    console.log('[ProjectDetail] 查看需求详情:', requirement._id)
    setViewingRequirement(requirement)
  }

  // 处理删除需求
  const handleDeleteRequirement = (e: React.MouseEvent, requirement: any) => {
    e.stopPropagation()
    setConfirmDialog({
      isOpen: true,
      type: 'danger',
      title: '删除需求',
      message: `确定要删除需求"${requirement.title}"吗？删除后将无法恢复，此操作不可撤销！`,
      onConfirm: async () => {
        console.log('[ProjectDetail] 删除需求:', requirement._id)
        try {
          const response = await projectsAPI.deleteRequirement(requirement._id)
          console.log('[ProjectDetail] 需求删除成功，响应:', response)
          
          // 检查响应是否成功
          if (response && response.success !== false) {
            toast.success('需求已删除', '删除成功')
            await refreshRequirements()
          } else {
            throw new Error(response?.message || '删除失败，服务器返回异常')
          }
          
          setConfirmDialog(prev => ({ ...prev, isOpen: false }))
        } catch (error: any) {
          console.error('[ProjectDetail] 删除需求失败:', error)
          
          // 提供更详细的错误信息
          let errorMessage = '删除需求失败，请重试'
          if (error.message) {
            if (error.message.includes('Network Error') || error.message.includes('ERR_NETWORK')) {
              errorMessage = '网络连接失败，请检查后端服务器是否正常运行'
            } else if (error.message.includes('timeout')) {
              errorMessage = '请求超时，请稍后重试'
            } else {
              errorMessage = `删除失败: ${error.message}`
            }
          }
          
          toast.error(errorMessage, '操作失败')
          setConfirmDialog(prev => ({ ...prev, isOpen: false }))
        }
      }
    })
  }

  // 处理上传文档
  const handleUploadDocument = () => {
    toast.warning('文档管理功能正在开发中，敬请期待', '功能提示')
  }

  // 处理添加任务
  const handleAddTask = () => {
    console.log('[ProjectDetail] 打开添加任务对话框')
    setEditingTask(null)
    setIsAddTaskDialogOpen(true)
  }

  // 格式化日期显示
  const formatDate = (dateString?: string) => {
    if (!dateString) return '未设置'
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      })
    } catch (error) {
      return dateString
    }
  }

  // 刷新任务列表
  const refreshTasks = async (page?: number) => {
    if (!id) return
    
    try {
      const currentPage = page || taskPagination.current
      const tasksResponse = await projectsAPI.getTasks(id, { 
        page: currentPage, 
        limit: taskPagination.limit 
      })
      console.log('[ProjectDetail] 刷新任务列表:', tasksResponse)
      setTasks(tasksResponse.data.tasks || [])
      if (tasksResponse.data.pagination) {
        setTaskPagination(tasksResponse.data.pagination)
      }
    } catch (error) {
      console.error('[ProjectDetail] 刷新任务列表失败:', error)
    }
  }

  // 刷新需求列表
  const refreshRequirements = async (page?: number) => {
    if (!id) return
    
    try {
      const currentPage = page || requirementPagination.current
      const requirementsResponse = await projectsAPI.getProjectRequirements(id, { 
        page: currentPage, 
        limit: requirementPagination.limit 
      })
      console.log('[ProjectDetail] 刷新需求列表:', requirementsResponse)
      const reqData = requirementsResponse.data
      setRequirements(Array.isArray(reqData)
        ? reqData
        : Array.isArray(reqData?.data)
          ? reqData.data
          : [])
      if (requirementsResponse.data?.pagination) {
        setRequirementPagination(requirementsResponse.data.pagination)
      }
    } catch (error) {
      console.error('[ProjectDetail] 刷新需求列表失败:', error)
    }
  }

  // 处理保存需求
  const handleSaveRequirement = async (data: any) => {
    try {
      console.log('[ProjectDetail] 保存需求:', data)
      // 确保项目ID被设置
      const requirementData = {
        ...data,
        projectId: id
      }
      await projectsAPI.createRequirement(requirementData)
      console.log('[ProjectDetail] 需求创建成功')
      toast.success('需求创建成功', '创建成功')
      setIsAddRequirementOpen(false)
      refreshRequirements()
    } catch (error) {
      console.error('[ProjectDetail] 创建需求失败:', error)
      toast.error('创建需求失败，请重试', '操作失败')
    }
  }

  // 刷新项目数据（用于成员更新后）
  const refreshProject = async () => {
    if (!id) return
    
    try {
      const projectResponse = await projectsAPI.getProject(id)
      setProject(projectResponse.data.project)
    } catch (error) {
      console.error('[ProjectDetail] 刷新项目数据失败:', error)
    }
  }

  // 处理任务页码变化
  const handleTaskPageChange = (page: number) => {
    setTaskPagination(prev => ({ ...prev, current: page }))
    refreshTasks(page)
  }

  // 处理需求页码变化
  const handleRequirementPageChange = (page: number) => {
    setRequirementPagination(prev => ({ ...prev, current: page }))
    refreshRequirements(page)
  }

  // 根据搜索词过滤任务
  const filteredTasks = tasks.filter(task => {
    if (!taskSearchTerm.trim()) return true
    
    const searchLower = taskSearchTerm.toLowerCase()
    return (
      task.title.toLowerCase().includes(searchLower) ||
      task.description.toLowerCase().includes(searchLower) ||
      task.assignee.username.toLowerCase().includes(searchLower) ||
      task.status.toLowerCase().includes(searchLower) ||
      task.priority.toLowerCase().includes(searchLower)
    )
  })

  // 根据搜索词过滤需求
  const filteredRequirements = requirements.filter(req => {
    if (!requirementSearchTerm.trim()) return true
    
    const searchLower = requirementSearchTerm.toLowerCase()
    return (
      req.title?.toLowerCase().includes(searchLower) ||
      req.description?.toLowerCase().includes(searchLower) ||
      req.assignee?.username?.toLowerCase().includes(searchLower) ||
      req.status?.toLowerCase().includes(searchLower) ||
      req.priority?.toLowerCase().includes(searchLower)
    )
  })

  // 获取需求优先级颜色
  const getRequirementPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // 获取需求状态颜色
  const getRequirementStatusColor = (status: string) => {
    switch (status) {
      case 'todo': return 'bg-slate-100 text-slate-800 border-slate-200'
      case 'in-progress': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'done': return 'bg-green-100 text-green-800 border-green-200'
      case 'blocked': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // 获取需求状态文本
  const getRequirementStatusText = (status: string) => {
    switch (status) {
      case 'todo': return '待处理'
      case 'in-progress': return '进行中'
      case 'done': return '已完成'
      case 'blocked': return '已阻塞'
      default: return status
    }
  }

  // 获取需求优先级文本
  const getRequirementPriorityText = (priority: string) => {
    switch (priority) {
      case 'critical': return '紧急'
      case 'high': return '高'
      case 'medium': return '中'
      case 'low': return '低'
      default: return priority
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载项目详情中...</p>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <h2 className="text-xl font-medium text-gray-900 mb-4">项目不存在</h2>
          <Button onClick={() => navigate('/projects')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回项目列表
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 头部操作栏 - 高级设计 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => navigate('/projects')} className="hover:bg-primary-50 hover:text-primary-700">
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
          <div className="flex items-center space-x-2">
            <Badge className={getStatusColor(project.status)}>
              {getStatusText(project.status)}
            </Badge>
            <Badge className={getPriorityColor(project.priority)}>
              {getPriorityText(project.priority)}
            </Badge>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="border-primary-200 hover:bg-primary-50 hover:border-primary-300">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="border border-gray-200 shadow-lg">
              <DropdownMenuItem onClick={handleExportReport} className="hover:bg-primary-50">
                <FileText className="h-4 w-4 mr-2" />
                导出报告
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleAddMember}
                disabled={project.status === '已归档'}
                className={project.status === '已归档' ? 'opacity-50 cursor-not-allowed' : 'hover:bg-primary-50'}
              >
                <Users className="h-4 w-4 mr-2" />
                管理成员
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleProjectSettings}
                disabled={project.status === '已归档'}
                className={project.status === '已归档' ? 'opacity-50 cursor-not-allowed' : 'hover:bg-primary-50'}
              >
                <Settings className="h-4 w-4 mr-2" />
                项目设置
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* 项目概览 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="border border-gray-200/60 shadow-sm hover:shadow-md transition-shadow duration-300">
            <CardHeader className="border-b border-gray-100">
              <CardTitle className="text-gray-800 font-semibold">项目详情</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <h3 className="text-sm font-semibold text-gray-500 mb-2">描述</h3>
                <p className="text-gray-700 leading-relaxed">{project.description}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 mb-2">开始日期</h3>
                  <div className="flex items-center text-gray-700">
                    <Calendar className="h-4 w-4 mr-2 text-blue-500" />
                    <span className="font-medium">{formatDate(project.startDate)}</span>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 mb-2">结束日期</h3>
                  <div className="flex items-center text-gray-700">
                    <Calendar className="h-4 w-4 mr-2 text-blue-500" />
                    <span className="font-medium">{formatDate(project.endDate)}</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">进度</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-gray-700">完成度</span>
                    <span className="font-bold text-primary-600">{project.progress}%</span>
                  </div>
                  <div className="w-full bg-gradient-to-r from-gray-100 to-gray-50 rounded-full h-3 shadow-inner overflow-hidden">
                    <div
                      className="bg-primary-500 h-3 rounded-full transition-all duration-500 relative overflow-hidden"
                      style={{ width: `${project.progress}%` }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-t from-white/20 to-transparent"></div>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    {[0, 25, 50, 75, 100].map(value => (
                      <button
                        key={value}
                        onClick={() => handleUpdateProgress(value)}
                        disabled={project.status === '已归档'}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all duration-200 ${
                          project.status === '已归档'
                            ? 'opacity-50 cursor-not-allowed bg-gray-100 text-gray-400 border-gray-200'
                            : project.progress === value
                              ? 'bg-primary-500 text-white border-primary-500'
                              : 'bg-white text-gray-600 border-gray-300 hover:border-primary-400 hover:shadow-sm hover:bg-primary-50'
                        }`}
                      >
                        {value}%
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* 项目成员 - 高级设计 */}
        <Card className="border border-gray-200/60 shadow-sm hover:shadow-lg transition-shadow duration-300 bg-gradient-to-br from-white to-gray-50/30">
          <CardHeader className="flex flex-row items-center justify-between border-b border-gray-100">
            <CardTitle className="text-gray-800 flex items-center">
              <Users className="w-5 h-5 mr-2 text-primary-600" />
              项目成员
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddMember}
              disabled={project.status === '已归档'}
              className="border-primary-200 text-primary-600 hover:bg-primary-50 hover:border-primary-300"
            >
              <Plus className="h-4 w-4 mr-2" />
              添加成员
            </Button>
          </CardHeader>
          <CardContent className="space-y-4 pt-5">
            <div className="space-y-3">
              {project.members.map((member) => (
                <div key={member.user._id} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors duration-150 group">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center border-2 border-white shadow-sm group-hover:scale-110 transition-transform duration-200">
                      <span className="text-white font-bold text-sm">
                        {member.user.username.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-800">{member.user.username}</div>
                      <div className="text-xs text-gray-500">{getRoleText(member.role)}</div>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs border-primary-200 text-primary-700 bg-primary-50/50">
                    {getRoleText(member.role)}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 项目详情标签页 */}
      <Tabs defaultValue="tasks" className="mt-6">
        <TabsList className="bg-gray-50 border border-gray-200/60 p-1">
          <TabsTrigger value="tasks" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">任务</TabsTrigger>
          <TabsTrigger value="requirements" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">需求</TabsTrigger>
          <TabsTrigger value="documents" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">文档</TabsTrigger>
          <TabsTrigger value="activity" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">活动</TabsTrigger>
        </TabsList>
        
        <TabsContent value="tasks" className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold">项目任务</h2>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索任务..."
                  value={taskSearchTerm}
                  onChange={(e) => setTaskSearchTerm(e.target.value)}
                  className="pl-9 pr-9 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent w-64"
                />
                {taskSearchTerm && (
                  <button
                    onClick={() => setTaskSearchTerm('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <Button onClick={handleAddTask} disabled={project.status === 'archived'}>
                <Plus className="h-4 w-4 mr-2" />
                添加任务
              </Button>
            </div>
          </div>
          
          {filteredTasks.length === 0 && taskSearchTerm ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">未找到匹配的任务</h3>
                  <p className="text-gray-500 mb-4">尝试使用其他关键词搜索</p>
                  <Button variant="outline" onClick={() => setTaskSearchTerm('')}>
                    清除搜索
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                {filteredTasks.map((task) => (
              <Card
                key={task._id}
                className="cursor-pointer hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:border-primary-200 group bg-gradient-to-br from-white to-gray-50/20 hover:-translate-y-1"
                onClick={() => setViewingTask(task)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="font-semibold text-gray-800">{task.title}</h3>
                        <Badge className={`${getTaskStatusColor(task.status)} font-medium`}>
                          {getTaskStatusText(task.status)}
                        </Badge>
                        <Badge className={`${getPriorityColor(task.priority)} font-medium`}>
                          {getPriorityText(task.priority)}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-3 leading-relaxed">{task.description}</p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span className="font-medium">负责人: {task.assignee.username}</span>
                        <span className="font-medium">截止日期: {formatDate(task.dueDate)}</span>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()} className="opacity-60 group-hover:opacity-100 transition-opacity duration-200 hover:bg-primary-50">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="border border-gray-200 shadow-lg">
                        <DropdownMenuItem onClick={(e) => handleTaskEdit(e, task)} className="hover:bg-primary-50">
                          编辑
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => handleTaskComplete(e, task)} className="hover:bg-primary-50">
                          标记完成
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => handleTaskDelete(e, task)} className="hover:bg-red-50 text-red-600">
                          删除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
              ))}
            </div>
              {/* 只有在没有搜索词时才显示分页 */}
              {!taskSearchTerm && (
                <Pagination
                  currentPage={taskPagination.current}
                  totalPages={taskPagination.pages}
                  total={taskPagination.total}
                  pageSize={taskPagination.limit}
                  onPageChange={handleTaskPageChange}
                />
              )}
            </>
          )}
        </TabsContent>
        
        <TabsContent value="requirements" className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold">项目需求</h2>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索需求..."
                  value={requirementSearchTerm}
                  onChange={(e) => setRequirementSearchTerm(e.target.value)}
                  className="pl-9 pr-9 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent w-64"
                />
                {requirementSearchTerm && (
                  <button
                    onClick={() => setRequirementSearchTerm('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <Button onClick={handleAddRequirement} disabled={project.status === 'archived'}>
                <Plus className="h-4 w-4 mr-2" />
                添加需求
              </Button>
            </div>
          </div>
          
          {filteredRequirements.length === 0 && requirementSearchTerm ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">未找到匹配的需求</h3>
                  <p className="text-gray-500 mb-4">尝试使用其他关键词搜索</p>
                  <Button variant="outline" onClick={() => setRequirementSearchTerm('')}>
                    清除搜索
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : filteredRequirements.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">暂无需求</h3>
                  <p className="text-gray-500 mb-4">开始添加项目需求</p>
                  <Button onClick={handleAddRequirement} disabled={project.status === 'archived'}>
                    <Plus className="h-4 w-4 mr-2" />
                    添加需求
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                {filteredRequirements.map((req) => (
                <Card
                  key={req._id}
                  className="cursor-pointer hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:border-primary-200 group bg-gradient-to-br from-white to-gray-50/20 hover:-translate-y-1"
                  onClick={() => handleViewRequirement(req)}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="font-semibold text-gray-800">{req.title}</h3>
                          <Badge className={`${getRequirementStatusColor(req.status)} font-medium`}>
                            {getRequirementStatusText(req.status)}
                          </Badge>
                          <Badge className={`${getRequirementPriorityColor(req.priority)} font-medium`}>
                            {getRequirementPriorityText(req.priority)}
                          </Badge>
                          {req.type && (
                            <Badge variant="outline" className="text-xs border-primary-200 text-primary-700 bg-primary-50/50">
                              {req.type === 'feature' ? '⚡ 功能' :
                               req.type === 'bug' ? '🐛 缺陷' :
                               req.type === 'improvement' ? '📈 改进' :
                               req.type === 'task' ? '✅ 任务' : req.type}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-3 leading-relaxed">{req.description}</p>
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          {req.assignee && <span className="font-medium">指派人: {req.assignee.username}</span>}
                          {req.dueDate && <span className="font-medium">截止日期: {new Date(req.dueDate).toLocaleDateString('zh-CN')}</span>}
                          {req.storyPoints && <span className="font-medium">故事点: {req.storyPoints}</span>}
                          {req.businessId && <span className="font-medium">ID: {req.businessId}</span>}
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()} className="opacity-60 group-hover:opacity-100 transition-opacity duration-200 hover:bg-primary-50">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="border border-gray-200 shadow-lg">
                          <DropdownMenuItem onClick={(e) => handleDeleteRequirement(e, req)} className="hover:bg-red-50 text-red-600">
                            删除
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
              {/* 只有在没有搜索词时才显示分页 */}
              {!requirementSearchTerm && (
                <Pagination
                  currentPage={requirementPagination.current}
                  totalPages={requirementPagination.pages}
                  total={requirementPagination.total}
                  pageSize={requirementPagination.limit}
                  onPageChange={handleRequirementPageChange}
                />
              )}
            </>
          )}
        </TabsContent>
        
        <TabsContent value="documents">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">项目文档</h2>
            <Button onClick={handleUploadDocument}>
              <Plus className="h-4 w-4 mr-2" />
              上传文档
            </Button>
          </div>
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">暂无文档</h3>
                <p className="text-gray-500 mb-4">上传PRD文档和其他相关文件</p>
                <Button onClick={handleUploadDocument}>
                  <Plus className="h-4 w-4 mr-2" />
                  上传文档
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="activity">
          <h2 className="text-xl font-semibold mb-5 text-gray-800">项目活动</h2>
          <Card className="border border-gray-200/60 shadow-sm">
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">暂无活动记录</h3>
                <p className="text-gray-500">项目活动日志功能正在开发中</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 添加任务对话框 */}
      {id && project && (
        <AddTaskDialog
          open={isAddTaskDialogOpen}
          onOpenChange={(open) => {
            setIsAddTaskDialogOpen(open)
            if (!open) setEditingTask(null)
          }}
          projectId={id}
          onSuccess={refreshTasks}
          task={editingTask}
        />
      )}

      {/* 添加需求对话框 */}
      {id && (
        <RequirementDialog
          isOpen={isAddRequirementOpen}
          isEditing={false}
          onCancel={() => setIsAddRequirementOpen(false)}
          onSave={handleSaveRequirement}
          initialProjectId={id}
        />
      )}

      {/* 查看需求详情对话框 */}
      {viewingRequirement && (
        <RequirementDialog
          isOpen={true}
          isEditing={true}
          requirement={viewingRequirement}
          onCancel={() => setViewingRequirement(null)}
          onSave={async (data) => {
            try {
              console.log('[ProjectDetail] 更新需求:', data)
              await projectsAPI.updateRequirement(viewingRequirement._id, data)
              toast.success('需求更新成功', '更新成功')
              setViewingRequirement(null)
              refreshRequirements()
            } catch (error) {
              console.error('[ProjectDetail] 更新需求失败:', error)
              toast.error('更新需求失败，请重试', '操作失败')
            }
          }}
          initialProjectId={id}
        />
      )}

      {/* 管理成员对话框 */}
      {id && project && (
        <ManageMembersDialog
          open={isManageMembersOpen}
          onOpenChange={setIsManageMembersOpen}
          projectId={id}
          projectOwner={project.owner}
          members={project.members.filter(m => m.user._id !== project.owner._id)}
          onMembersUpdated={refreshProject}
        />
      )}

      {/* 项目设置对话框 */}
      {project && (
        <ProjectSettingsDialog
          open={isProjectSettingsOpen}
          onOpenChange={setIsProjectSettingsOpen}
          project={project}
          onSettingsUpdated={refreshProject}
        />
      )}

      {/* 导出报告对话框 */}
      {project && (
        <ExportReportDialog
          open={isExportReportOpen}
          onOpenChange={setIsExportReportOpen}
          project={project}
          tasks={tasks}
        />
      )}

      {/* 确认对话框 */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        type={confirmDialog.type}
        confirmText="确认"
        cancelText="取消"
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
      />

      {/* 任务详情对话框 */}
      <TaskDetailDialog
        open={!!viewingTask}
        onOpenChange={(open) => !open && setViewingTask(null)}
        task={viewingTask}
        onEdit={(task) => {
          setEditingTask(task)
          setIsAddTaskDialogOpen(true)
        }}
        onDelete={(task) => {
          handleTaskDelete({ stopPropagation: () => {} } as React.MouseEvent, task)
        }}
        onComplete={(task) => {
          handleTaskComplete({ stopPropagation: () => {} } as React.MouseEvent, task)
        }}
      />
    </div>
  )
}

export default ProjectDetail
