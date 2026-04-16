import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Upload, Download, Search, Plus, Edit, Trash2, Eye, ChevronLeft, ChevronRight, Loader2, FileText, FileSpreadsheet, X, File, Maximize2, Minimize2, Archive } from 'lucide-react'
import { analyzeInterfaces } from '../services/analysis-api'
import { interfaceArchiveApi } from '../services/analysis-api'
import mammoth from 'mammoth'
import * as XLSX from 'xlsx'
import InputSourceSelector from './InputSourceSelector'
import InterfaceArchiveDialog from './InterfaceArchiveDialog'
import { UnifiedInputSource } from '@/types/unified-input'
import { smartContentLoader } from '@/utils/SmartContentLoader'
import { toast } from '@/components/ui/toast-container'

interface Interface {
  id: string
  name: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  path: string
  description: string
  requestParams: string
  responseParams: string
  responseFormat?: string
  priority: '高' | '中' | '低'
  category: string
  _raw?: {
    systemName?: string
    interfaceType?: string
    confidenceScore?: number
    aiSuggestion?: string
  }
}

const InterfaceList = () => {
  const [inputSource, setInputSource] = useState<UnifiedInputSource | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [interfaces, setInterfaces] = useState<Interface[]>([])
  const [manualText, setManualText] = useState('')
  const [isContentLoading, setIsContentLoading] = useState(false)

  // 左侧面板收缩状态
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(false)

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // 批量选择状态
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isAllSelected, setIsAllSelected] = useState(false)

  // 编辑对话框状态
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingInterface, setEditingInterface] = useState<Interface | undefined>(undefined)
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create')

  // 删除确认对话框状态
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deletingInterfaceId, setDeletingInterfaceId] = useState<string | null>(null)

  // 详情查看对话框状态
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [viewingInterface, setViewingInterface] = useState<Interface | null>(null)

  // 文档预览状态
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false)
  const [previewContent, setPreviewContent] = useState<string>('')
  const [previewFileName, setPreviewFileName] = useState<string>('')
  const [previewIsHtml, setPreviewIsHtml] = useState(false)
  const [isFullScreen, setIsFullScreen] = useState(false)

  // 归档相关状态
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false)
  const [archiveSaving, setArchiveSaving] = useState(false)

  // 计算分页数据
  const totalPages = Math.ceil(interfaces.length / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const currentInterfaces = interfaces.slice(startIndex, endIndex)

  // 处理输入源变化
  const handleInputSourceChange = async (source: UnifiedInputSource | null) => {
    if (!source) {
      setInputSource(null)
      setFile(null)
      setManualText('')
      return
    }

    setInputSource(source)

    if (source.type === 'requirement') {
      setIsContentLoading(true)
      try {
        const content = await smartContentLoader.getContent(source)
        setManualText(content.text)
        console.log('[InterfaceList] 从需求池加载内容成功:', content.sourceInfo)
      } catch (error) {
        console.error('[InterfaceList] 加载需求内容失败:', error)
        toast.error(`加载需求内容失败: ${error instanceof Error ? error.message : '未知错误'}`)
        setInputSource(null)
      } finally {
        setIsContentLoading(false)
      }
    } else if (source.type === 'document') {
      setFile(null)
      setManualText('')
    } else if (source.type === 'text') {
      setFile(null)
      setManualText(source.content || '')
    }
  }

  // 处理文件上传
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
    }
  }

  // 读取文件内容（提取纯文本，去除HTML标签干扰）
  const readFileContent = async (file: File): Promise<string> => {
    const extension = file.name.split('.').pop()?.toLowerCase()
    if (extension === 'docx') {
      const arrayBuffer = await file.arrayBuffer()
      // 使用 extractRawText 提取纯文本，避免HTML标签干扰AI分析
      const result = await mammoth.extractRawText({ arrayBuffer })
      return result.value
    } else if (extension === 'txt' || file.type.includes('text')) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => resolve(e.target?.result as string)
        reader.onerror = reject
        reader.readAsText(file)
      })
    }
    throw new Error('不支持的文件格式')
  }

  // 读取文件内容用于预览（保留HTML样式和图片）
  const readFileContentForPreview = async (file: File): Promise<{ content: string; isHtml: boolean }> => {
    const extension = file.name.split('.').pop()?.toLowerCase()
    console.log('[InterfaceList] readFileContentForPreview - 文件名:', file.name, '扩展名:', extension)
    
    if (extension === 'docx') {
      console.log('[InterfaceList] 开始读取 DOCX 文件...')
      try {
        const arrayBuffer = await file.arrayBuffer()
        console.log('[InterfaceList] ArrayBuffer 大小:', arrayBuffer.byteLength)
        
        // 使用 convertToHtml 保留文档样式，并配置图片转换为 base64
        const result = await mammoth.convertToHtml({ 
          arrayBuffer,
          convertImage: mammoth.images.imgElement(function(image) {
            return image.read("base64").then(function(imageBuffer) {
              console.log('[InterfaceList] 转换图片成功, contentType:', image.contentType)
              return {
                src: "data:" + image.contentType + ";base64," + imageBuffer
              }
            })
          })
        })
        
        console.log('[InterfaceList] mammoth 转换完成, 内容长度:', result.value.length)
        if (result.messages && result.messages.length > 0) {
          console.log('[InterfaceList] mammoth 转换消息:', result.messages)
        }
        
        return { content: result.value, isHtml: true }
      } catch (error) {
        console.error('[InterfaceList] DOCX 文件读取失败:', error)
        throw new Error(`DOCX 文件读取失败: ${error instanceof Error ? error.message : '未知错误'}`)
      }
    } else if (extension === 'txt' || file.type.includes('text')) {
      console.log('[InterfaceList] 开始读取文本文件...')
      try {
        const text = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = (e) => {
            console.log('[InterfaceList] 文本文件读取完成')
            resolve(e.target?.result as string)
          }
          reader.onerror = (e) => {
            console.error('[InterfaceList] 文本文件读取失败:', e)
            reject(new Error('文件读取失败'))
          }
          reader.readAsText(file)
        })
        return { content: text, isHtml: false }
      } catch (error) {
        console.error('[InterfaceList] 文本文件读取异常:', error)
        throw error
      }
    }
    throw new Error(`不支持的文件格式: ${extension || '未知'}`)
  }

  // 开始分析
  const handleStartAnalysis = async () => {
    if (isContentLoading) {
      toast.warning('正在加载内容，请稍候...')
      return
    }

    if (!file && !manualText.trim()) {
      toast.warning('请先上传文档、选择需求或输入文本内容')
      return
    }

    setIsAnalyzing(true)

    try {
      let content = ''
      if (manualText.trim()) {
        content = manualText.trim()
        console.log('[InterfaceList] 使用手动输入的内容，长度:', content.length)
      } else if (file) {
        content = await readFileContent(file)
        console.log('[InterfaceList] 读取文件内容，长度:', content.length)
      } else {
        throw new Error('请上传文件或输入文本内容')
      }

      console.log('[InterfaceList] === 开始接口分析 ===')
      console.log('[InterfaceList] 内容长度:', content.length)
      console.log('[InterfaceList] 内容预览:', content.substring(0, 300))

      const response = await analyzeInterfaces(content, 'txt')
      
      console.log('[InterfaceList] === 分析响应 ===')
      console.log('[InterfaceList] 响应对象:', response)
      console.log('[InterfaceList] success:', response.success)
      console.log('[InterfaceList] message:', response.message)

      if (!response.success) {
        throw new Error(response.message || '分析失败')
      }

      const interfacesData = response.data?.interfaces || []
      console.log('[InterfaceList] 解析到的接口数量:', interfacesData.length)

      if (interfacesData.length === 0) {
        console.warn('[InterfaceList] 未识别到任何接口')
        toast.warning('未识别到接口', '请确保文档包含接口相关信息，或手动添加接口')
      } else {
        console.log('[InterfaceList] 接口列表:', interfacesData)
        setInterfaces(interfacesData)
        toast.success(`成功识别 ${interfacesData.length} 个接口！`, '接口分析完成')
      }
    } catch (error) {
      console.error('[InterfaceList] === 接口分析失败 ===')
      console.error('[InterfaceList] 错误类型:', error instanceof Error ? error.constructor.name : typeof error)
      console.error('[InterfaceList] 错误信息:', error instanceof Error ? error.message : String(error))
      console.error('[InterfaceList] 完整错误:', error)
      
      toast.error(`接口分析失败: ${error instanceof Error ? error.message : '未知错误'}`, '请检查网络连接或稍后重试')
    } finally {
      setIsAnalyzing(false)
    }
  }

  // 分页控制
  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1)
    }
  }

  // 批量选择处理
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(currentInterfaces.map(i => i.id))
      setSelectedIds(allIds)
      setIsAllSelected(true)
    } else {
      setSelectedIds(new Set())
      setIsAllSelected(false)
    }
  }

  const handleSelectRow = (id: string) => {
    const newSelectedIds = new Set(selectedIds)
    if (newSelectedIds.has(id)) {
      newSelectedIds.delete(id)
    } else {
      newSelectedIds.add(id)
    }
    setSelectedIds(newSelectedIds)
    setIsAllSelected(newSelectedIds.size === currentInterfaces.length)
  }

  // 批量删除
  const handleBatchDelete = () => {
    if (selectedIds.size === 0) return

    if (confirm(`确定要删除选中的 ${selectedIds.size} 个接口吗？`)) {
      setInterfaces(interfaces.filter(i => !selectedIds.has(i.id)))
      setSelectedIds(new Set())
      setIsAllSelected(false)
    }
  }

  // 导出为CSV
  const handleExportCSV = () => {
    if (interfaces.length === 0) {
      toast.warning('暂无接口可导出')
      return
    }

    try {
      const headers = ['序号,接口名称,请求方式,接口路径,接口描述,请求参数,响应参数,响应格式,优先级,接口分类']
      const rows = interfaces.map((item, index) => {
        const escapeCSV = (text: string) => {
          if (text.includes(',') || text.includes('"') || text.includes('\n')) {
            return `"${text.replace(/"/g, '""')}"`
          }
          return text
        }
        return [
          index + 1,
          escapeCSV(item.name),
          escapeCSV(item.method),
          escapeCSV(item.path),
          escapeCSV(item.description),
          escapeCSV(item.requestParams),
          escapeCSV(item.responseParams),
          escapeCSV(item.responseFormat || ''),
          escapeCSV(item.priority),
          escapeCSV(item.category)
        ].join(',')
      })

      const csvContent = [headers.join(','), ...rows].join('\n')
      const BOM = '\uFEFF'
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })

      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      const fileName = `接口列表_${new Date().toLocaleDateString('zh-CN')}.csv`
      link.setAttribute('download', fileName)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast.success(`CSV文件导出成功！`, `文件名: ${fileName}`)
    } catch (error) {
      console.error('CSV导出失败:', error)
      toast.error('CSV导出失败，请重试')
    }
  }

  // 导出为Excel
  const handleExportExcel = () => {
    if (interfaces.length === 0) {
      toast.warning('暂无接口可导出')
      return
    }

    try {
      const data = interfaces.map((item, index) => ({
        '序号': index + 1,
        '接口名称': item.name,
        '请求方式': item.method,
        '接口路径': item.path,
        '接口描述': item.description,
        '请求参数': item.requestParams,
        '响应参数': item.responseParams,
        '响应格式': item.responseFormat || '',
        '优先级': item.priority,
        '接口分类': item.category
      }))

      const ws = XLSX.utils.json_to_sheet(data)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, '接口列表')
      
      // 设置列宽
      ws['!cols'] = [
        { wch: 6 },   // 序号
        { wch: 25 },  // 接口名称
        { wch: 10 },  // 请求方式
        { wch: 30 },  // 接口路径
        { wch: 40 },  // 接口描述
        { wch: 40 },  // 请求参数
        { wch: 40 },  // 响应参数
        { wch: 30 },  // 响应格式
        { wch: 8 },   // 优先级
        { wch: 15 },  // 接口分类
      ]

      const fileName = `接口列表_${new Date().toLocaleDateString('zh-CN')}.xlsx`
      XLSX.writeFile(wb, fileName)

      toast.success(`Excel文件导出成功！`, `文件名: ${fileName}`)
    } catch (error) {
      console.error('Excel导出失败:', error)
      toast.error('Excel导出失败，请重试')
    }
  }

  // 预览文档
  const handlePreviewDocument = async () => {
    if (!file) {
      toast.warning('请先上传文档')
      return
    }

    console.log('[InterfaceList] 开始预览文档:', file.name, '类型:', file.type, '大小:', file.size)
    setIsContentLoading(true)

    try {
      const { content, isHtml } = await readFileContentForPreview(file)
      console.log('[InterfaceList] 预览内容读取成功, isHtml:', isHtml, '内容长度:', content.length)
      console.log('[InterfaceList] 内容预览 (前500字符):', content.substring(0, 500))
      
      if (!content || content.trim() === '') {
        toast.warning('文档内容为空，无法预览')
        return
      }
      
      setPreviewContent(content)
      setPreviewIsHtml(isHtml)
      setPreviewFileName(file.name)
      setIsFullScreen(false)
      setPreviewDialogOpen(true)
      console.log('[InterfaceList] 预览对话框已打开')
    } catch (error) {
      console.error('[InterfaceList] 预览文档失败:', error)
      toast.error(`预览文档失败: ${error instanceof Error ? error.message : '未知错误'}`)
    } finally {
      setIsContentLoading(false)
    }
  }

  // 新增接口
  const handleAddInterface = () => {
    setDialogMode('create')
    setEditingInterface(undefined)
    setEditDialogOpen(true)
  }

  // 查看详情
  const handleViewDetail = (item: Interface) => {
    setViewingInterface(item)
    setDetailDialogOpen(true)
  }

  // 编辑接口
  const handleEditInterface = (id: string) => {
    const item = interfaces.find(i => i.id === id)
    if (item) {
      setDialogMode('edit')
      setEditingInterface(item)
      setEditDialogOpen(true)
    }
  }

  // 删除接口
  const handleDeleteInterface = (id: string) => {
    setDeletingInterfaceId(id)
    setDeleteConfirmOpen(true)
  }

  // 确认删除
  const confirmDelete = () => {
    if (deletingInterfaceId) {
      setInterfaces(interfaces.filter(i => i.id !== deletingInterfaceId))
      setDeleteConfirmOpen(false)
      setDeletingInterfaceId(null)
    }
  }

  // 取消删除
  const cancelDelete = () => {
    setDeleteConfirmOpen(false)
    setDeletingInterfaceId(null)
  }

  // 保存接口（新增或编辑）
  const handleSaveInterface = (item: Interface) => {
    if (dialogMode === 'create') {
      setInterfaces([...interfaces, { ...item, id: Date.now().toString() }])
    } else {
      setInterfaces(interfaces.map(i => i.id === item.id ? item : i))
    }
    setEditDialogOpen(false)
    setEditingInterface(undefined)
  }

  // 取消编辑
  const handleCancelEdit = () => {
    setEditDialogOpen(false)
    setEditingInterface(undefined)
  }

  // 获取请求方式样式
  const getMethodStyle = (method: string) => {
    switch (method) {
      case 'GET': return 'bg-blue-100 text-blue-700'
      case 'POST': return 'bg-green-100 text-green-700'
      case 'PUT': return 'bg-orange-100 text-orange-700'
      case 'DELETE': return 'bg-red-100 text-red-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  // 获取优先级样式
  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case '高': return 'bg-red-100 text-red-700'
      case '中': return 'bg-orange-100 text-orange-700'
      case '低': return 'bg-green-100 text-green-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  // 归档接口列表
  const handleArchive = () => {
    if (interfaces.length === 0) {
      toast.warning('暂无接口可归档')
      return
    }
    setArchiveDialogOpen(true)
  }

  const handleArchiveConfirm = async (title: string) => {
    setArchiveSaving(true)
    try {
      const sourceType = inputSource?.type || 'text'
      await interfaceArchiveApi.save({
        title,
        sourceType: sourceType as 'text' | 'document' | 'requirement',
        sourceContent: manualText || '',
        sourceFileName: file?.name,
        sourceRequirementId: inputSource?.type === 'requirement' ? inputSource.requirementId : undefined,
        sourceRequirementTitle: inputSource?.type === 'requirement' ? inputSource.requirementTitle : undefined,
        interfaces: interfaces.map(i => ({
          id: i.id,
          name: i.name,
          method: i.method,
          path: i.path,
          description: i.description,
          requestParams: i.requestParams,
          responseParams: i.responseParams,
          responseFormat: i.responseFormat,
          priority: i.priority,
          category: i.category,
          _raw: i._raw
        }))
      })
      toast.success(`接口归档保存成功！共 ${interfaces.length} 个接口`)
      setArchiveDialogOpen(false)
    } catch (error) {
      console.error('[InterfaceList] 归档失败:', error)
      toast.error(`归档失败: ${error instanceof Error ? error.message : '未知错误'}`)
    } finally {
      setArchiveSaving(false)
    }
  }

  return (
    <div className="flex h-full overflow-hidden bg-gradient-to-br from-[#fafbfc] via-white to-[#f5f3ff]">
      {/* 左侧文档上传区域 */}
      <div className={`border-r border-indigo-100 transition-all duration-300 flex-shrink-0 ${isLeftPanelCollapsed ? 'w-0 p-0 overflow-hidden border-r-0' : 'w-[260px] p-2 lg:w-[280px]'}`}>
        <Card className={`${isLeftPanelCollapsed ? 'hidden' : ''}shadow-sm border-indigo-100 rounded-2xl`}>
          <CardHeader className="pb-3 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-t-2xl">
            <CardTitle className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-2">
                <FileText className="h-4 w-4 text-indigo-500" />
                <span className="font-bold text-gray-800">接口分析</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsLeftPanelCollapsed(true)}
                className="h-6 w-6 p-0 text-indigo-500 hover:bg-indigo-100"
                title="收起"
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-[calc(100vh-220px)] overflow-y-auto p-2">
            {/* 统一输入源选择器 */}
            <InputSourceSelector
              value={inputSource}
              onChange={handleInputSourceChange}
              availableModes={['text', 'document', 'requirement']}
              disabled={isAnalyzing || isContentLoading}
            />

            {/* 加载状态提示 */}
            {isContentLoading && (
              <div className="flex items-center justify-center p-4 bg-blue-50 rounded-xl mt-3">
                <Loader2 className="h-5 w-5 text-blue-600 mr-2 animate-spin" />
                <span className="text-blue-700 text-sm">正在加载需求内容...</span>
              </div>
            )}

            {/* 文档上传区域（仅在文档模式下显示） */}
            {inputSource?.type === 'document' && (
              <>
                <div
                  className="border-2 border-dashed border-indigo-200 rounded-2xl p-5 text-center hover:border-indigo-400 hover:bg-gradient-to-br hover:from-indigo-50 hover:to-purple-50 transition-all duration-300 cursor-pointer mb-3 group"
                  onClick={() => document.getElementById('file-upload')?.click()}
                >
                  <input
                    type="file"
                    id="file-upload"
                    accept=".txt,.docx"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <div className="w-12 h-12 mx-auto mb-3 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Upload className="h-6 w-6 text-indigo-500" />
                  </div>
                  <p className="text-gray-700 text-sm mb-1 font-medium">点击或拖拽文件到此处上传</p>
                  <p className="text-xs text-gray-500">支持 TXT 和 DOCX 文件</p>
                </div>

                {file && (
                  <div className="mt-3 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-3 border border-indigo-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                        <File className="h-4 w-4 text-blue-500 flex-shrink-0" />
                        <span className="text-xs font-semibold text-gray-800 truncate">{file.name}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 px-2 text-xs border-indigo-200 hover:bg-indigo-100 text-indigo-600 flex-shrink-0"
                          onClick={handlePreviewDocument}
                          title="预览文档"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          预览
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 w-6 px-0 border-rose-200 hover:bg-rose-100 text-rose-600 flex-shrink-0"
                          onClick={() => {
                            if (confirm('确定要删除上传的文件吗？')) {
                              setFile(null)
                            }
                          }}
                          title="删除"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* 开始分析按钮 */}
            <Button
              className="w-full mt-4 h-10 text-sm font-medium bg-primary-600 hover:bg-primary-700 text-white transition-colors duration-200 rounded-xl"
              onClick={handleStartAnalysis}
              disabled={(!file && !manualText.trim()) || isAnalyzing || isContentLoading}
            >
              {isAnalyzing ? (
                <span className="flex items-center justify-center">
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  分析中...
                </span>
              ) : (
                <span className="flex items-center justify-center">
                  <Search className="h-4 w-4 mr-2" />
                  开始分析
                </span>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* 右侧接口列表区域 */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="px-3 py-2 border-b border-indigo-100 bg-white/80 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center space-x-2">
              {isLeftPanelCollapsed && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsLeftPanelCollapsed(false)}
                  className="h-7 w-7 p-0 text-indigo-500 hover:bg-indigo-100 rounded-lg"
                  title="展开上传面板"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              )}
              <h2 className="text-lg font-bold text-indigo-600">接口列表</h2>
            </div>
            <div className="flex items-center space-x-1.5">
              {selectedIds.size > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center space-x-1 h-8 px-3 text-xs rounded-xl border-rose-200 hover:bg-rose-50 hover:border-rose-300 text-rose-600"
                  onClick={handleBatchDelete}
                >
                  <Trash2 className="h-3 w-3" />
                  <span className="font-medium">批量删除 ({selectedIds.size})</span>
                </Button>
              )}
              <Button
                size="sm"
                className="flex items-center space-x-1 h-8 px-3 text-xs rounded-xl bg-blue-500 hover:bg-blue-600 text-white shadow-sm"
                onClick={handleExportCSV}
                disabled={interfaces.length === 0}
              >
                <Download className="h-3 w-3" />
                <span className="font-medium">导出CSV</span>
              </Button>
              <Button
                size="sm"
                className="flex items-center space-x-1 h-8 px-3 text-xs rounded-xl bg-teal-500 hover:bg-teal-600 text-white shadow-sm"
                onClick={handleExportExcel}
                disabled={interfaces.length === 0}
              >
                <FileSpreadsheet className="h-3 w-3" />
                <span className="font-medium">导出Excel</span>
              </Button>
              <Button
                size="sm"
                className="flex items-center space-x-1 h-8 px-3 text-xs rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-sm"
                onClick={handleArchive}
                disabled={interfaces.length === 0}
              >
                <Archive className="h-3 w-3" />
                <span className="font-medium">归档</span>
              </Button>
              <Button
                size="sm"
                className="flex items-center space-x-1 h-8 px-3 text-xs rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white shadow-lg shadow-indigo-500/25"
                onClick={handleAddInterface}
              >
                <Plus className="h-3 w-3" />
                <span className="font-medium">新增接口</span>
              </Button>
            </div>
          </div>
        </div>

        {/* 接口列表表格 */}
        <Card className="flex-1 flex flex-col min-h-0 mx-2 my-2">
          <CardContent className="p-0 flex-1 flex flex-col">
            <div className="overflow-x-auto flex-1">
              <Table className="w-full table-fixed">
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-indigo-50 to-purple-50">
                    <TableHead className="text-center w-10 px-1.5 py-2.5">
                      <input
                        type="checkbox"
                        checked={isAllSelected && currentInterfaces.length > 0}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="h-3.5 w-3.5 cursor-pointer rounded border-indigo-300"
                      />
                    </TableHead>
                    <TableHead className="px-2 py-2.5 text-xs font-semibold text-gray-600 w-10">序号</TableHead>
                    <TableHead className="px-2 py-2.5 text-xs font-semibold text-gray-600 w-16">请求方式</TableHead>
                    <TableHead className="px-2 py-2.5 text-xs font-semibold text-gray-600 w-[12%]">接口名称</TableHead>
                    <TableHead className="px-2 py-2.5 text-xs font-semibold text-gray-600 w-[15%]">接口路径</TableHead>
                    <TableHead className="px-2 py-2.5 text-xs font-semibold text-gray-600 w-[12%]">请求参数</TableHead>
                    <TableHead className="px-2 py-2.5 text-xs font-semibold text-gray-600 w-[12%]">响应参数</TableHead>
                    <TableHead className="px-2 py-2.5 text-xs font-semibold text-gray-600 w-[10%]">响应格式</TableHead>
                    <TableHead className="px-2 py-2.5 text-xs font-semibold text-gray-600 w-[10%]">接口描述</TableHead>
                    <TableHead className="px-2 py-2.5 text-xs font-semibold text-gray-600 w-14">优先级</TableHead>
                    <TableHead className="px-2 py-2.5 text-xs font-semibold text-gray-600 w-[9%]">接口分类</TableHead>
                    <TableHead className="px-2 py-2.5 text-xs font-semibold text-gray-600 w-24 text-center">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentInterfaces.length > 0 ? (
                    currentInterfaces.map((item, index) => (
                      <TableRow key={item.id} className="hover:bg-gradient-to-r hover:from-indigo-50/50 hover:to-purple-50/50 transition-all duration-200 border-b border-gray-100">
                        <TableCell className="text-center px-1.5 py-2.5">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(item.id)}
                            onChange={() => handleSelectRow(item.id)}
                            className="h-3.5 w-3.5 cursor-pointer rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500"
                          />
                        </TableCell>
                        <TableCell className="px-2 py-2.5 text-xs text-gray-500 font-medium">{startIndex + index + 1}</TableCell>
                        <TableCell className="px-2 py-2.5">
                          <span className={`inline-flex px-1.5 py-0.5 rounded-md text-[11px] font-bold shadow-sm ${getMethodStyle(item.method)}`}>
                            {item.method}
                          </span>
                        </TableCell>
                        <TableCell className="px-2 py-2.5 text-xs font-semibold text-gray-800 truncate" title={item.name}>{item.name}</TableCell>
                        <TableCell className="px-2 py-2.5">
                          <code className="text-[11px] bg-gradient-to-r from-gray-100 to-gray-50 px-1.5 py-1 rounded-md font-mono text-gray-700 block truncate border border-gray-200" title={item.path}>
                            {item.path}
                          </code>
                        </TableCell>
                        <TableCell className="px-2 py-2.5">
                          {item.requestParams ? (
                            <div 
                              className="text-[11px] text-gray-600 truncate bg-gray-50 px-1.5 py-0.5 rounded" 
                              title={item.requestParams}
                            >
                              {item.requestParams}
                            </div>
                          ) : (
                            <span className="text-gray-300 text-xs">-</span>
                          )}
                        </TableCell>
                        <TableCell className="px-2 py-2.5">
                          {item.responseParams ? (
                            <div 
                              className="text-[11px] text-gray-600 truncate bg-gray-50 px-1.5 py-0.5 rounded" 
                              title={item.responseParams}
                            >
                              {item.responseParams}
                            </div>
                          ) : (
                            <span className="text-gray-300 text-xs">-</span>
                          )}
                        </TableCell>
                        <TableCell className="px-2 py-2.5">
                          {item.responseFormat ? (
                            <div 
                              className="text-[11px] text-indigo-600 truncate bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100" 
                              title={item.responseFormat}
                            >
                              {item.responseFormat}
                            </div>
                          ) : (
                            <span className="text-gray-300 text-xs">-</span>
                          )}
                        </TableCell>
                        <TableCell className="px-2 py-2.5">
                          {item.description ? (
                            <div 
                              className="text-[11px] text-gray-600 truncate" 
                              title={item.description}
                            >
                              {item.description}
                            </div>
                          ) : (
                            <span className="text-gray-300 text-xs">-</span>
                          )}
                        </TableCell>
                        <TableCell className="px-2 py-2.5">
                          <span className={`inline-flex px-1.5 py-0.5 rounded-md text-[11px] font-bold shadow-sm ${getPriorityStyle(item.priority)}`}>
                            {item.priority}
                          </span>
                        </TableCell>
                        <TableCell className="px-2 py-2.5">
                          <span className="text-[11px] text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded-md truncate block">{item.category}</span>
                        </TableCell>
                        <TableCell className="text-center px-1 py-2.5">
                          <div className="flex items-center justify-center gap-0.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewDetail(item)}
                              className="h-7 w-7 p-0 text-gray-500 hover:text-indigo-600 hover:bg-indigo-100 rounded-lg transition-all"
                              title="查看详情"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditInterface(item.id)}
                              className="h-7 w-7 p-0 text-blue-500 hover:text-blue-700 hover:bg-blue-100 rounded-lg transition-all"
                              title="编辑"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteInterface(item.id)}
                              className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-100 rounded-lg transition-all"
                              title="删除"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={12} className="text-center py-10">
                        <div className="flex flex-col items-center">
                          <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center mb-4">
                            <FileText className="h-8 w-8 text-indigo-400" />
                          </div>
                          <p className="text-sm text-gray-500 font-medium">暂无接口列表</p>
                          <p className="text-xs text-gray-400 mt-1 mb-4">请上传文档并点击开始分析，或手动新增接口</p>
                          <Button
                            size="sm"
                            className="flex items-center space-x-1 h-8 text-xs bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white"
                            onClick={handleAddInterface}
                          >
                            <Plus className="h-3 w-3" />
                            <span>新增接口</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* 分页控件 */}
            {interfaces.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-t bg-gray-50">
                <div className="flex items-center space-x-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePreviousPage}
                    disabled={currentPage === 1}
                    className="h-7 px-2 text-xs"
                  >
                    上一页
                  </Button>
                  <span className="text-xs text-gray-600">
                    第 {currentPage} 页 / 共 {totalPages} 页
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                    className="h-7 px-2 text-xs"
                  >
                    下一页
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-600">每页：</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value))
                      setCurrentPage(1)
                    }}
                    className="px-2 py-1 border rounded-lg text-xs h-7"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <span className="text-xs text-gray-600">共 {interfaces.length} 条</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 编辑对话框 */}
      {editDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col m-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">
                {dialogMode === 'create' ? '新增接口' : '编辑接口'}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancelEdit}
              >
                ✕
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">接口名称 *</label>
                <input
                  type="text"
                  className="w-full border rounded-lg px-3 py-2"
                  defaultValue={editingInterface?.name}
                  id="interface-name"
                  placeholder="请输入接口名称"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">请求方式 *</label>
                  <select
                    className="w-full border rounded-lg px-3 py-2"
                    defaultValue={editingInterface?.method || 'GET'}
                    id="interface-method"
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="DELETE">DELETE</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">优先级 *</label>
                  <select
                    className="w-full border rounded-lg px-3 py-2"
                    defaultValue={editingInterface?.priority || '中'}
                    id="interface-priority"
                  >
                    <option value="高">高</option>
                    <option value="中">中</option>
                    <option value="低">低</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">接口路径 *</label>
                <input
                  type="text"
                  className="w-full border rounded-lg px-3 py-2"
                  defaultValue={editingInterface?.path}
                  id="interface-path"
                  placeholder="/api/xxx"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">接口分类 *</label>
                <input
                  type="text"
                  className="w-full border rounded-lg px-3 py-2"
                  defaultValue={editingInterface?.category}
                  id="interface-category"
                  placeholder="如：用户模块、订单模块等"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">接口描述</label>
                <textarea
                  className="w-full border rounded-lg px-3 py-2 h-20"
                  defaultValue={editingInterface?.description}
                  id="interface-description"
                  placeholder="请描述接口功能"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">请求参数</label>
                <textarea
                  className="w-full border rounded-lg px-3 py-2 h-20"
                  defaultValue={editingInterface?.requestParams}
                  id="interface-request-params"
                  placeholder="JSON格式或字段列表，如：&#10;userId: 用户ID&#10;name: 用户名称"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">响应参数</label>
                <textarea
                  className="w-full border rounded-lg px-3 py-2 h-20"
                  defaultValue={editingInterface?.responseParams}
                  id="interface-response-params"
                  placeholder="响应字段说明，如：&#10;code: 状态码&#10;message: 提示信息&#10;data: 数据对象"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">响应格式</label>
                <textarea
                  className="w-full border rounded-lg px-3 py-2 h-20"
                  defaultValue={editingInterface?.responseFormat}
                  id="interface-response-format"
                  placeholder="响应格式说明，如：JSON格式，包含code、message、data三个字段"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2 p-4 border-t">
              <Button variant="outline" onClick={handleCancelEdit}>
                取消
              </Button>
              <Button
                onClick={() => {
                  const nameInput = document.getElementById('interface-name') as HTMLInputElement
                  const methodInput = document.getElementById('interface-method') as HTMLSelectElement
                  const pathInput = document.getElementById('interface-path') as HTMLInputElement
                  const priorityInput = document.getElementById('interface-priority') as HTMLSelectElement
                  const categoryInput = document.getElementById('interface-category') as HTMLInputElement
                  const descriptionInput = document.getElementById('interface-description') as HTMLTextAreaElement
                  const requestParamsInput = document.getElementById('interface-request-params') as HTMLTextAreaElement
                  const responseParamsInput = document.getElementById('interface-response-params') as HTMLTextAreaElement
                  const responseFormatInput = document.getElementById('interface-response-format') as HTMLTextAreaElement

                  if (!nameInput.value.trim() || !pathInput.value.trim() || !categoryInput.value.trim()) {
                    alert('请填写必填项：接口名称、接口路径、接口分类')
                    return
                  }

                  handleSaveInterface({
                    id: editingInterface?.id || Date.now().toString(),
                    name: nameInput.value.trim(),
                    method: methodInput.value as any,
                    path: pathInput.value.trim(),
                    description: descriptionInput.value.trim(),
                    requestParams: requestParamsInput.value.trim(),
                    responseParams: responseParamsInput.value.trim(),
                    responseFormat: responseFormatInput.value.trim(),
                    priority: priorityInput.value as any,
                    category: categoryInput.value.trim(),
                    _raw: editingInterface?._raw
                  })
                }}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                保存
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 删除确认对话框 */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full m-4 p-6">
            <h3 className="text-lg font-semibold mb-2">确认删除</h3>
            <p className="text-gray-600 mb-4">确定要删除这个接口吗？此操作无法撤销。</p>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={cancelDelete}>
                取消
              </Button>
              <Button variant="destructive" onClick={confirmDelete}>
                删除
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 接口详情对话框 */}
      {detailDialogOpen && viewingInterface && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col m-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">接口详情</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setDetailDialogOpen(false)
                  setViewingInterface(null)
                }}
              >
                ✕
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* 基本信息 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">接口名称</label>
                  <p className="text-gray-900 font-medium">{viewingInterface.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">请求方式</label>
                  <span className={`px-2 py-1 rounded text-sm font-medium ${getMethodStyle(viewingInterface.method)}`}>
                    {viewingInterface.method}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">接口路径</label>
                  <p className="text-gray-900 font-mono text-sm bg-gray-50 px-2 py-1 rounded">{viewingInterface.path}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">接口分类</label>
                  <p className="text-gray-900">{viewingInterface.category}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">优先级</label>
                  <span className={`px-2 py-1 rounded text-sm font-medium ${getPriorityStyle(viewingInterface.priority)}`}>
                    {viewingInterface.priority}
                  </span>
                </div>
                {viewingInterface._raw?.interfaceType && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">接口类型</label>
                    <p className="text-gray-900">{viewingInterface._raw.interfaceType}</p>
                  </div>
                )}
              </div>

              {/* 接口描述 */}
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">接口描述</label>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-700">{viewingInterface.description || '暂无描述'}</p>
                </div>
              </div>

              {/* 请求参数 */}
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">请求参数</label>
                <div className="bg-gray-50 rounded-lg p-3">
                  <pre className="text-gray-700 text-sm whitespace-pre-wrap font-sans">
                    {viewingInterface.requestParams || '暂无请求参数'}
                  </pre>
                </div>
              </div>

              {/* 响应参数 */}
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">响应参数</label>
                <div className="bg-gray-50 rounded-lg p-3">
                  <pre className="text-gray-700 text-sm whitespace-pre-wrap font-sans">
                    {viewingInterface.responseParams || '暂无响应参数'}
                  </pre>
                </div>
              </div>

              {/* 响应格式 */}
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">响应格式</label>
                <div className="bg-gray-50 rounded-lg p-3">
                  <pre className="text-gray-700 text-sm whitespace-pre-wrap font-sans">
                    {viewingInterface.responseFormat || '暂无响应格式说明'}
                  </pre>
                </div>
              </div>

              {/* AI建议 */}
              {viewingInterface._raw?.aiSuggestion && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">AI建议</label>
                  <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                    <p className="text-blue-800 text-sm">{viewingInterface._raw.aiSuggestion}</p>
                  </div>
                </div>
              )}

              {/* 置信度 */}
              {viewingInterface._raw?.confidenceScore !== undefined && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">识别置信度</label>
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          viewingInterface._raw.confidenceScore >= 0.8
                            ? 'bg-green-500'
                            : viewingInterface._raw.confidenceScore >= 0.5
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                        }`}
                        style={{ width: `${viewingInterface._raw.confidenceScore * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-600">
                      {(viewingInterface._raw.confidenceScore * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end space-x-2 p-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setDetailDialogOpen(false)
                  setViewingInterface(null)
                }}
              >
                关闭
              </Button>
              <Button
                onClick={() => {
                  setDetailDialogOpen(false)
                  handleEditInterface(viewingInterface.id)
                }}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                编辑接口
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 文档预览对话框 */}
      {previewDialogOpen && (
        <div className={`fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center ${isFullScreen ? 'p-0' : 'p-4'}`}>
          <div className={`bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ${
            isFullScreen ? 'w-full h-full rounded-none' : 'max-w-4xl w-full max-h-[90vh]'
          }`}>
            <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-indigo-50 to-purple-50">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center">
                  <FileText className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-800">文档预览</h3>
                  <p className="text-sm text-gray-500">{previewFileName}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsFullScreen(!isFullScreen)}
                  className="h-8 px-3 hover:bg-indigo-100 border-indigo-200 text-indigo-600"
                  title={isFullScreen ? "退出全屏" : "全屏查看"}
                >
                  {isFullScreen ? (
                    <>
                      <Minimize2 className="h-4 w-4 mr-1" />
                      <span className="text-xs font-medium">退出全屏</span>
                    </>
                  ) : (
                    <>
                      <Maximize2 className="h-4 w-4 mr-1" />
                      <span className="text-xs font-medium">全屏查看</span>
                    </>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setPreviewDialogOpen(false)
                    setPreviewContent('')
                    setPreviewFileName('')
                    setIsFullScreen(false)
                  }}
                  className="h-8 w-8 p-0 hover:bg-gray-200 rounded-lg"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 min-h-[300px]">
                {previewContent ? (
                  <>
                    {previewIsHtml ? (
                      <div
                        className="prose prose-sm max-w-none leading-relaxed cursor-text select-text"
                        style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
                        dangerouslySetInnerHTML={{
                          __html: `
                            <style>
                              /* 文档基础样式 */
                              .prose { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.8; color: #1f2937; }
                              .prose h1 { font-size: 1.875rem; font-weight: 700; margin-top: 1.5rem; margin-bottom: 1rem; color: #111827; border-bottom: 2px solid #e5e7eb; padding-bottom: 0.5rem; }
                              .prose h2 { font-size: 1.5rem; font-weight: 600; margin-top: 1.25rem; margin-bottom: 0.75rem; color: #1f2937; }
                              .prose h3 { font-size: 1.25rem; font-weight: 600; margin-top: 1rem; margin-bottom: 0.5rem; color: #374151; }
                              .prose h4 { font-size: 1.125rem; font-weight: 600; margin-top: 0.75rem; margin-bottom: 0.5rem; color: #4b5563; }
                              .prose p { margin-bottom: 1rem; text-align: justify; }
                              .prose ul, .prose ol { margin-bottom: 1rem; padding-left: 1.5rem; }
                              .prose li { margin-bottom: 0.5rem; }
                              .prose table { width: 100%; border-collapse: collapse; margin-bottom: 1rem; font-size: 0.875rem; }
                              .prose th { background-color: #f3f4f6; font-weight: 600; text-align: left; padding: 0.75rem; border: 1px solid #e5e7eb; }
                              .prose td { padding: 0.75rem; border: 1px solid #e5e7eb; }
                              .prose img { max-width: 100%; height: auto; margin: 1rem auto; display: block; border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
                              .prose blockquote { border-left: 4px solid #6366f1; padding-left: 1rem; margin: 1rem 0; color: #4b5563; font-style: italic; background-color: #f9fafb; padding: 0.5rem 1rem; border-radius: 0 4px 4px 0; }
                              .prose code { background-color: #f3f4f6; padding: 0.2em 0.4em; border-radius: 3px; font-size: 0.9em; color: #c7254e; }
                              .prose pre { background-color: #1e293b; color: #f8fafc; padding: 1em; border-radius: 6px; overflow-x: auto; }
                              .prose a { color: #6366f1; text-decoration: none; }
                              .prose a:hover { text-decoration: underline; }
                              .prose hr { border-color: #e5e7eb; margin: 1.5rem 0; }
                              /* 列表序号样式 */
                              .prose ul li::marker, .prose ol li::marker { color: #374151; font-weight: 600; }
                            </style>
                            ${previewContent}
                          `
                        }}
                      />
                    ) : (
                      <div className="bg-gray-50 rounded-lg p-6">
                        <pre className="whitespace-pre-wrap break-words text-sm font-mono text-gray-800 leading-relaxed font-sans cursor-text select-text">
                          {previewContent}
                        </pre>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                    <FileText className="h-12 w-12 mb-3" />
                    <p>暂无文档内容</p>
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end p-4 border-t bg-white">
              <Button
                variant="outline"
                onClick={() => {
                  setPreviewDialogOpen(false)
                  setPreviewContent('')
                  setPreviewFileName('')
                  setIsFullScreen(false)
                }}
                className="px-6"
              >
                关闭预览
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 接口归档对话框 */}
      <InterfaceArchiveDialog
        isOpen={archiveDialogOpen}
        interfaces={interfaces}
        sourceType={inputSource?.type || null}
        sourceContent={manualText}
        sourceFileName={file?.name}
        sourceRequirementTitle={inputSource?.type === 'requirement' ? inputSource.requirementTitle : undefined}
        onConfirm={handleArchiveConfirm}
        onCancel={() => setArchiveDialogOpen(false)}
        saving={archiveSaving}
      />
    </div>
  )
}

export default InterfaceList
