import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import {
  Archive, Search, Eye, Trash2, FileText, Type, ClipboardList,
  ChevronLeft, ChevronRight, Loader2, RefreshCw, Hash, Globe,
  X, Maximize2, Minimize2, Download, FileSpreadsheet
} from 'lucide-react'
import { interfaceArchiveApi } from '@/services/analysis-api'
import { toast } from '@/components/ui/toast-container'
import { downloadDocx } from '@/utils/docx-generator'
import ConfirmModal from './ConfirmModal'
import * as XLSX from 'xlsx'

interface InterfaceArchiveRecord {
  _id: string
  title: string
  sourceType: string
  sourceContent: string
  sourceFileName: string
  sourceRequirementTitle: string
  interfaceCount: number
  stats: {
    methodDistribution: { GET: number; POST: number; PUT: number; DELETE: number }
    priorityDistribution: { '高': number; '中': number; '低': number }
    categories: string[]
  }
  interfaces: Array<{
    id: string; name: string; method: string; path: string;
    description: string; requestParams: string; responseParams: string;
    responseFormat: string; priority: string; category: string;
  }>
  createdAt: string
}

const InterfaceArchiveHistory: React.FC = () => {
  const [records, setRecords] = useState<InterfaceArchiveRecord[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)
  const [loading, setLoading] = useState(false)
  const [keyword, setKeyword] = useState('')

  const [detailRecord, setDetailRecord] = useState<InterfaceArchiveRecord | null>(null)
  const [isFullScreen, setIsFullScreen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchList = useCallback(async () => {
    setLoading(true)
    try {
      const data = await interfaceArchiveApi.getList({ page, pageSize, keyword: keyword || undefined })
      setRecords((data as any).list || [])
      setTotal((data as any).total || 0)
    } catch (error) {
      console.error('获取归档列表失败:', error)
      toast.error('获取归档列表失败')
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, keyword])

  useEffect(() => {
    fetchList()
  }, [fetchList])

  const totalPages = Math.ceil(total / pageSize)

  const handleSearch = () => {
    setPage(1)
    fetchList()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch()
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      await interfaceArchiveApi.delete(deleteId)
      toast.success('归档记录已删除')
      setDeleteId(null)
      fetchList()
    } catch (error) {
      console.error('删除失败:', error)
      toast.error('删除失败')
    } finally {
      setDeleting(false)
    }
  }

  const handleViewDetail = async (id: string) => {
    try {
      const record = await interfaceArchiveApi.getDetail(id) as unknown as InterfaceArchiveRecord
      setDetailRecord(record)
      setIsFullScreen(false)
    } catch (error) {
      console.error('获取详情失败:', error)
      toast.error('获取详情失败')
    }
  }

  const sourceTypeLabel = (type: string) => {
    switch (type) {
      case 'document': return '文档上传'
      case 'requirement': return '需求池'
      case 'text': return '手动输入'
      default: return type
    }
  }

  const sourceTypeIcon = (type: string) => {
    switch (type) {
      case 'document': return <FileText className="h-3.5 w-3.5 text-blue-500" />
      case 'requirement': return <ClipboardList className="h-3.5 w-3.5 text-green-500" />
      case 'text': return <Type className="h-3.5 w-3.5 text-orange-500" />
      default: return <FileText className="h-3.5 w-3.5 text-gray-500" />
    }
  }

  const sourceSummary = (record: InterfaceArchiveRecord) => {
    if (record.sourceType === 'document' && record.sourceFileName) return record.sourceFileName
    if (record.sourceType === 'requirement' && record.sourceRequirementTitle) return record.sourceRequirementTitle
    return '-'
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleString('zh-CN', {
      month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    })
  }

  const getMethodStyle = (method: string) => {
    switch (method) {
      case 'GET': return 'bg-blue-100 text-blue-700'
      case 'POST': return 'bg-green-100 text-green-700'
      case 'PUT': return 'bg-orange-100 text-orange-700'
      case 'DELETE': return 'bg-red-100 text-red-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case '高': return 'bg-red-100 text-red-700'
      case '中': return 'bg-orange-100 text-orange-700'
      case '低': return 'bg-green-100 text-green-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const handleExportSourceDoc = async () => {
    if (!detailRecord) return
    if (!detailRecord.sourceContent || detailRecord.sourceType === 'text') {
      toast.warning('当前归档来源为手动输入，无原需求文档可导出')
      return
    }
    try {
      const fileName = `${detailRecord.title}_原需求文档`
      await downloadDocx(detailRecord.sourceContent, fileName)
      toast.success('原需求文档导出成功')
    } catch (error) {
      console.error('导出原需求文档失败:', error)
      toast.error('导出原需求文档失败')
    }
  }

  const handleExportInterfaceExcel = () => {
    if (!detailRecord || !detailRecord.interfaces?.length) {
      toast.warning('暂无接口数据可导出')
      return
    }
    try {
      const data = detailRecord.interfaces.map((iface, index) => ({
        '序号': index + 1,
        '接口名称': iface.name,
        '请求方式': iface.method,
        '接口路径': iface.path,
        '接口描述': iface.description || '',
        '请求参数': iface.requestParams || '',
        '响应参数': iface.responseParams || '',
        '响应格式': iface.responseFormat || '',
        '优先级': iface.priority || '',
        '接口分类': iface.category || '',
      }))
      const ws = XLSX.utils.json_to_sheet(data)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, '接口列表')
      ws['!cols'] = [
        { wch: 6 }, { wch: 25 }, { wch: 10 }, { wch: 30 },
        { wch: 40 }, { wch: 40 }, { wch: 40 }, { wch: 30 },
        { wch: 8 }, { wch: 15 },
      ]
      const fileName = `${detailRecord.title}_接口列表.xlsx`
      XLSX.writeFile(wb, fileName)
      toast.success('接口列表导出成功')
    } catch (error) {
      console.error('导出接口列表失败:', error)
      toast.error('导出接口列表失败')
    }
  }

  const hasSourceContent = detailRecord && detailRecord.sourceContent && detailRecord.sourceContent.trim().length > 0

  return (
    <div className="flex flex-col h-full overflow-hidden bg-gradient-to-br from-[#fafbfc] via-white to-[#f5f3ff]">
      {/* 工具栏 */}
      <div className="px-4 py-3 border-b border-indigo-100 bg-white/80 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Archive className="h-5 w-5 text-indigo-500" />
            <h2 className="text-lg font-bold text-indigo-600">接口归档记录</h2>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
              {total} 条
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-gray-400" />
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="搜索归档标题..."
                className="pl-8 pr-3 py-1.5 border border-gray-200 rounded-xl text-xs w-48 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3 text-xs rounded-xl"
              onClick={handleSearch}
            >
              <Search className="h-3 w-3 mr-1" />
              搜索
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-3 text-xs rounded-xl text-gray-500"
              onClick={fetchList}
              disabled={loading}
            >
              <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </div>

      {/* 列表区域 */}
      <Card className="flex-1 flex flex-col min-h-0 mx-4 my-3">
        <CardContent className="p-0 flex-1 flex flex-col">
          {loading && records.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
            </div>
          ) : records.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Archive className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">暂无接口归档记录</p>
                <p className="text-xs text-gray-400 mt-1">在需求接口页点击"归档"按钮保存接口列表</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto flex-1">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/80">
                    <TableHead className="text-xs font-semibold">归档标题</TableHead>
                    <TableHead className="text-xs font-semibold w-24">来源方式</TableHead>
                    <TableHead className="text-xs font-semibold w-40">来源信息</TableHead>
                    <TableHead className="text-xs font-semibold w-20 text-center">
                      <div className="flex items-center justify-center">
                        <Globe className="h-3 w-3 mr-1" />
                        接口数
                      </div>
                    </TableHead>
                    <TableHead className="text-xs font-semibold w-36">方法分布</TableHead>
                    <TableHead className="text-xs font-semibold w-32">归档时间</TableHead>
                    <TableHead className="text-xs font-semibold w-24 text-center">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record) => (
                    <TableRow key={record._id} className="hover:bg-indigo-50/50 transition-colors">
                      <TableCell className="text-xs font-medium text-gray-800 max-w-[200px]">
                        <span className="truncate block" title={record.title}>
                          {record.title}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="flex items-center space-x-1.5">
                          {sourceTypeIcon(record.sourceType)}
                          <span className="text-gray-600">{sourceTypeLabel(record.sourceType)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-gray-600 max-w-[160px]">
                        <span className="truncate block" title={sourceSummary(record)}>
                          {sourceSummary(record)}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-center">
                        <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                          {record.interfaceCount}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="flex items-center gap-0.5">
                          <span className="bg-blue-100 text-blue-700 px-1 py-0.5 rounded text-[10px] font-medium">G:{record.stats?.methodDistribution?.GET || 0}</span>
                          <span className="bg-green-100 text-green-700 px-1 py-0.5 rounded text-[10px] font-medium">P:{record.stats?.methodDistribution?.POST || 0}</span>
                          <span className="bg-orange-100 text-orange-700 px-1 py-0.5 rounded text-[10px] font-medium">U:{record.stats?.methodDistribution?.PUT || 0}</span>
                          <span className="bg-red-100 text-red-700 px-1 py-0.5 rounded text-[10px] font-medium">D:{record.stats?.methodDistribution?.DELETE || 0}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-gray-500">
                        {formatDate(record.createdAt)}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetail(record._id)}
                            className="h-7 w-7 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            title="查看详情"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteId(record._id)}
                            className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="删除"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* 分页 */}
          {total > 0 && (
            <div className="flex items-center justify-between px-3 py-2 border-t bg-gray-50">
              <div className="flex items-center space-x-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="h-7 px-2 text-xs"
                >
                  <ChevronLeft className="h-3 w-3" />
                  上一页
                </Button>
                <span className="text-xs text-gray-600">
                  第 {page} 页 / 共 {totalPages} 页
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="h-7 px-2 text-xs"
                >
                  下一页
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </div>
              <span className="text-xs text-gray-500">共 {total} 条记录</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 详情弹框 */}
      {detailRecord && (
        <div className={`fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center ${isFullScreen ? 'p-0' : 'p-4'}`}>
          <div className={`bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ${
            isFullScreen ? 'w-full h-full rounded-none' : 'max-w-5xl w-full max-h-[90vh]'
          }`}>
            {/* 头部 */}
            <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-indigo-50 to-purple-50 flex-shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center">
                  <Globe className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-800">{detailRecord.title}</h3>
                  <div className="flex items-center space-x-3 text-xs text-gray-500 mt-0.5">
                    <span>{formatDate(detailRecord.createdAt)}</span>
                    <span>|</span>
                    <span>{sourceTypeLabel(detailRecord.sourceType)}</span>
                    {sourceSummary(detailRecord) !== '-' && (
                      <>
                        <span>|</span>
                        <span className="truncate max-w-[200px]">{sourceSummary(detailRecord)}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsFullScreen(!isFullScreen)}
                  className="h-8 px-3 hover:bg-indigo-100 border-indigo-200 text-indigo-600"
                >
                  {isFullScreen ? (
                    <><Minimize2 className="h-4 w-4 mr-1" /><span className="text-xs">退出全屏</span></>
                  ) : (
                    <><Maximize2 className="h-4 w-4 mr-1" /><span className="text-xs">全屏查看</span></>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setDetailRecord(null); setIsFullScreen(false) }}
                  className="h-8 w-8 p-0 hover:bg-gray-200 rounded-lg"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* 统计概览 */}
            <div className="px-6 py-4 border-b bg-gray-50 flex-shrink-0">
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-indigo-600">{detailRecord.interfaceCount}</div>
                  <div className="text-xs text-gray-500 mt-0.5">接口总数</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{detailRecord.stats?.categories?.length || 0}</div>
                  <div className="text-xs text-gray-500 mt-0.5">接口分类</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {detailRecord.stats?.methodDistribution?.GET || 0}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">GET 接口</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {detailRecord.stats?.methodDistribution?.POST || 0}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">POST 接口</div>
                </div>
              </div>
            </div>

            {/* 接口列表 */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50/80">
                      <TableHead className="text-xs font-semibold w-10">序号</TableHead>
                      <TableHead className="text-xs font-semibold w-20">请求方式</TableHead>
                      <TableHead className="text-xs font-semibold">接口名称</TableHead>
                      <TableHead className="text-xs font-semibold">接口路径</TableHead>
                      <TableHead className="text-xs font-semibold">接口描述</TableHead>
                      <TableHead className="text-xs font-semibold">请求参数</TableHead>
                      <TableHead className="text-xs font-semibold">响应参数</TableHead>
                      <TableHead className="text-xs font-semibold">响应格式</TableHead>
                      <TableHead className="text-xs font-semibold w-16">优先级</TableHead>
                      <TableHead className="text-xs font-semibold">接口分类</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detailRecord.interfaces?.map((iface, index) => (
                      <TableRow key={iface.id || index} className="hover:bg-indigo-50/30 transition-colors">
                        <TableCell className="text-xs text-gray-500 font-medium">{index + 1}</TableCell>
                        <TableCell className="text-xs">
                          <span className={`inline-flex px-1.5 py-0.5 rounded-md text-[11px] font-bold ${getMethodStyle(iface.method)}`}>
                            {iface.method}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs font-semibold text-gray-800">{iface.name}</TableCell>
                        <TableCell className="text-xs">
                          <code className="text-[11px] bg-gray-50 px-1.5 py-0.5 rounded font-mono text-gray-700 border border-gray-200">
                            {iface.path}
                          </code>
                        </TableCell>
                        <TableCell className="text-xs text-gray-600 max-w-[200px]">
                          <span className="truncate block" title={iface.description}>
                            {iface.description || '-'}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-gray-600 max-w-[180px]">
                          <span className="truncate block" title={iface.requestParams}>
                            {iface.requestParams || '-'}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-gray-600 max-w-[180px]">
                          <span className="truncate block" title={iface.responseParams}>
                            {iface.responseParams || '-'}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-gray-600 max-w-[180px]">
                          <span className="truncate block" title={iface.responseFormat}>
                            {iface.responseFormat || '-'}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs">
                          <span className={`inline-flex px-1.5 py-0.5 rounded-md text-[11px] font-bold ${getPriorityStyle(iface.priority)}`}>
                            {iface.priority}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-gray-600">
                          <span className="bg-gray-100 px-1.5 py-0.5 rounded-md">{iface.category || '-'}</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* 底部 */}
            <div className="flex items-center justify-between p-4 border-t bg-white flex-shrink-0">
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportSourceDoc}
                  disabled={!hasSourceContent}
                  className="h-8 px-3 text-xs rounded-xl border-blue-200 hover:bg-blue-50 text-blue-600"
                  title="将来源需求文档导出为 Word 文件"
                >
                  <FileText className="h-3.5 w-3.5 mr-1" />
                  导出原需求文档
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportInterfaceExcel}
                  disabled={!detailRecord?.interfaces?.length}
                  className="h-8 px-3 text-xs rounded-xl border-teal-200 hover:bg-teal-50 text-teal-600"
                  title="将接口列表导出为 Excel 文件"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 mr-1" />
                  导出接口列表
                </Button>
              </div>
              <Button
                variant="outline"
                onClick={() => { setDetailRecord(null); setIsFullScreen(false) }}
                className="px-6 h-8 text-xs rounded-xl"
              >
                关闭
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 删除确认 */}
      <ConfirmModal
        isOpen={!!deleteId}
        title="确认删除"
        message="确定要删除这条接口归档记录吗？此操作无法撤销。"
        confirmText="删除"
        cancelText="取消"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
        danger={true}
      />
    </div>
  )
}

export default InterfaceArchiveHistory
