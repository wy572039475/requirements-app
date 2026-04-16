import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import {
  Archive, Search, Eye, Trash2, FileText, Type, ClipboardList,
  ChevronLeft, ChevronRight, Loader2, RefreshCw, Hash
} from 'lucide-react'
import { featureBreakdownApi } from '@/services/analysis-api'
import { toast } from '@/components/ui/toast-container'
import BreakdownDetailDialog from './BreakdownDetailDialog'
import ConfirmModal from './ConfirmModal'

interface ArchiveRecord {
  _id: string
  title: string
  sourceType: string
  sourceFileName: string
  sourceRequirementTitle: string
  featureCount: number
  createdAt: string
}

const FeatureBreakdownHistory: React.FC = () => {
  const [records, setRecords] = useState<ArchiveRecord[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)
  const [loading, setLoading] = useState(false)
  const [keyword, setKeyword] = useState('')

  const [detailId, setDetailId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchList = useCallback(async () => {
    setLoading(true)
    try {
      const data = await featureBreakdownApi.getList({ page, pageSize, keyword: keyword || undefined })
      setRecords(data.list || [])
      setTotal(data.total || 0)
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
      await featureBreakdownApi.delete(deleteId)
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

  const sourceSummary = (record: ArchiveRecord) => {
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

  return (
    <div className="flex flex-col h-full overflow-hidden bg-gradient-to-br from-[#fafbfc] via-white to-[#f5f3ff]">
      {/* 工具栏 */}
      <div className="px-4 py-3 border-b border-indigo-100 bg-white/80 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Archive className="h-5 w-5 text-indigo-500" />
            <h2 className="text-lg font-bold text-indigo-600">归档记录</h2>
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
                <p className="text-sm text-gray-500">暂无归档记录</p>
                <p className="text-xs text-gray-400 mt-1">在功能拆解页点击"归档"按钮保存功能清单</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto flex-1">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/80">
                    <TableHead className="text-xs font-semibold">归档标题</TableHead>
                    <TableHead className="text-xs font-semibold w-24">来源方式</TableHead>
                    <TableHead className="text-xs font-semibold w-48">来源信息</TableHead>
                    <TableHead className="text-xs font-semibold w-24 text-center">
                      <div className="flex items-center justify-center">
                        <Hash className="h-3 w-3 mr-1" />
                        功能点
                      </div>
                    </TableHead>
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
                      <TableCell className="text-xs text-gray-600 max-w-[200px]">
                        <span className="truncate block" title={sourceSummary(record)}>
                          {sourceSummary(record)}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-center">
                        <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                          {record.featureCount}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-gray-500">
                        {formatDate(record.createdAt)}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDetailId(record._id)}
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
      <BreakdownDetailDialog
        isOpen={!!detailId}
        recordId={detailId}
        onClose={() => setDetailId(null)}
      />

      {/* 删除确认 */}
      <ConfirmModal
        isOpen={!!deleteId}
        title="确认删除"
        message="确定要删除这条归档记录吗？此操作无法撤销。"
        confirmText="删除"
        cancelText="取消"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
        danger={true}
      />
    </div>
  )
}

export default FeatureBreakdownHistory
