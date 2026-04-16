import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Plus, Search, Calendar, Users, MoreHorizontal, Archive, UserPlus, Trash2, 
  LayoutGrid, List, BarChart3, Download, FileSpreadsheet, FileText, ChevronDown, Minimize2, Maximize2, X
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table as DocxTable, TableRow as DocxTableRow, TableCell as DocxTableCell, WidthType, AlignmentType, BorderStyle } from 'docx'
import { saveAs } from 'file-saver'
import { projectsAPI } from '../services/projects-api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Pagination } from '@/components/ui/pagination'
import CreateProjectDialog from '@/components/CreateProjectDialog'
import EditProjectDialog from '@/components/EditProjectDialog'
import ConfirmDialog from '@/components/ui/confirm-dialog'
import { toast } from '@/components/ui/toast-container'

interface Project {
  _id: string
  name: string
  description: string
  status: 'planning' | 'in-progress' | 'testing' | 'completed' | 'archived'
  priority: 'low' | 'medium' | 'high' | 'critical'
  owner: {
    _id: string
    username: string
    email: string
  }
  members: Array<{
    user: {
      _id: string
      username: string
    }
    role: string
  }>
  startDate?: string
  endDate?: string
  progress: number
  createdAt: string
  updatedAt: string
}

type ViewMode = 'board' | 'list' | 'report'

