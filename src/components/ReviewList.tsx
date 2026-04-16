/**
 * 评审列表组件
 * 展示所有历史评审记录，支持搜索、筛选、删除等功能
 */

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ReviewDetailDialog } from '@/components/ReviewDetailDialog'
import type { ReviewResult } from '@/types/review-types'
import {
  Search,
  Filter,
  Trash2,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react'

interface ReviewListProps {
  reviews: ReviewResult[]
  onViewDetail: (review: ReviewResult) => void
  onDeleteReview: (reviewId: string) => void
  onBatchDeleteReviews?: (reviewIds: string[]) => void
}

export const ReviewList = ({ reviews, onViewDetail, onDeleteReview, onBatchDeleteReviews }: ReviewListProps) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'analyzing' | 'error'>('all')
  const [selectedReview, setSelectedReview] = useState<ReviewResult | null>(null)
  const [showDetailDialog, setShowDetailDialog] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showBatchDeleteDialog, setShowBatchDeleteDialog] = useState(false)

  // 筛选和搜索逻辑
  const filteredReviews = reviews.filter(review => {
    // 状态筛选
    if (statusFilter !== 'all' && review.status !== statusFilter) {
      return false
    }

    // 搜索筛选（标题、创建人）
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      const titleMatch = review.title.toLowerCase().includes(term)
      const creatorMatch = review.creator.toLowerCase().includes(term)
      if (!titleMatch && !creatorMatch) {
        return false
      }
    }

    return true
  })

  // 按时间倒序排列
  const sortedReviews = [...filteredReviews].sort((a, b) => {
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  })

  // 处理查看详情
  const handleViewDetail = (review: ReviewResult) => {
    setSelectedReview(review)
    setShowDetailDialog(true)
    onViewDetail(review)
  }

  // 处理删除
  const handleDelete = (reviewId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm('确定要删除这条评审记录吗？')) {
      onDeleteReview(reviewId)
    }
  }

  // 获取状态图标和标签
  const getStatusBadge = (status: ReviewResult['status']) => {
    switch (status) {
      case 'completed':
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            已完成
          </Badge>
        )
      case 'analyzing':
        return (
          <Badge className="bg-blue-100 text-blue-800">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            分析中
          </Badge>
        )
      case 'error':
        return (
          <Badge className="bg-red-100 text-red-800">
            <XCircle className="h-3 w-3 mr-1" />
            失败
          </Badge>
        )
    }
  }

  // 获取评分颜色
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  // 格式化时间
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(hours / 24)

    if (days > 0) {
      return `${days}天前`
    } else if (hours > 0) {
      return `${hours}小时前`
    } else {
      const minutes = Math.floor(diff / (1000 * 60))
      return `${minutes}分钟前`
    }
  }

  // 格式化完整时间
  const formatFullTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // 处理全选/取消全选
  const handleSelectAll = () => {
    if (selectedIds.size === sortedReviews.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(sortedReviews.map(r => r.id)))
    }
  }

  // 处理单个选择
  const handleSelectOne = (reviewId: string) => {
    const newSelectedIds = new Set(selectedIds)
    if (newSelectedIds.has(reviewId)) {
      newSelectedIds.delete(reviewId)
    } else {
      newSelectedIds.add(reviewId)
    }
    setSelectedIds(newSelectedIds)
  }

  // 处理批量删除
  const handleBatchDelete = () => {
    if (selectedIds.size === 0) return
    setShowBatchDeleteDialog(true)
  }

  // 确认批量删除
  const confirmBatchDelete = () => {
    if (onBatchDeleteReviews) {
      onBatchDeleteReviews(Array.from(selectedIds))
    }
    setSelectedIds(new Set())
    setShowBatchDeleteDialog(false)
  }

  // 清空选择
  const clearSelection = () => {
    setSelectedIds(new Set())
  }

  return (
    <div className="space-y-6">
      {/* 搜索和筛选栏 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* 搜索框 */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="搜索标题或创建人..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* 状态筛选 */}
            <div className="flex gap-2">
              <Button
                variant={statusFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('all')}
              >
                全部
              </Button>
              <Button
                variant={statusFilter === 'completed' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('completed')}
              >
                已完成
              </Button>
              <Button
                variant={statusFilter === 'analyzing' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('analyzing')}
              >
                分析中
              </Button>
              <Button
                variant={statusFilter === 'error' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('error')}
              >
                失败
              </Button>
            </div>
          </div>

          {/* 统计信息和批量操作 */}
          <div className="mt-3 flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center gap-4">
              <span>共 {sortedReviews.length} 条记录</span>
              <span>已完成 {reviews.filter(r => r.status === 'completed').length} 条</span>
              {selectedIds.size > 0 && (
                <span className="text-blue-600 font-medium">
                  已选择 {selectedIds.size} 条
                </span>
              )}
            </div>
            {selectedIds.size > 0 && onBatchDeleteReviews && (
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSelection}
                >
                  取消选择
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBatchDelete}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  批量删除 ({selectedIds.size})
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 评审列表 */}
      {sortedReviews.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Filter className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">暂无评审记录</h3>
            <p className="text-gray-600">
              {searchTerm || statusFilter !== 'all'
                ? '没有找到匹配的记录'
                : '开始AI需求评审后，记录将显示在这里'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {/* 全选栏 */}
          {sortedReviews.length > 0 && onBatchDeleteReviews && (
            <Card className="bg-gray-50 border-dashed">
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="select-all"
                    checked={selectedIds.size === sortedReviews.length && sortedReviews.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                  <label htmlFor="select-all" className="text-sm text-gray-600 cursor-pointer">
                    全选 ({selectedIds.size}/{sortedReviews.length})
                  </label>
                </div>
              </CardContent>
            </Card>
          )}

          {sortedReviews.map((review) => (
            <Card
              key={review.id}
              className={`cursor-pointer hover:shadow-md transition-shadow ${
                selectedIds.has(review.id) ? 'ring-2 ring-blue-500 bg-blue-50' : ''
              }`}
              onClick={() => handleViewDetail(review)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  {/* 左侧：选择框和内容 */}
                  <div className="flex items-start gap-3 flex-1 min-w-0 pr-4">
                    {onBatchDeleteReviews && (
                      <div className="pt-1" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.has(review.id)}
                          onCheckedChange={() => handleSelectOne(review.id)}
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {review.title}
                        </h3>
                        {getStatusBadge(review.status)}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span title={formatFullTime(review.timestamp)}>
                            {formatTime(review.timestamp)}
                          </span>
                        </div>
                        <span>|</span>
                        <span>创建人: {review.creator}</span>
                        {review.completedAt && (
                          <>
                            <span>|</span>
                            <span title={formatFullTime(review.completedAt)}>
                              完成于: {formatTime(review.completedAt)}
                            </span>
                          </>
                        )}
                        {review.inputMethod === 'document' && review.fileName && (
                          <>
                            <span>|</span>
                            <span className="text-gray-500">{review.fileName}</span>
                          </>
                        )}
                      </div>

                      {/* 需求预览 */}
                      <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                        {review.inputMethod === 'document' && review.htmlContent
                          ? review.htmlContent.replace(/<[^>]*>/g, '').substring(0, 200)
                          : (review.requirement || '').substring(0, 200)}
                      </p>
                    </div>
                  </div>

                  {/* 右侧：评分和操作 */}
                  <div className="flex flex-col items-end gap-2">
                    {review.status === 'completed' && (
                      <div className={`text-2xl font-bold ${getScoreColor(review.review.overallScore)}`}>
                        {review.review.overallScore}分
                      </div>
                    )}
                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleViewDetail(review)
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleDelete(review.id, e)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 详情弹窗 */}
      {selectedReview && (
        <ReviewDetailDialog
          review={selectedReview}
          open={showDetailDialog}
          onClose={() => setShowDetailDialog(false)}
        />
      )}

      {/* 批量删除确认对话框 */}
      <AlertDialog open={showBatchDeleteDialog} onOpenChange={setShowBatchDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认批量删除</AlertDialogTitle>
            <AlertDialogDescription>
              您确定要删除选中的 {selectedIds.size} 条评审记录吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmBatchDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
