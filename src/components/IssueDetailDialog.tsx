/**
 * 问题详情弹窗组件
 */

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { X, Save, Copy, FileText, Lightbulb, AlertTriangle } from 'lucide-react'
import type { Issue, IssueStatus } from '@/types/review-types'
import {
  PRIORITY_CONFIG,
  CATEGORY_COLORS,
  ISSUE_STATUS_CONFIG
} from '@/types/review-types'
import { formatConfidence } from '@/utils/review-utils'

interface IssueDetailDialogProps {
  issue: Issue | null
  open: boolean
  onClose: () => void
  onSave: (issueId: string, updates: Partial<Issue>) => void
}

export const IssueDetailDialog = ({
  issue,
  open,
  onClose,
  onSave
}: IssueDetailDialogProps) => {
  const [localIssue, setLocalIssue] = useState<Issue | null>(issue)

  // 当issue变化时更新本地状态
  useEffect(() => {
    setLocalIssue(issue)
  }, [issue])

  if (!localIssue) {
    return null
  }

  const handleSave = () => {
    if (localIssue) {
      onSave(localIssue.id, localIssue)
      onClose()
    }
  }

  const handleCopy = () => {
    const text = `
【问题详情】

分类：${localIssue.category}
优先级：${PRIORITY_CONFIG[localIssue.priority].label}
置信度：${formatConfidence(localIssue.confidence)}

问题描述：
${localIssue.issue_desc}

${localIssue.evidence ? `引用原文：
${localIssue.evidence}

${localIssue.page_reference ? `页码位置：${localIssue.page_reference}` : ''}
` : ''}

${localIssue.reasoning ? `推理过程：
${localIssue.reasoning}
` : ''}

修改建议：
${localIssue.suggestion}

处理状态：${ISSUE_STATUS_CONFIG[localIssue.status].label}
备注：${localIssue.note || '无'}
    `.trim()

    navigator.clipboard.writeText(text)
    alert('已复制到剪贴板')
  }

  const updateLocalIssue = (updates: Partial<Issue>) => {
    setLocalIssue({ ...localIssue, ...updates })
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl">问题详情</DialogTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* 基本信息卡片 */}
          <div className="flex items-center space-x-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border-2 border-blue-200">
            <div>
              <Badge
                variant="secondary"
                className={`${CATEGORY_COLORS[localIssue.category]} text-white text-sm px-3 py-1`}
              >
                {localIssue.category}
              </Badge>
            </div>
            <div>
              <Badge className={PRIORITY_CONFIG[localIssue.priority].color}>
                {PRIORITY_CONFIG[localIssue.priority].label}
              </Badge>
            </div>
            <div className="flex items-center space-x-2">
              <div className="bg-gray-200 rounded-full h-3 w-24">
                <div
                  className="bg-blue-600 h-3 rounded-full"
                  style={{ width: `${localIssue.confidence * 100}%` }}
                />
              </div>
              <span className="text-sm font-medium text-gray-700">
                置信度: {formatConfidence(localIssue.confidence)}
              </span>
            </div>
          </div>

          {/* 问题描述 */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <h3 className="font-semibold text-gray-900">问题描述</h3>
            </div>
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-gray-800 leading-relaxed">{localIssue.issue_desc}</p>
            </div>
          </div>

          {/* 引用原文 */}
          {localIssue.evidence && (
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold text-gray-900">引用原文</h3>
              </div>
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-gray-800 italic leading-relaxed">{localIssue.evidence}</p>
                {localIssue.page_reference && (
                  <p className="text-sm text-blue-600 mt-2">
                    位置：{localIssue.page_reference}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* 推理过程 */}
          {localIssue.reasoning && (
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-purple-600" />
                <h3 className="font-semibold text-gray-900">推理过程</h3>
              </div>
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <p className="text-gray-800 leading-relaxed">{localIssue.reasoning}</p>
              </div>
            </div>
          )}

          {/* 修改建议 */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Lightbulb className="h-5 w-5 text-green-600" />
              <h3 className="font-semibold text-gray-900">修改建议</h3>
            </div>
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-gray-800 leading-relaxed">{localIssue.suggestion}</p>
            </div>
          </div>

          {/* 处理状态和备注 */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-900">处理状态</label>
                <Select
                  value={localIssue.status}
                  onValueChange={(value: IssueStatus) =>
                    updateLocalIssue({ status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="待处理">待处理</SelectItem>
                    <SelectItem value="已处理">已处理</SelectItem>
                    <SelectItem value="已忽略">已忽略</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-900">优先级</label>
                <div className="flex items-center">
                  <Badge className={PRIORITY_CONFIG[localIssue.priority].color}>
                    {PRIORITY_CONFIG[localIssue.priority].label}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-900">备注</label>
              <Textarea
                value={localIssue.note || ''}
                onChange={(e) => updateLocalIssue({ note: e.target.value })}
                placeholder="添加备注说明，如处理进度、遇到的问题等..."
                className="min-h-[100px]"
              />
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button variant="outline" onClick={handleCopy}>
              <Copy className="h-4 w-4 mr-2" />
              复制
            </Button>
            <Button variant="outline" onClick={onClose}>
              取消
            </Button>
            <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
              <Save className="h-4 w-4 mr-2" />
              保存
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default IssueDetailDialog
