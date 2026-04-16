import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { FileText, ChevronDown, ChevronUp, Type, ClipboardList, Calendar, Hash, Loader2, Maximize2, Minimize2, Download } from 'lucide-react'
import { featureBreakdownApi } from '@/services/analysis-api'
import { toast } from '@/components/ui/toast-container'

interface Feature {
  id: string
  name: string
  description: string
  kanoModel: string
  priority: string
  businessRules: string
}

interface BreakdownDetail {
  _id: string
  title: string
  sourceType: string
  sourceContent: string
  sourceFileName: string
  sourceFileType: string
  sourceFilePath: string
  sourceRequirementId: string
  sourceRequirementTitle: string
  features: Feature[]
  featureCount: number
  createdAt: string
  creator?: string
}

interface BreakdownDetailDialogProps {
  isOpen: boolean
  recordId: string | null
  onClose: () => void
}

const BreakdownDetailDialog: React.FC<BreakdownDetailDialogProps> = ({
  isOpen,
  recordId,
  onClose
}) => {
  const [detail, setDetail] = useState<BreakdownDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [showSourceContent, setShowSourceContent] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    if (isOpen && recordId) {
      fetchDetail()
    } else {
      setDetail(null)
      setShowSourceContent(false)
      setIsFullscreen(false)
    }
  }, [isOpen, recordId])

  const fetchDetail = async () => {
    if (!recordId) return
    setLoading(true)
    try {
      const record = await featureBreakdownApi.getDetail(recordId)
      setDetail(record as BreakdownDetail)
    } catch (error) {
      console.error('获取归档详情失败:', error)
    } finally {
      setLoading(false)
    }
  }

  // 判断源内容是否包含 HTML 标签
  const isHtmlContent = (content: string) => {
    if (!content) return false
    return /<[a-z][\s\S]*>/i.test(content)
  }

  const sourceTypeLabel = (type: string) => {
    switch (type) {
      case 'document': return '文档上传'
      case 'requirement': return '需求池选择'
      case 'text': return '手动输入'
      default: return type
    }
  }

  const sourceTypeIcon = (type: string) => {
    switch (type) {
      case 'document': return <FileText className="h-4 w-4 text-blue-500" />
      case 'requirement': return <ClipboardList className="h-4 w-4 text-green-500" />
      case 'text': return <Type className="h-4 w-4 text-orange-500" />
      default: return <FileText className="h-4 w-4 text-gray-500" />
    }
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleString('zh-CN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    })
  }

  // 下载原始源文档
  const handleDownloadSource = async () => {
    if (!detail || !detail.sourceFilePath) return

    try {
      const token = localStorage.getItem('authToken')
      const res = await fetch(featureBreakdownApi.getDownloadSourceUrl(detail._id), {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })

      if (!res.ok) {
        throw new Error('下载失败')
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = detail.sourceFileName || '源文件'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast.success('文档下载成功')
    } catch (error) {
      console.error('下载源文件失败:', error)
      toast.error('文档下载失败，文件可能已丢失')
    }
  }

  // 导出为 CSV
  const handleExportCSV = () => {
    if (!detail || detail.features.length === 0) {
      toast.warning('暂无功能清单可导出')
      return
    }

    try {
      const headers = ['序号,功能点,功能描述,KANO模型,优先级,业务规则']
      const rows = detail.features.map((feature, index) => {
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

      const csvContent = [headers.join(','), ...rows].join('\n')
      const BOM = '\uFEFF'
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      const fileName = `功能清单_${detail.title}_${new Date().toLocaleDateString('zh-CN')}.csv`
      link.setAttribute('download', fileName)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast.success(`CSV 导出成功: ${fileName}`)
    } catch (error) {
      console.error('CSV导出失败:', error)
      toast.error('CSV导出失败')
    }
  }

  // 导出为 Excel
  const handleExportExcel = async () => {
    if (!detail || detail.features.length === 0) {
      toast.warning('暂无功能清单可导出')
      return
    }

    setExporting(true)
    try {
      const XLSX = await import('xlsx')
      const headers = ['序号', '功能点', '功能描述', 'KANO模型', '优先级', '业务规则']
      const rows = detail.features.map((feature, index) => [
        index + 1,
        feature.name || '',
        feature.description || '',
        feature.kanoModel || '',
        feature.priority || '',
        feature.businessRules || ''
      ])

      const data = [headers, ...rows]
      const worksheet = XLSX.utils.aoa_to_sheet(data)
      worksheet['!cols'] = [
        { wch: 8 }, { wch: 20 }, { wch: 60 }, { wch: 16 }, { wch: 12 }, { wch: 50 }
      ]

      for (let C = 0; C < headers.length; ++C) {
        const cellRef = XLSX.utils.encode_cell({ r: 0, c: C })
        if (worksheet[cellRef]) {
          worksheet[cellRef].s = { font: { bold: true } }
        }
      }

      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, '功能清单')
      const fileName = `功能清单_${detail.title}_${new Date().toLocaleDateString('zh-CN')}.xlsx`
      XLSX.writeFile(workbook, fileName)

      toast.success(`Excel 导出成功: ${fileName}`)
    } catch (error) {
      console.error('Excel导出失败:', error)
      toast.error('Excel导出失败，请使用CSV导出')
    } finally {
      setExporting(false)
    }
  }

  // 渲染源内容
  const renderSourceContent = (content: string) => {
    if (isHtmlContent(content)) {
      return (
        <div
          className="prose prose-sm max-w-none leading-relaxed"
          dangerouslySetInnerHTML={{
            __html: `
              <style>
                .prose h1 { font-size: 1.5em; font-weight: bold; margin: 0.8em 0; color: #1a202c; }
                .prose h2 { font-size: 1.3em; font-weight: bold; margin: 0.6em 0; color: #374151; }
                .prose h3 { font-size: 1.15em; font-weight: bold; margin: 0.5em 0; color: #1f2937; }
                .prose p { margin-bottom: 0.8em; line-height: 1.7; color: #4b5563; }
                .prose ul, .prose ol { margin: 0.8em 0; padding-left: 2em; }
                .prose li { margin-bottom: 0.5em; line-height: 1.6; }
                .prose ul { list-style-type: disc; }
                .prose ol { list-style-type: decimal; }
                .prose strong { color: #1f2937; font-weight: 600; }
                .prose table { width: 100%; border-collapse: collapse; margin: 0.8em 0; }
                .prose th, .prose td { border: 1px solid #e5e7eb; padding: 0.4em; text-align: left; }
                .prose th { background-color: #f8fafc; font-weight: 600; }
                .prose img { max-width: 100%; height: auto; margin: 0.8em 0; }
                .prose blockquote { border-left: 4px solid #3b82f6; margin: 0.8em 0; padding-left: 1em; color: #6b7280; }
              </style>
              ${content}
            `
          }}
        />
      )
    }
    return (
      <pre className="whitespace-pre-wrap break-words text-xs text-gray-600 font-sans leading-relaxed">
        {content}
      </pre>
    )
  }

  // 渲染功能描述单元格（支持点击展开全文）
  const renderDescriptionCell = (text: string) => {
    if (!text) return <span className="text-gray-400">-</span>
    return (
      <span className="line-clamp-2 text-xs" title={text}>
        {text}
      </span>
    )
  }

  const renderBusinessRulesCell = (text: string) => {
    if (!text) return <span className="text-gray-400">-</span>
    return (
      <span className="line-clamp-2 text-xs" title={text}>
        {text}
      </span>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={`${isFullscreen ? 'max-w-[95vw] w-[95vw] h-[92vh]' : 'max-w-4xl'} max-h-[90vh] flex flex-col`}>
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                <FileText className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <DialogTitle className="text-lg">{detail?.title || '归档详情'}</DialogTitle>
                <DialogDescription>查看归档的功能清单详情</DialogDescription>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="h-8 px-2 text-xs rounded-lg"
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="h-3.5 w-3.5 mr-1" />
                  退出全屏
                </>
              ) : (
                <>
                  <Maximize2 className="h-3.5 w-3.5 mr-1" />
                  查看全部
                </>
              )}
            </Button>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex-1 flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
          </div>
        ) : detail ? (
          <div className="flex-1 overflow-y-auto space-y-4">
            {/* 基本信息 */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-gray-50 rounded-xl p-3">
                <div className="flex items-center space-x-1.5 mb-1">
                  {sourceTypeIcon(detail.sourceType)}
                  <span className="text-xs text-gray-500">来源方式</span>
                </div>
                <span className="text-sm font-medium text-gray-800">{sourceTypeLabel(detail.sourceType)}</span>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <div className="flex items-center space-x-1.5 mb-1">
                  <Hash className="h-4 w-4 text-indigo-500" />
                  <span className="text-xs text-gray-500">功能点数量</span>
                </div>
                <span className="text-sm font-medium text-gray-800">{detail.featureCount} 个</span>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <div className="flex items-center space-x-1.5 mb-1">
                  <Calendar className="h-4 w-4 text-green-500" />
                  <span className="text-xs text-gray-500">归档时间</span>
                </div>
                <span className="text-sm font-medium text-gray-800">{formatDate(detail.createdAt)}</span>
              </div>
            </div>

            {/* 来源摘要 */}
            {detail.sourceType === 'requirement' && detail.sourceRequirementTitle && (
              <div className="bg-green-50 rounded-xl p-3 border border-green-100">
                <span className="text-xs font-medium text-green-600">来源需求</span>
                <p className="text-sm text-gray-700 mt-1">{detail.sourceRequirementTitle}</p>
              </div>
            )}
            {detail.sourceType === 'document' && detail.sourceFileName && (
              <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-medium text-blue-600">来源文档</span>
                    <p className="text-sm text-gray-700 mt-1">{detail.sourceFileName}</p>
                  </div>
                  {detail.sourceFilePath && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDownloadSource}
                      className="h-8 text-xs"
                    >
                      <Download className="h-3.5 w-3.5 mr-1" />
                      下载文档
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* 源内容 */}
            {detail.sourceContent && (
              <div className="border rounded-xl overflow-hidden">
                <button
                  onClick={() => setShowSourceContent(!showSourceContent)}
                  className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors text-sm font-medium text-gray-700"
                >
                  <span>原内容预览</span>
                  {showSourceContent ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>
                {showSourceContent && (
                  <div className={`p-4 overflow-y-auto bg-white ${isFullscreen ? 'max-h-[60vh]' : 'max-h-60'}`}>
                    {renderSourceContent(detail.sourceContent)}
                  </div>
                )}
              </div>
            )}

            {/* 功能清单表格 */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">功能清单</h4>
              <div className="border rounded-xl overflow-hidden">
                <div className={`overflow-auto ${isFullscreen ? 'max-h-[50vh]' : 'max-h-[400px]'}`}>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="w-12 text-center text-xs sticky top-0 bg-gray-50 z-10">序号</TableHead>
                        <TableHead className="text-xs sticky top-0 bg-gray-50 z-10 min-w-[120px]">功能点</TableHead>
                        <TableHead className="text-xs sticky top-0 bg-gray-50 z-10 min-w-[250px]">功能描述</TableHead>
                        <TableHead className="text-xs sticky top-0 bg-gray-50 z-10">KANO模型</TableHead>
                        <TableHead className="text-xs sticky top-0 bg-gray-50 z-10">优先级</TableHead>
                        <TableHead className="text-xs sticky top-0 bg-gray-50 z-10 min-w-[200px]">业务规则</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detail.features.map((feature, index) => (
                        <TableRow key={feature.id || index} className="hover:bg-indigo-50/30">
                          <TableCell className="text-center text-xs">{index + 1}</TableCell>
                          <TableCell className="text-xs font-medium">{feature.name}</TableCell>
                          <TableCell className="text-xs">{renderDescriptionCell(feature.description)}</TableCell>
                          <TableCell className="text-xs">{feature.kanoModel || '-'}</TableCell>
                          <TableCell className="text-xs">{feature.priority || '-'}</TableCell>
                          <TableCell className="text-xs">{renderBusinessRulesCell(feature.businessRules)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center py-12 text-gray-400">
            加载失败
          </div>
        )}

        <div className="flex items-center justify-between border-t pt-4 flex-shrink-0">
          <div className="flex items-center space-x-2">
            {detail?.sourceFilePath && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadSource}
                className="h-8 text-xs"
              >
                <Download className="h-3.5 w-3.5 mr-1" />
                下载原始文档
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              disabled={!detail || detail.features.length === 0}
              className="h-8 text-xs"
            >
              <Download className="h-3.5 w-3.5 mr-1" />
              导出 CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportExcel}
              disabled={!detail || detail.features.length === 0 || exporting}
              className="h-8 text-xs"
            >
              {exporting ? (
                <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5 mr-1" />
              )}
              导出 Excel
            </Button>
          </div>
          <Button variant="outline" onClick={onClose}>关闭</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default BreakdownDetailDialog
