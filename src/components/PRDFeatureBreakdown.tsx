import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Upload, FileText, Download, Search, Plus, Edit, Trash2, GripVertical, Eye, X, Maximize2, Minimize2, CheckCircle, XCircle, ChevronUp, ChevronDown, ArrowUpDown, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { analyzeDocument } from '../services/analysis-api'
import { downloadFeaturesAsExcel } from '../utils/excelExport'
import FeatureEditDialog from './FeatureEditDialog'
import ConfirmModal from './ConfirmModal'
import { toast } from '@/components/ui/toast-container'
import mammoth from 'mammoth'
import { UnifiedInputSource } from '@/types/unified-input'
import { smartContentLoader } from '@/utils/SmartContentLoader'
import InputSourceSelector from './InputSourceSelector'

interface Feature {
  id: string
  name: string
  description: string
  kanoModel: string
  priority: string
  businessRules: string
}

const PRDFeatureBreakdown = () => {
  const [inputSource, setInputSource] = useState<UnifiedInputSource | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [features, setFeatures] = useState<Array<Feature>>([])
  const [manualText, setManualText] = useState('')
  const [filePreviewContent, setFilePreviewContent] = useState<string>('')
  const [filePreviewHtml, setFilePreviewHtml] = useState<string>('')
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [isFullscreenPreview, setIsFullscreenPreview] = useState(false)
  const [isContentLoading, setIsContentLoading] = useState(false)

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // 左侧模块收缩状态
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(false)

  // 上传进度和状态
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle')
  const [uploadMessage, setUploadMessage] = useState('')

  // 排序状态
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null)

  // 批量选择状态
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isAllSelected, setIsAllSelected] = useState(false)

  // 批量删除确认弹框
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false)
  // 删除上传文件确认弹框
  const [showRemoveFileConfirm, setShowRemoveFileConfirm] = useState(false)

  // 预览模态框拖拽状态
  const [isDragging, setIsDragging] = useState(false)
  const [modalPosition, setModalPosition] = useState({ x: 0, y: 0 })
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [modalInitialPosition, setModalInitialPosition] = useState({ x: 0, y: 0 })

  // 排序函数
  const getSortedFeatures = (features: Feature[]) => {
    if (!sortConfig) return features

    return [...features].sort((a, b) => {
      let aValue = a[sortConfig.key as keyof Feature]
      let bValue = b[sortConfig.key as keyof Feature]

      // 优先级特殊处理
      if (sortConfig.key === 'priority') {
        const priorityOrder: Record<string, number> = { '高': 1, '中': 2, '低': 3 }
        const aPriority = priorityOrder[aValue as string] || 4
        const bPriority = priorityOrder[bValue as string] || 4
        aValue = aPriority as any
        bValue = bPriority as any
      }

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1
      }
      return 0
    })
  }

  // 计算分页数据
  const sortedFeatures = getSortedFeatures(features)
  const totalPages = Math.ceil(sortedFeatures.length / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const currentFeatures = sortedFeatures.slice(startIndex, endIndex)

  // 分页控制函数
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

  // 排序处理
  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc'
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
  }

  // 批量选择处理
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(currentFeatures.map(f => f.id))
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
    setIsAllSelected(newSelectedIds.size === currentFeatures.length)
  }

  // 批量删除
  const handleBatchDelete = () => {
    if (selectedIds.size === 0) return
    setShowBatchDeleteConfirm(true)
  }

  const handleBatchDeleteConfirm = () => {
    setFeatures(features.filter(f => !selectedIds.has(f.id)))
    setSelectedIds(new Set())
    setIsAllSelected(false)
    setShowBatchDeleteConfirm(false)
  }

  // 批量导出
  const handleBatchExport = () => {
    if (selectedIds.size === 0) {
      toast.warning('请先选择要导出的功能')
      return
    }

    const selectedFeatures = features.filter(f => selectedIds.has(f.id))

    if (selectedFeatures.length === 0) {
      toast.warning('暂无功能清单可导出')
      return
    }

    try {
      // CSV头部
      const headers = ['序号,功能点,功能描述,KANO模型,优先级,业务规则']

      // CSV数据行
      const rows = selectedFeatures.map((feature, index) => {
        // 处理包含逗号的字段
        const escapeCSV = (text: string) => {
          if (text.includes(',') || text.includes('"') || text.includes('\n')) {
            return `"${text.replace(/"/g, '""')}"`
          }
          return text
        }

        return [
          index + 1,
          escapeCSV(feature.name),
          escapeCSV(feature.description),
          escapeCSV(feature.kanoModel),
          escapeCSV(feature.priority),
          escapeCSV(feature.businessRules)
        ].join(',')
      })

      // 组合CSV内容
      const csvContent = [headers.join(','), ...rows].join('\n')

      console.log('CSV内容长度:', csvContent.length)

      // 添加BOM以支持Excel正确显示中文
      const BOM = '\uFEFF'
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })

      // 创建下载链接
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      const fileName = `功能清单_批量导出_${new Date().toLocaleDateString('zh-CN')}.csv`
      link.setAttribute('download', fileName)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast.success(`CSV 导出成功，文件名: ${fileName}`)
    } catch (error) {
      console.error('CSV导出失败:', error)
      toast.error(`CSV导出失败：${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  // 模态框拖拽处理
  const handleModalMouseDown = (e: React.MouseEvent) => {
    if (isFullscreenPreview) return // 全屏模式下不允许拖拽

    // 检查点击目标是否是按钮或其子元素，如果是则不触发拖拽
    const target = e.target as HTMLElement
    if (target.closest('button')) {
      return
    }

    // 记录鼠标初始位置和模态框初始位置
    setIsDragging(true)
    setDragStart({
      x: e.clientX,
      y: e.clientY
    })
    setModalInitialPosition({
      x: modalPosition.x,
      y: modalPosition.y
    })
  }

  const handleModalMouseMove = (e: React.MouseEvent<HTMLDivElement> | MouseEvent) => {
    if (!isDragging) return

    // 计算新的位置
    const newX = modalInitialPosition.x + (e.clientX - dragStart.x)
    const newY = modalInitialPosition.y + (e.clientY - dragStart.y)

    setModalPosition({
      x: newX,
      y: newY
    })
  }

  const handleModalMouseUp = () => {
    setIsDragging(false)
  }

  // 监听模态框拖拽
  useEffect(() => {
    if (isDragging && !isFullscreenPreview) {
      document.addEventListener('mousemove', handleModalMouseMove)
      document.addEventListener('mouseup', handleModalMouseUp)
    }
    return () => {
      document.removeEventListener('mousemove', handleModalMouseMove)
      document.removeEventListener('mouseup', handleModalMouseUp)
    }
  }, [isDragging, dragStart, isFullscreenPreview, modalInitialPosition])

  // 编辑对话框状态
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingFeature, setEditingFeature] = useState<Feature | undefined>(undefined)
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create')

  // 删除确认对话框状态
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deletingFeatureId, setDeletingFeatureId] = useState<string | null>(null)

  // 列宽状态 - 优化默认列宽以适应100%缩放
  const [columnWidths, setColumnWidths] = useState<number[]>([50, 60, 100, 250, 100, 80, 180, 100])
  const [resizing, setResizing] = useState<number | null>(null)

  // 列宽本地存储键
  const COLUMN_WIDTHS_KEY = 'prd-feature-column-widths'

  // 初始化列宽（从localStorage读取）
  useEffect(() => {
    const savedWidths = localStorage.getItem(COLUMN_WIDTHS_KEY)
    if (savedWidths) {
      try {
        const widths = JSON.parse(savedWidths)
        if (Array.isArray(widths) && widths.length === 8) {
          setColumnWidths(widths)
        }
      } catch (error) {
        console.error('读取列宽失败:', error)
      }
    }
  }, [])

  // 保存列宽到localStorage
  const saveColumnWidths = (widths: number[]) => {
    localStorage.setItem(COLUMN_WIDTHS_KEY, JSON.stringify(widths))
    setColumnWidths(widths)
  }

  // 处理列宽拖拽
  const [isColumnDragging, setIsColumnDragging] = useState(false)
  const [dragStartX, setDragStartX] = useState(0)
  const [dragStartWidth, setDragStartWidth] = useState(0)
  const [dragColumnIndex, setDragColumnIndex] = useState<number | null>(null)

  const handleMouseDown = (e: React.MouseEvent, index: number) => {
    e.preventDefault()
    setIsColumnDragging(true)
    setDragStartX(e.clientX)
    setDragStartWidth(columnWidths[index])
    setDragColumnIndex(index)
    setResizing(index)
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!isColumnDragging || dragColumnIndex === null) return

    const diff = e.clientX - dragStartX
    const newWidth = Math.max(60, dragStartWidth + diff) // 最小宽度60px
    const newWidths = [...columnWidths]
    newWidths[dragColumnIndex] = newWidth
    setColumnWidths(newWidths)
  }

  const handleMouseUp = () => {
    if (isColumnDragging && dragColumnIndex !== null) {
      const newWidths = [...columnWidths]
      saveColumnWidths(newWidths) // 保存到localStorage
    }
    setIsColumnDragging(false)
    setResizing(null)
    setDragColumnIndex(null)
  }

  // 全局监听鼠标移动和松开
  useEffect(() => {
    if (isColumnDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isColumnDragging, dragStartX, dragStartWidth, dragColumnIndex])

  // 处理文件上传
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setUploadStatus('uploading')
      setUploadProgress(0)

      // 模拟上传进度
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 100)

      try {
        setFile(selectedFile)
        // 读取文件内容用于预览
        const content = await readFileContent(selectedFile)
        setFilePreviewContent(content.text)
        if (content.html) {
          setFilePreviewHtml(content.html)
        }

        // 完成上传
        clearInterval(progressInterval)
        setUploadProgress(100)
        setUploadStatus('success')
        setUploadMessage('文件上传成功！')

        // 3秒后清除状态
        setTimeout(() => {
          setUploadStatus('idle')
          setUploadProgress(0)
          setUploadMessage('')
        }, 3000)
      } catch (error) {
        console.error('读取文件内容失败:', error)
        clearInterval(progressInterval)
        setUploadStatus('error')
        setUploadMessage('文件上传失败，请重试')
        setFilePreviewContent('')
        setFilePreviewHtml('')

        // 3秒后清除状态
        setTimeout(() => {
          setUploadStatus('idle')
          setUploadProgress(0)
          setUploadMessage('')
        }, 3000)
      }
    }
  }

  // 处理拖拽上传
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files?.[0]
    if (droppedFile) {
      setUploadStatus('uploading')
      setUploadProgress(0)

      // 模拟上传进度
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 100)

      try {
        setFile(droppedFile)
        // 读取文件内容用于预览
        const content = await readFileContent(droppedFile)
        setFilePreviewContent(content.text)
        if (content.html) {
          setFilePreviewHtml(content.html)
        }

        // 完成上传
        clearInterval(progressInterval)
        setUploadProgress(100)
        setUploadStatus('success')
        setUploadMessage('文件上传成功！')

        // 3秒后清除状态
        setTimeout(() => {
          setUploadStatus('idle')
          setUploadProgress(0)
          setUploadMessage('')
        }, 3000)
      } catch (error) {
        console.error('读取文件内容失败:', error)
        clearInterval(progressInterval)
        setUploadStatus('error')
        setUploadMessage('文件上传失败，请重试')
        setFilePreviewContent('')
        setFilePreviewHtml('')

        // 3秒后清除状态
        setTimeout(() => {
          setUploadStatus('idle')
          setUploadProgress(0)
          setUploadMessage('')
        }, 3000)
      }
    }
  }

  // 读取文本文件内容
  const readTextFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const content = e.target?.result as string
        resolve(content)
      }
      reader.onerror = reject
      reader.readAsText(file)
    })
  }

  // 读取文件内容（支持多种格式）
  const readFileContent = async (file: File): Promise<{ text: string; html?: string }> => {
    const extension = file.name.split('.').pop()?.toLowerCase()

    if (extension === 'docx') {
      // 使用 mammoth 读取 Word 文档（保留格式）
      try {
        const arrayBuffer = await file.arrayBuffer()
        const result = await mammoth.convertToHtml({
          arrayBuffer
        } as any)
        return {
          text: result.value,
          html: result.value
        }
      } catch (error) {
        console.error('读取 Word 文档失败:', error)
        throw new Error('读取 Word 文档失败，请确保文件格式正确')
      }
    } else if (extension === 'doc') {
      // 旧版 Word (.doc) 不支持，提示用户转换
      throw new Error('不支持旧版 .doc 格式，请将文档另存为 .docx 格式后重试')
    } else if (extension === 'txt' || file.type.includes('text')) {
      const content = await readTextFile(file)
      return { text: content }
    } else if (extension === 'pdf') {
      throw new Error('暂不支持 PDF 文件直接上传，请将文档内容复制到 TXT 文件中上传')
    } else {
      // 尝试作为文本文件读取
      const content = await readTextFile(file)
      return { text: content }
    }
  }

  // 处理输入源变化
  const handleInputSourceChange = async (source: UnifiedInputSource | null) => {
    if (!source) {
      setInputSource(null)
      setFile(null)
      setManualText('')
      return
    }

    setInputSource(source)

    // 如果是需求池需求，自动加载内容
    if (source.type === 'requirement') {
      setIsContentLoading(true)
      try {
        const content = await smartContentLoader.getContent(source)
        setManualText(content.text)
        setFilePreviewContent(content.text)
        setFilePreviewHtml(content.html || '')
        console.log('[Breakdown] 从需求池加载内容成功:', content.sourceInfo)
      } catch (error) {
        console.error('[Breakdown] 加载需求内容失败:', error)
        toast.error(`加载需求内容失败: ${error instanceof Error ? error.message : '未知错误'}`)
        setInputSource(null)
      } finally {
        setIsContentLoading(false)
      }
    } else if (source.type === 'document') {
      setFile(null)
      setManualText('')
      setFilePreviewContent('')
      setFilePreviewHtml('')
    } else if (source.type === 'text') {
      setFile(null)
      // 重要：同步文本内容到 manualText
      setManualText(source.content || '')
      setFilePreviewContent(source.content || '')
      setFilePreviewHtml('')
    }
  }

  // 开始分析
  const handleStartAnalysis = async () => {
    if (isContentLoading) {
      toast.info('正在加载内容，请稍候...')
      return
    }

    console.log('\n=== 开始需求拆解分析 ===')
    console.log('[调试] file状态:', !!file, file?.name)
    console.log('[调试] manualText状态:', manualText ? `${manualText.length}字符` : '空')
    console.log('[调试] inputSource状态:', inputSource)

    if (!file && !manualText.trim()) {
      console.error('[错误] 没有输入内容')
      toast.warning('请上传文件或输入文本内容')
      return
    }

    // 检查文档长度，给出友好提示
    const contentLength = manualText.trim().length || filePreviewContent.length
    const estimatedBatches = Math.ceil(contentLength / 4000)
    const estimatedTime = estimatedBatches * 20 // 估算每批20秒

    if (contentLength > 12000) {
      toast.warning(`文档较长(${Math.round(contentLength/1000)}k字符)，预计需要${Math.round(estimatedTime/60)}-${Math.round(estimatedTime/60 + 1)}分钟，请耐心等待...`, { duration: 5000 })
    } else if (contentLength > 4000) {
      toast.info(`文档将分${estimatedBatches}批处理，预计需要${estimatedTime}-${estimatedTime + 20}秒...`, { duration: 4000 })
    }

    setIsAnalyzing(true)
    toast.info('正在分析文档，请稍候...')

    try {
      let content = ''
      if (manualText.trim()) {
        content = manualText.trim()
        console.log('[信息] 使用手动输入的文本')
      } else if (file) {
        const fileContent = await readFileContent(file)
        content = fileContent.text
        console.log('[信息] 使用上传的文件内容')
      } else {
        throw new Error('请上传文件或输入文本内容')
      }

      console.log('[信息] 文档内容长度:', content.length)
      console.log('[信息] 内容预览:', content.substring(0, 100) + '...')

      if (content.length < 50) {
        throw new Error('文档内容过短，至少需要50个字符')
      }

      // 检查文档长度，给出警告和建议
      if (content.length > 20000) {
        console.warn('[警告] 文档较长:', content.length, '字符')
        toast.warning('文档较长，分析可能需要较长时间，请耐心等待...', { duration: 6000 })
        // 建议用户简化文档
        await new Promise(resolve => setTimeout(resolve, 1000)) // 让用户有时间看到警告
      } else if (content.length > 10000) {
        toast.info('文档适中，正在分析...', { duration: 3000 })
      }

      let analysisType = 'txt'
      if (file) {
        const extension = file.name.split('.').pop()?.toLowerCase()
        if (file.type.includes('pdf') || extension === 'pdf') {
          analysisType = 'pdf'
        } else if (file.type.includes('word') || extension === 'docx' || extension === 'doc') {
          analysisType = 'docx'
        } else if (file.type.includes('text') || extension === 'txt') {
          analysisType = 'txt'
        }
      } else {
        analysisType = 'txt'
      }

      console.log('调用API分析，类型:', analysisType)
      const response = await analyzeDocument(content, analysisType)
      console.log('API响应:', response)
      console.log('API响应类型:', typeof response)

      // 处理不同的响应格式
      let featuresData = []
      if (response && (response as any).success && (response as any).data?.features) {
        // 格式1: { success: true, data: { features: [...] } }
        featuresData = (response as any).data.features
        console.log('检测到格式1: success + data.features')
      } else if (response && (response as any).features) {
        // 格式2: { features: [...] }
        featuresData = (response as any).features
        console.log('检测到格式2: 直接features')
      } else if (response && Array.isArray(response)) {
        // 格式3: 直接是数组 [...]
        featuresData = response
        console.log('检测到格式3: 直接数组')
      } else {
        console.error('未知的响应格式:', JSON.stringify(response, null, 2))
        throw new Error('服务器返回数据格式异常')
      }

      console.log('解析到的功能数据:', featuresData)
      console.log('功能数量:', featuresData.length)

      if (!Array.isArray(featuresData)) {
        console.error('featuresData不是数组:', typeof featuresData)
        throw new Error('返回的功能数据格式错误')
      }

      if (featuresData.length === 0) {
        toast.warning('未能从文档中提取到功能点，请检查文档内容')
        setFeatures([{
          id: '1',
          name: '未识别到功能点',
          description: '请确保文档中包含清晰的功能描述，或尝试使用更规范的PRD格式',
          kanoModel: '基本型需求',
          priority: '中',
          businessRules: '建议使用结构化的需求描述格式，包含明确的功能点描述'
        }])
      } else {
        toast.success(`成功提取 ${featuresData.length} 个功能点`)
        setFeatures(featuresData)
      }
    } catch (error) {
      console.error('\n=== AI分析失败 ===')
      console.error('错误对象:', error)
      console.error('错误类型:', error?.constructor?.name)
      
      let errorMessage = 'AI分析过程中发生错误，请稍后重试'
      let errorDetails = ''
      
      if (error instanceof Error) {
        errorMessage = error.message
        console.error('错误信息:', error.message)
        console.error('错误堆栈:', error.stack)
        
        if (error.message.includes('timeout') || error.message.includes('超时')) {
          errorMessage = '分析超时，文档可能过长，请简化后重试'
          errorDetails = '建议：将文档拆分为多个部分分别分析'
        } else if (error.message.includes('network') || error.message.includes('网络')) {
          errorMessage = '网络连接异常，请检查网络设置'
          errorDetails = '建议：检查网络连接或稍后重试'
        } else if (error.message.includes('频率超限') || error.message.includes('429')) {
          errorMessage = 'API调用频率超限，请等待1-2分钟后重试'
          errorDetails = '建议：等待片刻后再试'
        } else if (error.message.includes('API密钥') || error.message.includes('API Key')) {
          errorMessage = 'AI服务配置错误，请联系管理员'
          errorDetails = '建议：联系系统管理员检查配置'
        }
      }

      toast.error(errorMessage)
      setFeatures([{
        id: '1',
        name: '分析失败',
        description: errorMessage,
        kanoModel: '基本型需求',
        priority: '高',
        businessRules: errorDetails || '请检查文档内容或稍后重试'
      }])
    } finally {
      setIsAnalyzing(false)
      console.log('=== 需求拆解分析结束 ===\n')
    }
  }

  // 导出格式状态
  const [exportFormat, setExportFormat] = useState<'csv' | 'excel'>('csv')

  // 导出功能为CSV（稳定版本）
  const handleExportCSV = () => {
    console.log('=== 开始CSV导出 ===')
    console.log('功能数量:', features.length)

    if (features.length === 0) {
      toast.warning('暂无功能清单可导出')
      return
    }

    try {
      // CSV头部
      const headers = ['序号,功能点,功能描述,KANO模型,优先级,业务规则']

      // CSV数据行
      const rows = features.map((feature, index) => {
        // 处理包含逗号的字段
        const escapeCSV = (text: string) => {
          if (text.includes(',') || text.includes('"') || text.includes('\n')) {
            return `"${text.replace(/"/g, '""')}"`
          }
          return text
        }

        return [
          index + 1,
          escapeCSV(feature.name),
          escapeCSV(feature.description),
          escapeCSV(feature.kanoModel),
          escapeCSV(feature.priority),
          escapeCSV(feature.businessRules)
        ].join(',')
      })

      // 组合CSV内容
      const csvContent = [headers.join(','), ...rows].join('\n')

      console.log('CSV内容长度:', csvContent.length)

      // 添加BOM以支持Excel正确显示中文
      const BOM = '\uFEFF'
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })

      // 创建下载链接
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      const fileName = `功能清单_${new Date().toLocaleDateString('zh-CN')}.csv`
      link.setAttribute('download', fileName)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast.success(`CSV 导出成功，文件名: ${fileName}`)
    } catch (error) {
      console.error('CSV导出失败:', error)
      toast.error(`CSV导出失败：${error instanceof Error ? error.message : '未知错误'}`)
      throw error
    }
  }

  // 导出功能为Excel
  const handleExportExcel = () => {
    if (features.length === 0) {
      toast.warning('暂无功能清单可导出')
      return
    }

    try {
      downloadFeaturesAsExcel(features)
      toast.success('Excel 导出成功')
    } catch (error) {
      console.error('Excel导出失败:', error)
      toast.error('Excel文件导出失败：' + (error instanceof Error ? error.message : '未知错误'))
    }
  }

  // 根据选择的格式导出
  const handleExport = () => {
    console.log('点击导出按钮，当前格式:', exportFormat)

    if (exportFormat === 'excel') {
      handleExportExcel()
    } else {
      handleExportCSV()
    }
  }

  // 新增功能
  const handleAddFeature = () => {
    setDialogMode('create')
    setEditingFeature(undefined)
    setEditDialogOpen(true)
  }

  // 编辑功能
  const handleEditFeature = (featureId: string) => {
    const feature = features.find(f => f.id === featureId)
    if (feature) {
      setDialogMode('edit')
      setEditingFeature(feature)
      setEditDialogOpen(true)
    }
  }

  // 删除功能
  const handleDeleteFeature = (featureId: string) => {
    setDeletingFeatureId(featureId)
    setDeleteConfirmOpen(true)
  }

  // 确认删除
  const confirmDelete = () => {
    if (deletingFeatureId) {
      setFeatures(features.filter(f => f.id !== deletingFeatureId))
      setDeleteConfirmOpen(false)
      setDeletingFeatureId(null)
    }
  }

  // 取消删除
  const cancelDelete = () => {
    setDeleteConfirmOpen(false)
    setDeletingFeatureId(null)
  }

  // 保存功能（新增或编辑）
  const handleSaveFeature = (feature: Feature) => {
    if (dialogMode === 'create') {
      setFeatures([...features, feature])
    } else {
      setFeatures(features.map(f => f.id === feature.id ? feature : f))
    }
    setEditDialogOpen(false)
    setEditingFeature(undefined)
  }

  // 取消编辑
  const handleCancelEdit = () => {
    setEditDialogOpen(false)
    setEditingFeature(undefined)
  }

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  // 打开文件预览
  const handleOpenPreview = () => {
    setShowPreviewModal(true)
  }

  // 关闭文件预览
  const handleClosePreview = () => {
    setShowPreviewModal(false)
    // 关闭预览时重置全屏状态
    setIsFullscreenPreview(false)
  }

  // 渲染可调整宽度的表头（支持排序）
  const renderResizableHeader = (title: string, index: number, sortable: boolean = false, sortKey?: string) => {
    const isSorted = sortConfig && sortConfig.key === sortKey
    return (
      <TableHead
        className={`whitespace-nowrap relative select-none px-2 py-2 text-xs ${sortable ? 'cursor-pointer hover:bg-gray-100' : ''}`}
        style={{
          width: columnWidths[index],
          minWidth: 50,
          maxWidth: 500,
          cursor: resizing === index ? 'col-resize' : (sortable ? 'pointer' : 'default')
        }}
        onClick={sortable ? () => handleSort(sortKey!) : undefined}
      >
        <span className="pr-3 flex items-center">
          {title}
          {sortable && (
            <span className="ml-1">
              {isSorted ? (
                sortConfig.direction === 'asc' ? (
                  <ChevronUp className="h-3 w-3 inline" />
                ) : (
                  <ChevronDown className="h-3 w-3 inline" />
                )
              ) : (
                <ArrowUpDown className="h-3 w-3 inline text-gray-400" />
              )}
            </span>
          )}
        </span>
        {index < columnWidths.length - 1 && (
          <div
            className={`absolute right-0 top-0 bottom-0 w-1 flex items-center justify-center cursor-col-resize hover:bg-indigo-500 transition-colors group`}
            onMouseDown={(e) => {
              e.stopPropagation()
              handleMouseDown(e, index)
            }}
            style={{ right: '-2px' }}
          >
            <GripVertical className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        )}
      </TableHead>
    )
  }

  // 渲染省略号单元格
  const renderEllipsisCell = (content: string, index: number) => {
    return (
      <TableCell
        className="whitespace-nowrap px-2 py-2 text-xs"
        style={{
          width: columnWidths[index],
          maxWidth: columnWidths[index],
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}
        title={content}
      >
        {content}
      </TableCell>
    )
  }

  return (
    <div className="flex h-full overflow-hidden bg-gradient-to-br from-[#fafbfc] via-white to-[#f5f3ff]">
      {/* 左侧文档上传区域 */}
      <div className={`border-r border-indigo-100 transition-all duration-300 flex-shrink-0 h-full ${isLeftPanelCollapsed ? 'w-0 p-0 overflow-hidden' : 'w-[300px] p-3'}`}>
        <Card className={`${isLeftPanelCollapsed ? 'hidden' : ''}shadow-sm border-indigo-100 rounded-2xl flex flex-col h-full overflow-hidden`}>
          <CardHeader className="pb-3 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-t-2xl flex-shrink-0">
            <CardTitle className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-2">
                <FileText className="h-4 w-4 text-indigo-500" />
                <span className="font-bold text-gray-800">文档上传</span>
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
          <CardContent className="flex-1 overflow-y-auto p-3 min-h-0">
            {/* 统一输入源选择器 */}
            <InputSourceSelector
              value={inputSource}
              onChange={handleInputSourceChange}
              availableModes={['text', 'document', 'requirement']}
              disabled={isAnalyzing || isContentLoading}
            />

            {/* 加载状态提示 */}
            {isContentLoading && (
              <div className="flex items-center justify-center p-4 bg-indigo-50 rounded-xl mt-3">
                <Loader2 className="h-5 w-5 text-indigo-600 mr-2 animate-spin" />
                <span className="text-indigo-700 text-sm">正在加载需求内容...</span>
              </div>
            )}

            {/* 文档上传区域（仅在文档模式下显示） */}
            {inputSource?.type === 'document' && (
              <>
                <div
                  className="border-2 border-dashed border-indigo-200 rounded-2xl p-5 text-center hover:border-indigo-400 hover:bg-gradient-to-br hover:from-indigo-50 hover:to-purple-50 transition-all duration-300 cursor-pointer mb-3 group"
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
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
                  <p className="text-xs text-gray-500 mb-1">支持 TXT 和 DOCX 文件</p>
                  <p className="text-[10px] text-indigo-500 font-medium">
                    💡 提示：PDF 和旧版 .doc 格式请先转换为 DOCX 或 TXT
                  </p>
                </div>

                {/* 已上传文件信息 */}
                {file && (
                  <div className="mt-3 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-3 border border-indigo-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 flex-1 min-w-0 pr-2">
                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
                          <FileText className="h-4 w-4 text-indigo-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-1.5 mb-0.5">
                            <span className="text-xs font-semibold text-gray-800 truncate block w-full" title={file.name}>{file.name}</span>
                          </div>
                          <div className="flex items-center space-x-1.5">
                            <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-[10px] font-medium">
                              {file.name.endsWith('.docx') ? 'Word 文档' : '文本文件'}
                            </span>
                            <span className="text-[10px] text-gray-500">{formatFileSize(file.size)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 px-0 border-indigo-200 hover:bg-indigo-100 hover:border-indigo-300 text-indigo-600"
                          onClick={handleOpenPreview}
                          title="预览文档"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 px-0 border-rose-200 hover:bg-rose-100 hover:border-rose-300 text-rose-600"
                          onClick={() => setShowRemoveFileConfirm(true)}
                          title="删除文档"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* 上传进度条 */}
                    {uploadStatus === 'uploading' && (
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs text-gray-600 mb-1.5">
                          <span className="font-medium">上传中...</span>
                          <span className="font-semibold text-indigo-600">{uploadProgress}%</span>
                        </div>
                        <div className="w-full bg-indigo-100 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                          ></div>
                        </div>
                      </div>
                    )}

                    {/* 上传状态提示 */}
                    {uploadStatus === 'success' && (
                      <div className="mt-3 flex items-center justify-center p-2 bg-green-50 rounded-lg border border-green-200">
                        <CheckCircle className="h-4 w-4 mr-1.5 text-green-600" />
                        <span className="text-xs font-medium text-green-700">{uploadMessage}</span>
                      </div>
                    )}

                    {uploadStatus === 'error' && (
                      <div className="mt-3 flex items-center justify-center p-2 bg-red-50 rounded-lg border border-red-200">
                        <XCircle className="h-4 w-4 mr-1.5 text-red-600" />
                        <span className="text-xs font-medium text-red-700">{uploadMessage}</span>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

          </CardContent>
          {/* 固定底部区域：文档长度提示 + 开始拆解按钮 + 分析进度 */}
          <div className="flex-shrink-0 px-3 pb-3 pt-1 border-t border-indigo-50 bg-gradient-to-r from-indigo-50/50 to-purple-50/50 rounded-b-2xl">
            {(file || manualText.trim()) && (
              <div className="mb-2 px-3 py-1.5 bg-indigo-50 rounded-lg border border-indigo-100">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">文档长度:</span>
                  <span className="font-medium text-indigo-600">
                    {manualText.trim().length || filePreviewContent.length} 字符
                  </span>
                </div>
                {(manualText.trim().length || filePreviewContent.length) > 20000 && (
                  <p className="text-xs text-orange-600 mt-1">
                    ⚠️ 文档较长，建议拆分为多个小文档分别处理
                  </p>
                )}
              </div>
            )}

            <Button
              className="w-full h-10 text-sm font-medium bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 text-white shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all duration-300 rounded-xl"
              onClick={handleStartAnalysis}
              disabled={(!file && !manualText.trim()) || isAnalyzing || isContentLoading}
            >
              {isAnalyzing ? (
                <span className="flex items-center justify-center">
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  拆解中...
                </span>
              ) : (
                <span className="flex items-center justify-center">
                  <FileText className="h-4 w-4 mr-2" />
                  开始拆解
                </span>
              )}
            </Button>

            {isAnalyzing && (
              <div className="mt-2 px-3 py-1.5 bg-indigo-50 rounded-lg border border-indigo-100">
                <p className="text-xs text-indigo-600 text-center">
                  💡 正在调用AI服务分析文档，请耐心等待...
                </p>
                <p className="text-xs text-gray-500 text-center mt-0.5">
                  长文档会分批处理，可能需要1-2分钟
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* 右侧功能清单区域 */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="px-4 py-3 border-b border-indigo-100 bg-white/80 backdrop-blur-sm">
          <div className="flex items-center justify-between">
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
              <h2 className="text-lg font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">功能清单</h2>
            </div>
            <div className="flex items-center space-x-1.5">
              <div className="relative">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索功能..."
                  className="pl-8 pr-3 py-1.5 border border-gray-200 rounded-xl text-xs w-40 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                />
              </div>

              {/* 批量操作按钮 */}
              {selectedIds.size > 0 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center space-x-1 h-8 px-3 text-xs rounded-xl border-indigo-200 hover:bg-indigo-50 hover:border-indigo-300 text-indigo-600"
                    onClick={handleBatchExport}
                  >
                    <Download className="h-3 w-3" />
                    <span className="font-medium">批量导出 ({selectedIds.size})</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center space-x-1 h-8 px-3 text-xs rounded-xl border-rose-200 hover:bg-rose-50 hover:border-rose-300 text-rose-600"
                    onClick={handleBatchDelete}
                  >
                    <Trash2 className="h-3 w-3" />
                    <span className="font-medium">批量删除 ({selectedIds.size})</span>
                  </Button>
                </>
              )}

              {/* 导出格式选择 */}
              <select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value as 'csv' | 'excel')}
                className="px-3 py-1.5 border border-gray-200 rounded-xl text-xs h-8 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
              >
                <option value="csv">CSV（推荐）</option>
                <option value="excel">Excel</option>
              </select>
              <Button
                size="sm"
                className="flex items-center space-x-1 h-8 px-3 text-xs rounded-xl border-indigo-200 hover:bg-indigo-50 text-indigo-600"
                onClick={handleExport}
                disabled={features.length === 0}
              >
                <Download className="h-3 w-3" />
                <span className="font-medium">导出全部</span>
              </Button>
              <Button
                size="sm"
                className="flex items-center space-x-1 h-8 px-3 text-xs rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white shadow-lg shadow-indigo-500/25"
                onClick={handleAddFeature}
              >
                <Plus className="h-3 w-3" />
                <span className="font-medium">新增功能</span>
              </Button>
            </div>
          </div>
        </div>

      {/* 功能清单表格 */}
        <Card className="flex-1 flex flex-col min-h-0 mx-4 my-3">
          <CardContent className="p-0 flex-1 flex flex-col">
            <div className="overflow-x-auto flex-1">
              <Table style={{ tableLayout: 'fixed' }}>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-center w-10 px-1 py-2">
                      <input
                        type="checkbox"
                        checked={isAllSelected && currentFeatures.length > 0}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="h-3.5 w-3.5 cursor-pointer"
                      />
                    </TableHead>
                    {renderResizableHeader('序号', 1, true, 'id')}
                    {renderResizableHeader('功能点', 2, true, 'name')}
                    {renderResizableHeader('功能描述', 3, true, 'description')}
                    {renderResizableHeader('KANO模型', 4, true, 'kanoModel')}
                    {renderResizableHeader('优先级', 5, true, 'priority')}
                    {renderResizableHeader('业务规则', 6, true, 'businessRules')}
                    {renderResizableHeader('操作', 7)}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentFeatures.length > 0 ? (
                    currentFeatures.map((feature, index) => (
                      <TableRow key={feature.id}>
                        <TableCell className="text-center whitespace-nowrap px-1 py-2" style={{ width: columnWidths[0] }}>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(feature.id)}
                            onChange={() => handleSelectRow(feature.id)}
                            className="h-3.5 w-3.5 cursor-pointer"
                          />
                        </TableCell>
                        <TableCell className="whitespace-nowrap px-2 py-2 text-xs" style={{ width: columnWidths[1] }}>{startIndex + index + 1}</TableCell>
                        {renderEllipsisCell(feature.name, 2)}
                        {renderEllipsisCell(feature.description, 3)}
                        {renderEllipsisCell(feature.kanoModel, 4)}
                        {renderEllipsisCell(feature.priority, 5)}
                        {renderEllipsisCell(feature.businessRules, 6)}
                        <TableCell className="text-center whitespace-nowrap px-1 py-2" style={{ width: columnWidths[7] }}>
                          <div className="flex items-center justify-center space-x-0.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditFeature(feature.id)}
                              className="text-indigo-600 hover:text-indigo-700 h-7 w-7 p-0"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteFeature(feature.id)}
                              className="text-red-600 hover:text-red-700 h-7 w-7 p-0"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-6">
                        <div className="flex flex-col items-center">
                          <FileText className="h-10 w-10 text-gray-300 mb-3" />
                          <p className="text-sm text-gray-500">暂无功能清单</p>
                          <p className="text-xs text-gray-400 mt-1 mb-3">请上传文档并点击开始拆解，或手动新增功能</p>
                          <Button
                            size="sm"
                            className="flex items-center space-x-1 h-8 text-xs"
                            onClick={handleAddFeature}
                          >
                            <Plus className="h-3 w-3" />
                            <span>新增功能</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* 分页控件 */}
            {features.length > 0 && (
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
                  <span className="text-xs text-gray-600">共 {features.length} 条</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 编辑对话框 */}
      <FeatureEditDialog
        isOpen={editDialogOpen}
        feature={editingFeature}
        mode={dialogMode}
        onSave={handleSaveFeature}
        onCancel={handleCancelEdit}
      />

      {/* 删除确认对话框 */}
      <ConfirmModal
        isOpen={deleteConfirmOpen}
        title="确认删除"
        message="确定要删除这个功能吗？此操作无法撤销。"
        confirmText="删除"
        cancelText="取消"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
        danger={true}
      />

      {/* 批量删除确认 */}
      <ConfirmModal
        isOpen={showBatchDeleteConfirm}
        title="批量删除"
        message={`确定要删除选中的 ${selectedIds.size} 条功能吗？此操作无法撤销。`}
        confirmText="删除"
        cancelText="取消"
        onConfirm={handleBatchDeleteConfirm}
        onCancel={() => setShowBatchDeleteConfirm(false)}
        danger={true}
      />

      {/* 删除上传文件确认 */}
      <ConfirmModal
        isOpen={showRemoveFileConfirm}
        title="删除文件"
        message="确定要删除当前上传的文件吗？"
        confirmText="删除"
        cancelText="取消"
        onConfirm={() => {
          setFile(null)
          setFilePreviewContent('')
          setFilePreviewHtml('')
          setUploadStatus('idle')
          setUploadProgress(0)
          setUploadMessage('')
          setShowRemoveFileConfirm(false)
        }}
        onCancel={() => setShowRemoveFileConfirm(false)}
        danger={true}
      />

      {/* 文件预览模态框 */}
      {showPreviewModal && (
        <React.Fragment>
          {isFullscreenPreview ? (
            /* 全屏模式 */
            <div className="fixed inset-0 bg-white z-50 flex flex-col">
              {/* 模态框头部 - 可拖拽 */}
              <div
                className="flex items-center justify-between p-4 border-b bg-gray-50 flex-shrink-0 cursor-move"
                onMouseDown={handleModalMouseDown}
              >
                <div className="flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-indigo-600" />
                  <div className="flex flex-col">
                    <h3 className="text-lg font-semibold">文档预览</h3>
                    {file && (
                      <span className="text-sm text-gray-500">
                        {file.name}
                        <span className="ml-2 px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded text-xs">
                          {file.name.endsWith('.docx') ? 'Word 文档' : '文本文件'}
                        </span>
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsFullscreenPreview(false)}
                    title="退出全屏"
                  >
                    <Minimize2 className="h-4 w-4 mr-1" />
                    退出全屏
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClosePreview}
                    title="关闭"
                  >
                    关闭
                  </Button>
                </div>
              </div>

              {/* 模态框内容 */}
              <div className="flex-1 overflow-y-auto p-6 select-text">
                {filePreviewContent ? (
                  <>
                    {filePreviewHtml ? (
                        <div
                          className="prose prose-sm max-w-none leading-relaxed cursor-text select-text"
                          style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
                          dangerouslySetInnerHTML={{
                            __html: `
                              <style>
                                /* Word 文档样式优化 */
                                .prose h1 { font-size: 2em; font-weight: bold !important; margin: 1em 0; color: #1a202c; border-bottom: 2px solid #e5e7eb; padding-bottom: 0.5em; }
                                .prose h2 { font-size: 1.5em; font-weight: bold !important; margin: 0.8em 0; color: #374151; }
                                .prose h3 { font-size: 1.25em; font-weight: bold !important; margin: 0.6em 0; color: #1f2937; }
                                .prose h4 { font-size: 1.1em; font-weight: bold !important; margin: 0.5em 0; color: #374151; }
                                .prose p { margin-bottom: 1em; line-height: 1.8; color: #4b5563; text-align: justify; }
                                .prose ul, .prose ol { margin: 1em 0; padding-left: 2em; }
                                .prose li { margin-bottom: 0.8em; line-height: 1.6; }
                                .prose ul { list-style-type: disc; margin-top: 0.5em; }
                                .prose ul li { list-style: disc; }
                                .prose ol { list-style-type: decimal; margin-top: 0.5em; }
                                .prose ol li { list-style: decimal; }
                                .prose strong { color: #1f2937; font-weight: 600 !important; }
                                .prose table { width: 100%; border-collapse: collapse; margin: 1em 0; }
                                .prose th, .prose td { border: 1px solid #e5e7eb; padding: 0.5em; text-align: left; }
                                .prose th { background-color: #f8fafc; font-weight: 600 !important; }
                                .prose img { max-width: 100%; height: auto; margin: 1em 0; border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
                                .prose blockquote { border-left: 4px solid #3b82f6; margin: 1em 0; padding-left: 1em; background-color: #f8fafc; font-style: italic; color: #6b7280; }
                                .prose hr { border: none; border-top: 2px solid #e5e7eb; margin: 2em 0; }
                                .prose a { color: #2563eb; text-decoration: underline; }
                                .prose a:hover { color: #1d4ed8; }
                                .prose code { background-color: #f3f4f6; padding: 0.2em 0.4em; border-radius: 3px; font-size: 0.9em; color: #c7254e; }
                                .prose pre { background-color: #1e293b; color: #f8fafc; padding: 1em; border-radius: 6px; overflow-x: auto; }
                                /* 修复序号问题：确保列表项不会重复显示序号 */
                                .prose ul li::marker, .prose ol li::marker { color: #374151; font-weight: 600; }
                              </style>
                              ${filePreviewHtml}
                            `
                          }}
                        />
                    ) : (
                      <div className="bg-gray-50 rounded-lg p-6">
                        <pre className="whitespace-pre-wrap break-words text-sm font-mono text-gray-800 leading-relaxed font-sans cursor-text select-text">
                          {filePreviewContent}
                        </pre>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500">
                    <FileText className="h-12 w-12 text-gray-300 mb-4" />
                    <p>暂无预览内容</p>
                  </div>
                )}
              </div>

              {/* 模态框底部 */}
              <div className="flex justify-end space-x-2 p-4 border-t bg-gray-50 flex-shrink-0">
                <Button
                  variant="outline"
                  onClick={handleClosePreview}
                >
                  关闭
                </Button>
                <Button
                  onClick={() => {
                    handleClosePreview()
                    handleStartAnalysis()
                  }}
                  disabled={isAnalyzing}
                >
                  {isAnalyzing ? '拆解中...' : '开始拆解'}
                </Button>
              </div>
            </div>
          ) : (
            /* 普通模式 */
            <div
              className={`fixed inset-0 bg-black bg-opacity-50 z-50 ${isDragging ? 'cursor-move' : ''}`}
              onMouseMove={handleModalMouseMove}
              onMouseUp={handleModalMouseUp}
            >
              <div
                className={`bg-white rounded-lg shadow-xl max-w-4xl w-[600px] max-h-[90vh] flex flex-col transition-shadow ${isDragging ? 'shadow-2xl scale-105' : ''}`}
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  transform: `translate(-50%, -50%) translate(${modalPosition.x}px, ${modalPosition.y}px)`
                }}
              >
                {/* 模态框头部 - 可拖拽 */}
                <div
                  className="flex items-center justify-between p-4 border-b bg-gray-50 cursor-move"
                  onMouseDown={handleModalMouseDown}
                >
                  <div className="flex items-center space-x-2">
                    <FileText className="h-5 w-5 text-indigo-600" />
                    <div className="flex flex-col">
                      <h3 className="text-lg font-semibold">文档预览</h3>
                      {file && (
                        <span className="text-sm text-gray-500">
                          {file.name}
                            <span className="ml-2 px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded text-xs">
                              {file.name.endsWith('.docx') ? 'Word 文档' : '文本文件'}
                            </span>
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsFullscreenPreview(true)}
                      title="全屏显示"
                    >
                      <Maximize2 className="h-4 w-4 mr-1" />
                      全屏
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClosePreview}
                      title="关闭"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* 模态框内容 */}
                <div className="flex-1 overflow-y-auto p-6 select-text">
                  {filePreviewContent ? (
                    <>
                      {filePreviewHtml ? (
                        <div
                          className="prose prose-sm max-w-none leading-relaxed cursor-text select-text"
                          style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
                          dangerouslySetInnerHTML={{
                            __html: `
                              <style>
                                /* Word 文档样式优化 */
                                .prose h1 { font-size: 2em; font-weight: bold !important; margin: 1em 0; color: #1a202c; border-bottom: 2px solid #e5e7eb; padding-bottom: 0.5em; }
                                .prose h2 { font-size: 1.5em; font-weight: bold !important; margin: 0.8em 0; color: #374151; }
                                .prose h3 { font-size: 1.25em; font-weight: bold !important; margin: 0.6em 0; color: #1f2937; }
                                .prose h4 { font-size: 1.1em; font-weight: bold !important; margin: 0.5em 0; color: #374151; }
                                .prose p { margin-bottom: 1em; line-height: 1.8; color: #4b5563; text-align: justify; }
                                .prose ul, .prose ol { margin: 1em 0; padding-left: 2em; }
                                .prose li { margin-bottom: 0.8em; line-height: 1.6; }
                                .prose ul { list-style-type: disc; margin-top: 0.5em; }
                                .prose ul li { list-style: disc; }
                                .prose ol { list-style-type: decimal; margin-top: 0.5em; }
                                .prose ol li { list-style: decimal; }
                                .prose strong { color: #1f2937; font-weight: 600 !important; }
                                .prose table { width: 100%; border-collapse: collapse; margin: 1em 0; }
                                .prose th, .prose td { border: 1px solid #e5e7eb; padding: 0.5em; text-align: left; }
                                .prose th { background-color: #f8fafc; font-weight: 600 !important; }
                                .prose img { max-width: 100%; height: auto; margin: 1em 0; border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
                                .prose blockquote { border-left: 4px solid #3b82f6; margin: 1em 0; padding-left: 1em; background-color: #f8fafc; font-style: italic; color: #6b7280; }
                                .prose hr { border: none; border-top: 2px solid #e5e7eb; margin: 2em 0; }
                                .prose a { color: #2563eb; text-decoration: underline; }
                                .prose a:hover { color: #1d4ed8; }
                                .prose code { background-color: #f3f4f6; padding: 0.2em 0.4em; border-radius: 3px; font-size: 0.9em; color: #c7254e; }
                                .prose pre { background-color: #1e293b; color: #f8fafc; padding: 1em; border-radius: 6px; overflow-x: auto; }
                                /* 修复序号问题：确保列表项不会重复显示序号 */
                                .prose ul li::marker, .prose ol li::marker { color: #374151; font-weight: 600; }
                              </style>
                              ${filePreviewHtml}
                            `
                          }}
                        />
                      ) : (
                        <div className="bg-gray-50 rounded-lg p-6">
                          <pre className="whitespace-pre-wrap break-words text-sm font-mono text-gray-800 leading-relaxed font-sans cursor-text select-text">
                            {filePreviewContent}
                          </pre>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500">
                      <FileText className="h-12 w-12 text-gray-300 mb-4" />
                      <p>暂无预览内容</p>
                    </div>
                  )}
                </div>

                {/* 模态框底部 */}
                <div className="flex justify-end space-x-2 p-4 border-t bg-gray-50">
                  <Button
                    variant="outline"
                    onClick={handleClosePreview}
                  >
                    关闭
                  </Button>
                  <Button
                    onClick={() => {
                      handleClosePreview()
                      handleStartAnalysis()
                    }}
                    disabled={isAnalyzing}
                  >
                    {isAnalyzing ? '拆解中...' : '开始拆解'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </React.Fragment>
      )}
      </div>
  )
}

export default PRDFeatureBreakdown