const Projects = () => {
  const navigate = useNavigate()
  const [projects, setProjects] = useState<Project[]>([])
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('board')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [sortBy, setSortBy] = useState<'name' | 'status' | 'priority' | 'progress' | 'updatedAt'>('updatedAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [boardPageSize, setBoardPageSize] = useState(9)
  const [listCurrentPage, setListCurrentPage] = useState(1)
  const [listPageSize, setListPageSize] = useState(10)
  const [compactMode, setCompactMode] = useState(false)
  
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    type: 'warning' as 'danger' | 'warning' | 'info' | 'success',
    title: '',
    message: '',
    onConfirm: () => {},
  })

  const formatDate = (dateString?: string) => {
    if (!dateString) return '未设置'
    try {
      const date = new Date(dateString)
      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
      
      if (diffDays === 0) return '今天'
      if (diffDays === 1) return '昨天'
      if (diffDays < 7) return `${diffDays}天前`
      if (diffDays < 30) return `${Math.floor(diffDays / 7)}周前`
      
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      })
    } catch (error) {
      return dateString
    }
  }

  const formatDateFull = (dateString?: string) => {
    if (!dateString) return '未设置'
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch (error) {
      return dateString
    }
  }

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    try {
      setIsLoading(true)
      const response = await projectsAPI.getProjects({ limit: 1000 })
      console.log('[Projects] API响应:', response)
      setProjects(response.data.projects)
      setFilteredProjects(response.data.projects)
    } catch (error) {
      console.error('[Projects] 获取项目列表失败:', error)
      const errorMessage = error instanceof Error ? error.message : '未知错误'
      console.error('[Projects] 错误详情:', errorMessage)
      toast.error(`获取项目列表失败: ${errorMessage}`, '获取失败')
      setProjects([])
      setFilteredProjects([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let filtered = [...projects]

    if (searchQuery) {
      filtered = filtered.filter(project =>
        project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    if (statusFilter) {
      filtered = filtered.filter(project => project.status === statusFilter)
    }

    if (priorityFilter) {
      filtered = filtered.filter(project => project.priority === priorityFilter)
    }

    filtered.sort((a, b) => {
      let comparison = 0
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
        case 'status':
          comparison = a.status.localeCompare(b.status)
          break
        case 'priority':
          const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
          comparison = priorityOrder[a.priority] - priorityOrder[b.priority]
          break
        case 'progress':
          comparison = a.progress - b.progress
          break
        case 'updatedAt':
          comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
          break
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })

    setFilteredProjects(filtered)
  }, [projects, searchQuery, statusFilter, priorityFilter, sortBy, sortOrder])

  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case '规划中': return 'bg-blue-50 text-blue-700 border border-blue-200'
      case '进行中': return 'bg-emerald-50 text-emerald-700 border border-emerald-200'
      case '测试中': return 'bg-amber-50 text-amber-700 border border-amber-200'
      case '已完成': return 'bg-slate-50 text-slate-700 border border-slate-200'
      case '已归档': return 'bg-gray-50 text-gray-600 border border-gray-300'
      default: return 'bg-gray-50 text-gray-700 border border-gray-200'
    }
  }, [])

  const getStatusText = useCallback((status: string) => {
    // 直接返回中文状态，因为现在数据库存的是中文
    return status
  }, [])

  const getPriorityColor = useCallback((priority: string) => {
    switch (priority) {
      case '紧急': return 'bg-red-50 text-red-700 border border-red-200 font-semibold'
      case '高': return 'bg-orange-50 text-orange-700 border border-orange-200 font-medium'
      case '中': return 'bg-blue-50 text-blue-700 border border-blue-200'
      case '低': return 'bg-emerald-50 text-emerald-700 border border-emerald-200'
      default: return 'bg-gray-50 text-gray-700 border border-gray-200'
    }
  }, [])

  const getPriorityText = useCallback((priority: string) => {
    // 直接返回中文优先级，因为现在数据库存的是中文
    return priority
  }, [])

  const handleCreateProject = useCallback(() => {
    fetchProjects()
  }, [fetchProjects])

  const projectStats = useMemo(() => ({
    total: projects.length,
    byStatus: {
      planning: projects.filter(p => p.status === '规划中').length,
      inProgress: projects.filter(p => p.status === '进行中').length,
      testing: projects.filter(p => p.status === '测试中').length,
      completed: projects.filter(p => p.status === '已完成').length,
      archived: projects.filter(p => p.status === '已归档').length,
    },
    byPriority: {
      critical: projects.filter(p => p.priority === '紧急').length,
      high: projects.filter(p => p.priority === '高').length,
      medium: projects.filter(p => p.priority === '中').length,
      low: projects.filter(p => p.priority === '低').length,
    },
    avgProgress: projects.length > 0 
      ? Math.round(projects.reduce((sum, p) => sum + p.progress, 0) / projects.length)
      : 0
  }), [projects])

  const handleSort = useCallback((field: 'name' | 'status' | 'priority' | 'progress' | 'updatedAt') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('desc')
    }
  }, [sortBy, sortOrder])

  const handleExportCSV = useCallback(() => {
    try {
      if (filteredProjects.length === 0) {
        toast.warning('没有可导出的项目', '导出提示')
        return
      }

      const headers = [
        '项目名称',
        '描述',
        '状态',
        '优先级',
        '进度(%)',
        '成员数',
        '创建时间',
        '更新时间'
      ]

      const csvRows = filteredProjects.map(project => [
        `"${project.name.replace(/"/g, '""')}"`,
        `"${project.description.replace(/"/g, '""')}"`,
        getStatusText(project.status),
        getPriorityText(project.priority),
        project.progress,
        project.members.length,
        formatDateFull(project.createdAt),
        formatDateFull(project.updatedAt)
      ])

      const BOM = '\uFEFF'
      const csvContent = BOM + [headers.join(','), ...csvRows.map(row => row.join(','))].join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      
      link.setAttribute('href', url)
      link.setAttribute('download', `项目列表_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      URL.revokeObjectURL(url)
      toast.success(`成功导出 ${filteredProjects.length} 个项目到CSV`, '导出成功')
    } catch (error) {
      console.error('[Projects] 导出CSV失败:', error)
      toast.error('导出CSV失败,请重试', '导出错误')
    }
  }, [filteredProjects, getStatusText, getPriorityText, formatDateFull])

  const handleExportExcel = useCallback(() => {
    try {
      if (filteredProjects.length === 0) {
        toast.warning('没有可导出的项目', '导出提示')
        return
      }

      const data = filteredProjects.map(project => ({
        '项目名称': project.name,
        '描述': project.description,
        '状态': getStatusText(project.status),
        '优先级': getPriorityText(project.priority),
        '进度(%)': project.progress,
        '成员数': project.members.length,
        '创建时间': formatDateFull(project.createdAt),
        '更新时间': formatDateFull(project.updatedAt)
      }))

      const worksheet = XLSX.utils.json_to_sheet(data)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, '项目列表')

      XLSX.writeFile(workbook, `项目列表_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.xlsx`)
      toast.success(`成功导出 ${filteredProjects.length} 个项目到Excel`, '导出成功')
    } catch (error) {
      console.error('[Projects] 导出Excel失败:', error)
      toast.error('导出Excel失败,请重试', '导出错误')
    }
  }, [filteredProjects, getStatusText, getPriorityText, formatDateFull])

  const handleEditProject = useCallback((project: Project) => {
    setSelectedProject(project)
    setShowEditDialog(true)
  }, [])

  const handleEditSuccess = useCallback(() => {
    setShowEditDialog(false)
    setSelectedProject(null)
    fetchProjects()
  }, [fetchProjects])

  const handleManageMembers = useCallback((projectId: string) => {
    navigate(`/projects/${projectId}`)
  }, [navigate])

  const handleArchiveProject = useCallback((projectId: string, projectName: string) => {
    setConfirmDialog({
      isOpen: true,
      type: 'warning',
      title: '归档项目',
      message: `确定要归档项目"${projectName}"吗?归档后项目将无法编辑,但可以查看。`,
      onConfirm: async () => {
        try {
          await projectsAPI.updateProject(projectId, { status: '已归档' })
          console.log('[Projects] 项目归档成功:', projectId)
          toast.success('项目已归档', '归档成功')
          fetchProjects()
          setConfirmDialog(prev => ({ ...prev, isOpen: false }))
        } catch (error) {
          console.error('[Projects] 归档项目失败:', error)
          toast.error('归档项目失败,请重试', '操作失败')
          setConfirmDialog(prev => ({ ...prev, isOpen: false }))
        }
      }
    })
  }, [fetchProjects])

  const handleDeleteProject = useCallback((projectId: string, projectName: string) => {
    setConfirmDialog({
      isOpen: true,
      type: 'danger',
      title: '删除项目',
      message: `确定要删除项目"${projectName}"吗?删除后将无法恢复,此操作不可撤销!`,
      onConfirm: async () => {
        try {
          await projectsAPI.deleteProject(projectId)
          console.log('[Projects] 项目删除成功:', projectId)
          toast.success('项目已删除', '删除成功')
          fetchProjects()
          setConfirmDialog(prev => ({ ...prev, isOpen: false }))
        } catch (error) {
          console.error('[Projects] 删除项目失败:', error)
          toast.error('删除项目失败,请重试', '操作失败')
          setConfirmDialog(prev => ({ ...prev, isOpen: false }))
        }
      }
    })
  }, [fetchProjects])

  const handleExportReport = useCallback(() => {
    try {
      const reportDate = new Date().toLocaleDateString('zh-CN')
      const reportTime = new Date().toLocaleTimeString('zh-CN')
      
      // 创建 Word 文档
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            // 标题
            new Paragraph({
              children: [
                new TextRun({
                  text: '项目报表',
                  bold: true,
                  size: 48,
                  color: '3B82F6'
                })
              ],
              heading: HeadingLevel.TITLE,
              alignment: AlignmentType.CENTER,
              spacing: { after: 400 }
            }),
            // 生成时间
            new Paragraph({
              children: [
                new TextRun({
                  text: `生成时间: ${reportDate} ${reportTime}`,
                  size: 20,
                  color: '666666'
                })
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 600 }
            }),
            
            // 一、项目总览
            new Paragraph({
              children: [
                new TextRun({
                  text: '一、项目总览',
                  bold: true,
                  size: 28,
                  color: '333333'
                })
              ],
              heading: HeadingLevel.HEADING_1,
              spacing: { before: 400, after: 200 }
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `总项目数: ${projectStats.total} 个`,
                  size: 24
                })
              ],
              spacing: { after: 400 }
            }),
            
            // 二、状态分布
            new Paragraph({
              children: [
                new TextRun({
                  text: '二、状态分布',
                  bold: true,
                  size: 28,
                  color: '333333'
                })
              ],
              heading: HeadingLevel.HEADING_1,
              spacing: { before: 400, after: 200 }
            }),
            // 状态表格
            new DocxTable({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                new DocxTableRow({
                  tableHeader: true,
                  children: [
                    new DocxTableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: '状态', bold: true })] })],
                      shading: { fill: '3B82F6' }
                    }),
                    new DocxTableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: '数量', bold: true })] })],
                      shading: { fill: '3B82F6' }
                    }),
                    new DocxTableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: '占比', bold: true })] })],
                      shading: { fill: '3B82F6' }
                    })
                  ]
                }),
                new DocxTableRow({
                  children: [
                    new DocxTableCell({ children: [new Paragraph('规划中')] }),
                    new DocxTableCell({ children: [new Paragraph(`${projectStats.byStatus.planning}`)] }),
                    new DocxTableCell({ children: [new Paragraph(`${projectStats.total > 0 ? Math.round(projectStats.byStatus.planning / projectStats.total * 100) : 0}%`)] })
                  ]
                }),
                new DocxTableRow({
                  children: [
                    new DocxTableCell({ children: [new Paragraph('进行中')] }),
                    new DocxTableCell({ children: [new Paragraph(`${projectStats.byStatus.inProgress}`)] }),
                    new DocxTableCell({ children: [new Paragraph(`${projectStats.total > 0 ? Math.round(projectStats.byStatus.inProgress / projectStats.total * 100) : 0}%`)] })
                  ]
                }),
                new DocxTableRow({
                  children: [
                    new DocxTableCell({ children: [new Paragraph('测试中')] }),
                    new DocxTableCell({ children: [new Paragraph(`${projectStats.byStatus.testing}`)] }),
                    new DocxTableCell({ children: [new Paragraph(`${projectStats.total > 0 ? Math.round(projectStats.byStatus.testing / projectStats.total * 100) : 0}%`)] })
                  ]
                }),
                new DocxTableRow({
                  children: [
                    new DocxTableCell({ children: [new Paragraph('已完成')] }),
                    new DocxTableCell({ children: [new Paragraph(`${projectStats.byStatus.completed}`)] }),
                    new DocxTableCell({ children: [new Paragraph(`${projectStats.total > 0 ? Math.round(projectStats.byStatus.completed / projectStats.total * 100) : 0}%`)] })
                  ]
                }),
                new DocxTableRow({
                  children: [
                    new DocxTableCell({ children: [new Paragraph('已归档')] }),
                    new DocxTableCell({ children: [new Paragraph(`${projectStats.byStatus.archived}`)] }),
                    new DocxTableCell({ children: [new Paragraph(`${projectStats.total > 0 ? Math.round(projectStats.byStatus.archived / projectStats.total * 100) : 0}%`)] })
                  ]
                })
              ]
            }),
            
            // 三、优先级分布
            new Paragraph({
              children: [
                new TextRun({
                  text: '三、优先级分布',
                  bold: true,
                  size: 28,
                  color: '333333'
                })
              ],
              heading: HeadingLevel.HEADING_1,
              spacing: { before: 400, after: 200 }
            }),
            // 优先级表格
            new DocxTable({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                new DocxTableRow({
                  tableHeader: true,
                  children: [
                    new DocxTableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: '优先级', bold: true })] })],
                      shading: { fill: '3B82F6' }
                    }),
                    new DocxTableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: '数量', bold: true })] })],
                      shading: { fill: '3B82F6' }
                    }),
                    new DocxTableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: '占比', bold: true })] })],
                      shading: { fill: '3B82F6' }
                    })
                  ]
                }),
                new DocxTableRow({
                  children: [
                    new DocxTableCell({ children: [new Paragraph('紧急')] }),
                    new DocxTableCell({ children: [new Paragraph(`${projectStats.byPriority.critical}`)] }),
                    new DocxTableCell({ children: [new Paragraph(`${projectStats.total > 0 ? Math.round(projectStats.byPriority.critical / projectStats.total * 100) : 0}%`)] })
                  ]
                }),
                new DocxTableRow({
                  children: [
                    new DocxTableCell({ children: [new Paragraph('高')] }),
                    new DocxTableCell({ children: [new Paragraph(`${projectStats.byPriority.high}`)] }),
                    new DocxTableCell({ children: [new Paragraph(`${projectStats.total > 0 ? Math.round(projectStats.byPriority.high / projectStats.total * 100) : 0}%`)] })
                  ]
                }),
                new DocxTableRow({
                  children: [
                    new DocxTableCell({ children: [new Paragraph('中')] }),
                    new DocxTableCell({ children: [new Paragraph(`${projectStats.byPriority.medium}`)] }),
                    new DocxTableCell({ children: [new Paragraph(`${projectStats.total > 0 ? Math.round(projectStats.byPriority.medium / projectStats.total * 100) : 0}%`)] })
                  ]
                }),
                new DocxTableRow({
                  children: [
                    new DocxTableCell({ children: [new Paragraph('低')] }),
                    new DocxTableCell({ children: [new Paragraph(`${projectStats.byPriority.low}`)] }),
                    new DocxTableCell({ children: [new Paragraph(`${projectStats.total > 0 ? Math.round(projectStats.byPriority.low / projectStats.total * 100) : 0}%`)] })
                  ]
                })
              ]
            }),
            
            // 四、进度概览
            new Paragraph({
              children: [
                new TextRun({
                  text: '四、进度概览',
                  bold: true,
                  size: 28,
                  color: '333333'
                })
              ],
              heading: HeadingLevel.HEADING_1,
              spacing: { before: 400, after: 200 }
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `平均完成度: ${projectStats.avgProgress}%`,
                  size: 24
                })
              ],
              spacing: { after: 200 }
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `已完成项目: ${projects.filter(p => p.progress === 100).length} 个`,
                  size: 24
                })
              ],
              spacing: { after: 200 }
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `进行中项目: ${projects.filter(p => p.progress > 0 && p.progress < 100).length} 个`,
                  size: 24
                })
              ],
              spacing: { after: 200 }
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `未开始项目: ${projects.filter(p => p.progress === 0).length} 个`,
                  size: 24
                })
              ],
              spacing: { after: 400 }
            }),
            
            // 五、详细项目列表
            new Paragraph({
              children: [
                new TextRun({
                  text: '五、详细项目列表',
                  bold: true,
                  size: 28,
                  color: '333333'
                })
              ],
              heading: HeadingLevel.HEADING_1,
              spacing: { before: 400, after: 200 }
            }),
            // 项目列表表格
            new DocxTable({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                new DocxTableRow({
                  tableHeader: true,
                  children: [
                    new DocxTableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: '项目名称', bold: true })] })],
                      shading: { fill: '3B82F6' }
                    }),
                    new DocxTableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: '状态', bold: true })] })],
                      shading: { fill: '3B82F6' }
                    }),
                    new DocxTableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: '优先级', bold: true })] })],
                      shading: { fill: '3B82F6' }
                    }),
                    new DocxTableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: '进度', bold: true })] })],
                      shading: { fill: '3B82F6' }
                    }),
                    new DocxTableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: '负责人', bold: true })] })],
                      shading: { fill: '3B82F6' }
                    })
                  ]
                }),
                ...filteredProjects.map(project => 
                  new DocxTableRow({
                    children: [
                      new DocxTableCell({ children: [new Paragraph(project.name)] }),
                      new DocxTableCell({ children: [new Paragraph(project.status)] }),
                      new DocxTableCell({ children: [new Paragraph(project.priority)] }),
                      new DocxTableCell({ children: [new Paragraph(`${project.progress}%`)] }),
                      new DocxTableCell({ children: [new Paragraph(project.owner.username)] })
                    ]
                  })
                )
              ]
            }),
            
            // 页脚
            new Paragraph({
              children: [
                new TextRun({
                  text: '此报告由 PM Hub 系统自动生成',
                  size: 18,
                  color: '999999',
                  italics: true
                })
              ],
              alignment: AlignmentType.CENTER,
              spacing: { before: 600 }
            })
          ]
        }]
      })
      
      // 导出文档
      Packer.toBlob(doc).then(blob => {
        saveAs(blob, `项目报表_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.docx`)
        toast.success('报表导出成功', '导出成功')
      })
    } catch (error) {
      console.error('[Projects] 导出报表失败:', error)
      toast.error('导出失败,请重试', '导出错误')
    }
  }, [projectStats, filteredProjects, projects])

  // 分页计算 - 必须在早期返回之前定义
  const listTotalPages = Math.ceil(filteredProjects.length / listPageSize)
  const paginatedProjects = useMemo(() => {
    const start = (listCurrentPage - 1) * listPageSize
    return filteredProjects.slice(start, start + listPageSize)
  }, [filteredProjects, listCurrentPage, listPageSize])

  // 处理每页条数变化
  const handlePageSizeChange = useCallback((newPageSize: number) => {
    setListPageSize(newPageSize)
    setListCurrentPage(1) // 重置到第一页
  }, [])

  // 当筛选条件变化时重置页码 - 必须在早期返回之前
  useEffect(() => {
    setListCurrentPage(1)
    setBoardPageSize(9)
  }, [searchQuery, statusFilter, priorityFilter, sortBy, sortOrder])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">项目管理</h1>
        </div>
        <div className="h-96 flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mx-auto"></div>
        </div>
      </div>
    )
  }

  const BoardView = () => {
    const visibleProjects = filteredProjects.slice(0, boardPageSize)
    const hasMore = filteredProjects.length > boardPageSize
    const remainingCount = filteredProjects.length - boardPageSize

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visibleProjects.length > 0 ? (
            visibleProjects.map((project) => (
              <Card
                key={project._id}
                className={`hover:shadow-xl hover:border-primary-200 transition-all duration-300 cursor-pointer border border-gray-100 hover:-translate-y-1 bg-gradient-to-br from-white to-gray-50/30 ${compactMode ? 'p-2' : ''}`}
                onClick={() => navigate(`/projects/${project._id}`)}
              >
                <CardHeader className={compactMode ? 'p-2 pb-1' : 'pb-3'}>
                  <div className="flex items-start justify-between">
                    <CardTitle className={compactMode ? 'text-sm' : 'text-lg'}>{project.name}</CardTitle>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/projects/${project._id}`) }}>
                          查看详情
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={(e) => { e.stopPropagation(); handleEditProject(project) }}
                          disabled={project.status === '已归档'}
                          className={project.status === '已归档' ? 'opacity-50 cursor-not-allowed' : ''}
                        >
                          编辑项目
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleManageMembers(project._id) }}>
                          管理成员
                        </DropdownMenuItem>
                        {project.status !== '已归档' && (
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleArchiveProject(project._id, project.name) }}>
                            归档项目
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem 
                          onClick={(e) => { e.stopPropagation(); handleDeleteProject(project._id, project.name) }}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          删除项目
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={`${getStatusColor(project.status)} ${compactMode ? 'text-xs' : ''}`}>
                      {getStatusText(project.status)}
                    </Badge>
                    <Badge className={`${getPriorityColor(project.priority)} ${compactMode ? 'text-xs' : ''}`}>
                      {getPriorityText(project.priority)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className={compactMode ? 'p-2 pt-0' : ''}>
                  {!compactMode && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {project.description}
                    </p>
                  )}

                  <div className={compactMode ? 'mb-2' : 'mb-4'}>
                    <div className="flex justify-between text-sm mb-2">
                      <span className={`font-medium text-gray-700 ${compactMode ? 'text-xs' : ''}`}>进度</span>
                      <span className={`font-bold text-primary-600 ${compactMode ? 'text-xs' : ''}`}>{project.progress}%</span>
                    </div>
                    <div className="w-full bg-gradient-to-r from-gray-100 to-gray-50 rounded-full h-2.5 overflow-hidden shadow-inner">
                      <div
                        className="bg-primary-500 h-2.5 rounded-full transition-all duration-500 relative overflow-hidden"
                        style={{ width: `${project.progress}%` }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-t from-white/20 to-transparent"></div>
                      </div>
                    </div>
                  </div>

                  <div className={`flex items-center justify-between text-xs text-gray-500 ${compactMode ? 'text-[10px]' : ''}`}>
                    <div className="flex items-center">
                      <Users className={`${compactMode ? 'h-2.5 w-2.5' : 'h-3 w-3'} mr-1`} />
                      <span>{project.members.length} 成员</span>
                    </div>
                    {!compactMode && (
                      <div className="flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        <span>{formatDate(project.updatedAt)}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="col-span-full">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="text-gray-400 mb-4">
                  <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">没有找到项目</h3>
                <p className="text-gray-500 mb-4">尝试调整搜索条件或创建新项目</p>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  创建新项目
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
        
        {/* 加载更多按钮 */}
        {hasMore && (
          <div className="flex justify-center mt-6">
            <Button
              variant="outline"
              onClick={() => setBoardPageSize(prev => prev + 9)}
              className="flex items-center gap-2"
            >
              <ChevronDown className="h-4 w-4" />
              加载更多 ({remainingCount} 个项目)
            </Button>
          </div>
        )}
      </div>
    )
  }

  const ListView = () => (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow className={compactMode ? 'h-8' : ''}>
            <TableHead 
              className={`cursor-pointer hover:bg-gray-50 ${compactMode ? 'px-2 py-1 text-xs' : ''}`}
              onClick={() => handleSort('name')}
            >
              项目名称 {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
            </TableHead>
            {!compactMode && <TableHead>描述</TableHead>}
            <TableHead 
              className={`cursor-pointer hover:bg-gray-50 ${compactMode ? 'px-2 py-1 text-xs' : ''}`}
              onClick={() => handleSort('status')}
            >
              状态 {sortBy === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}
            </TableHead>
            <TableHead 
              className={`cursor-pointer hover:bg-gray-50 ${compactMode ? 'px-2 py-1 text-xs' : ''}`}
              onClick={() => handleSort('priority')}
            >
              优先级 {sortBy === 'priority' && (sortOrder === 'asc' ? '↑' : '↓')}
            </TableHead>
            <TableHead 
              className={`cursor-pointer hover:bg-gray-50 ${compactMode ? 'px-2 py-1 text-xs' : ''}`}
              onClick={() => handleSort('progress')}
            >
              进度 {sortBy === 'progress' && (sortOrder === 'asc' ? '↑' : '↓')}
            </TableHead>
            <TableHead className={compactMode ? 'px-2 py-1 text-xs' : ''}>成员</TableHead>
            {!compactMode && (
              <TableHead 
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => handleSort('updatedAt')}
              >
                更新时间 {sortBy === 'updatedAt' && (sortOrder === 'asc' ? '↑' : '↓')}
              </TableHead>
            )}
            <TableHead className={compactMode ? 'px-2 py-1 text-xs' : ''}>操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedProjects.length > 0 ? (
            paginatedProjects.map((project) => (
              <TableRow 
                key={project._id} 
                className={`cursor-pointer hover:bg-gray-50 ${compactMode ? 'h-10' : ''}`}
                onClick={() => navigate(`/projects/${project._id}`)}
              >
                <TableCell className={`font-medium ${compactMode ? 'px-2 py-1 text-xs' : ''}`}>
                  {project.name}
                </TableCell>
                {!compactMode && (
                  <TableCell className="max-w-xs truncate">{project.description}</TableCell>
                )}
                <TableCell className={compactMode ? 'px-2 py-1' : ''}>
                  <Badge className={`${getStatusColor(project.status)} ${compactMode ? 'text-xs px-1.5 py-0.5' : ''}`}>
                    {getStatusText(project.status)}
                  </Badge>
                </TableCell>
                <TableCell className={compactMode ? 'px-2 py-1' : ''}>
                  <Badge className={`${getPriorityColor(project.priority)} ${compactMode ? 'text-xs px-1.5 py-0.5' : ''}`}>
                    {getPriorityText(project.priority)}
                  </Badge>
                </TableCell>
                <TableCell className={compactMode ? 'px-2 py-1' : ''}>
                  <div className={compactMode ? 'w-16' : 'w-24'}>
                    <div className="flex items-center gap-2">
                      <div className={`bg-gray-200 rounded-full ${compactMode ? 'h-1.5 flex-1' : 'h-2 flex-1'}`}>
                        <div
                          className={`bg-primary-600 rounded-full ${compactMode ? 'h-1.5' : 'h-2'}`}
                          style={{ width: `${project.progress}%` }}
                        ></div>
                      </div>
                      <span className={compactMode ? 'text-[10px]' : 'text-xs'}>{project.progress}%</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className={compactMode ? 'px-2 py-1' : ''}>
                  <div className="flex items-center gap-1">
                    <Users className={`${compactMode ? 'h-2.5 w-2.5' : 'h-3 w-3'} text-gray-400`} />
                    <span className={compactMode ? 'text-xs' : 'text-sm'}>{project.members.length}</span>
                  </div>
                </TableCell>
                {!compactMode && (
                  <TableCell className="text-sm text-gray-500">
                    {formatDateFull(project.updatedAt)}
                  </TableCell>
                )}
                <TableCell onClick={(e) => e.stopPropagation()} className={compactMode ? 'px-2 py-1' : ''}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className={`${compactMode ? 'h-6 w-6' : 'h-8 w-8'} p-0`}>
                        <MoreHorizontal className={compactMode ? 'h-3 w-3' : 'h-4 w-4'} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => navigate(`/projects/${project._id}`)}>
                        查看详情
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleEditProject(project)}
                        disabled={project.status === '已归档'}
                        className={project.status === '已归档' ? 'opacity-50 cursor-not-allowed' : ''}
                      >
                        编辑项目
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleManageMembers(project._id)}>
                        管理成员
                      </DropdownMenuItem>
                      {project.status !== '已归档' && (
                        <DropdownMenuItem onClick={() => handleArchiveProject(project._id, project.name)}>
                          归档项目
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem 
                        onClick={() => handleDeleteProject(project._id, project.name)}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        删除项目
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={compactMode ? 6 : 8} className="text-center py-12">
                <div className="flex flex-col items-center justify-center">
                  <div className="text-gray-400 mb-4">
                    <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">没有找到项目</h3>
                  <p className="text-gray-500 mb-4">尝试调整搜索条件或创建新项目</p>
                  <Button onClick={() => setShowCreateDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    创建新项目
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      {/* 列表分页 */}
      {filteredProjects.length > 0 && (
        <Pagination
          currentPage={listCurrentPage}
          totalPages={listTotalPages}
          total={filteredProjects.length}
          pageSize={listPageSize}
          onPageChange={setListCurrentPage}
          onPageSizeChange={handlePageSizeChange}
        />
      )}
    </div>
  )

  const ReportView = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>项目状态分布</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { key: '规划中', label: '规划中', count: projectStats.byStatus.planning, color: 'bg-blue-500' },
              { key: '进行中', label: '进行中', count: projectStats.byStatus.inProgress, color: 'bg-green-500' },
              { key: '测试中', label: '测试中', count: projectStats.byStatus.testing, color: 'bg-yellow-500' },
              { key: '已完成', label: '已完成', count: projectStats.byStatus.completed, color: 'bg-gray-500' },
              { key: 'archived', label: '已归档', count: projectStats.byStatus.archived, color: 'bg-gray-400' },
            ].map((item) => (
              <div key={item.key} className="text-center">
                <div className={`w-full h-24 ${item.color} rounded-lg flex items-center justify-center mb-2`}>
                  <span className="text-3xl font-bold text-white">{item.count}</span>
                </div>
                <p className="text-sm font-medium text-gray-700">{item.label}</p>
                <p className="text-xs text-gray-500">
                  {projectStats.total > 0 ? Math.round(item.count / projectStats.total * 100) : 0}%
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>优先级分布</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { key: '紧急', label: '紧急', count: projectStats.byPriority.critical, color: 'bg-red-500' },
              { key: '高', label: '高', count: projectStats.byPriority.high, color: 'bg-orange-500' },
              { key: '中', label: '中', count: projectStats.byPriority.medium, color: 'bg-blue-500' },
              { key: '低', label: '低', count: projectStats.byPriority.low, color: 'bg-green-500' },
            ].map((item) => (
              <div key={item.key} className="text-center">
                <div className={`w-full h-20 ${item.color} rounded-lg flex items-center justify-center mb-2`}>
                  <span className="text-2xl font-bold text-white">{item.count}</span>
                </div>
                <p className="text-sm font-medium text-gray-700">{item.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>进度概览</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">平均完成度</span>
                <span className="text-sm font-bold">{projectStats.avgProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-primary-600 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${projectStats.avgProgress}%` }}
                ></div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">
                  {projects.filter(p => p.progress === 100).length}
                </p>
                <p className="text-xs text-gray-600 mt-1">已完成</p>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <p className="text-2xl font-bold text-yellow-600">
                  {projects.filter(p => p.progress > 0 && p.progress < 100).length}
                </p>
                <p className="text-xs text-gray-600 mt-1">进行中</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-600">
                  {projects.filter(p => p.progress === 0).length}
                </p>
                <p className="text-xs text-gray-600 mt-1">未开始</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>详细统计</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">总项目数</p>
              <p className="text-2xl font-bold text-blue-600">{projectStats.total}</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">活跃项目</p>
              <p className="text-2xl font-bold text-green-600">
                {projectStats.byStatus.inProgress + projectStats.byStatus.testing}
              </p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">平均进度</p>
              <p className="text-2xl font-bold text-purple-600">{projectStats.avgProgress}%</p>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">高优先级</p>
              <p className="text-2xl font-bold text-orange-600">
                {projectStats.byPriority.critical + projectStats.byPriority.high}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">项目管理</h1>
          <p className="text-sm text-gray-500 mt-1">管理和跟踪您的所有项目进度</p>
        </div>
        <Button className="flex items-center space-x-2 bg-primary-600 hover:bg-primary-700 text-white shadow-sm hover:shadow-md transition-all duration-200 rounded-lg" onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4" />
          <span>新建项目</span>
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-medium text-gray-500 mb-1">总项目数</div>
                <div className="text-2xl font-bold text-primary-600">{projectStats.total}</div>
              </div>
              <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center">
                <FileText className="h-5 w-5 text-primary-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-medium text-gray-500 mb-1">进行中</div>
                <div className="text-2xl font-bold text-emerald-600">{projectStats.byStatus.inProgress}</div>
              </div>
              <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-emerald-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-medium text-gray-500 mb-1">已规划</div>
                <div className="text-2xl font-bold text-blue-600">{projectStats.byStatus.planning}</div>
              </div>
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                <Calendar className="h-5 w-5 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-medium text-gray-500 mb-1">高优先级</div>
                <div className="text-2xl font-bold text-amber-600">
                  {projectStats.byPriority.critical + projectStats.byPriority.high}
                </div>
              </div>
              <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
                <Users className="h-5 w-5 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="搜索项目名称、描述或标签..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-10"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 text-sm bg-white"
            >
              <option value="">所有状态</option>
              <option value="规划中">规划中</option>
              <option value="进行中">进行中</option>
              <option value="测试中">测试中</option>
              <option value="已完成">已完成</option>
              <option value="archived">已归档</option>
            </select>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 text-sm bg-white"
            >
              <option value="">所有优先级</option>
              <option value="紧急">紧急</option>
              <option value="高">高</option>
              <option value="中">中</option>
              <option value="低">低</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as ViewMode)}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="board" className="flex items-center gap-2">
              <LayoutGrid className="h-4 w-4" />
              看板视图
            </TabsTrigger>
            <TabsTrigger value="list" className="flex items-center gap-2">
              <List className="h-4 w-4" />
              列表视图
            </TabsTrigger>
            <TabsTrigger value="report" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              报表视图
            </TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCompactMode(!compactMode)}
              title={compactMode ? '切换到详细模式' : '切换到紧凑模式'}
              className={compactMode ? 'bg-blue-100 text-blue-600' : ''}
            >
              {compactMode ? (
                <Maximize2 className="h-4 w-4 mr-2" />
              ) : (
                <Minimize2 className="h-4 w-4 mr-2" />
              )}
              {compactMode ? '详细' : '紧凑'}
            </Button>
          </div>
          {viewMode === 'list' && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  导出
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportCSV}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  导出CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportExcel}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  导出Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {viewMode === 'report' && (
            <Button variant="outline" size="sm" onClick={handleExportReport}>
              <Download className="h-4 w-4 mr-2" />
              导出报表
            </Button>
          )}
        </div>

        <TabsContent value="board" className="mt-6">
          <BoardView />
        </TabsContent>

        <TabsContent value="list" className="mt-6">
          <ListView />
        </TabsContent>

        <TabsContent value="report" className="mt-6">
          <ReportView />
        </TabsContent>
      </Tabs>

      <CreateProjectDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={handleCreateProject}
      />

      <EditProjectDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        project={selectedProject}
        onSuccess={handleEditSuccess}
      />

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
    </div>
  )
}

export default Projects
