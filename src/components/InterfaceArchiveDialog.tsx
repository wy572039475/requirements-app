import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Archive, FileText, Type, ClipboardList, Loader2, Globe } from 'lucide-react'

interface InterfaceItem {
  id: string
  name: string
  method: string
  path: string
  description: string
  requestParams: string
  responseParams: string
  responseFormat: string
  priority: string
  category: string
}

interface InterfaceArchiveDialogProps {
  isOpen: boolean
  interfaces: InterfaceItem[]
  sourceType: 'text' | 'document' | 'requirement' | null
  sourceContent: string
  sourceFileName?: string
  sourceRequirementTitle?: string
  onConfirm: (title: string) => void
  onCancel: () => void
  saving?: boolean
}

const InterfaceArchiveDialog: React.FC<InterfaceArchiveDialogProps> = ({
  isOpen,
  interfaces,
  sourceType,
  sourceContent,
  sourceFileName,
  sourceRequirementTitle,
  onConfirm,
  onCancel,
  saving = false
}) => {
  const [title, setTitle] = useState(() => {
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`
    if (sourceRequirementTitle) {
      return `${sourceRequirementTitle}_接口_${dateStr}`
    }
    return `接口归档_${dateStr}`
  })

  const handleOpen = (open: boolean) => {
    if (!open) onCancel()
  }

  const sourceTypeLabel = () => {
    switch (sourceType) {
      case 'document': return '文档上传'
      case 'requirement': return '需求池'
      case 'text': return '手动输入'
      default: return '未知'
    }
  }

  const sourceSummary = () => {
    if (sourceType === 'document' && sourceFileName) return sourceFileName
    if (sourceType === 'requirement' && sourceRequirementTitle) return sourceRequirementTitle
    if (sourceType === 'text' && sourceContent) {
      return sourceContent.length > 60 ? sourceContent.substring(0, 60) + '...' : sourceContent
    }
    return '-'
  }

  const getMethodCount = () => {
    const counts = { GET: 0, POST: 0, PUT: 0, DELETE: 0 }
    interfaces.forEach(i => {
      if (counts.hasOwnProperty(i.method)) {
        counts[i.method as keyof typeof counts]++
      }
    })
    return counts
  }

  const getCategories = () => {
    const cats = new Set(interfaces.map(i => i.category).filter(Boolean))
    return Array.from(cats)
  }

  const methodCounts = getMethodCount()
  const categories = getCategories()

  return (
    <Dialog open={isOpen} onOpenChange={handleOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
              <Archive className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <DialogTitle>归档接口列表</DialogTitle>
              <DialogDescription>将当前接口列表及来源信息保存到数据库</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">归档标题</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="请输入归档标题"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="flex items-center space-x-2 mb-1">
                {sourceType === 'document' ? (
                  <FileText className="h-4 w-4 text-blue-500" />
                ) : sourceType === 'requirement' ? (
                  <ClipboardList className="h-4 w-4 text-green-500" />
                ) : (
                  <Type className="h-4 w-4 text-orange-500" />
                )}
                <span className="text-xs font-medium text-gray-500">来源方式</span>
              </div>
              <span className="text-sm font-medium text-gray-800">{sourceTypeLabel()}</span>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="flex items-center space-x-2 mb-1">
                <Globe className="h-4 w-4 text-indigo-500" />
                <span className="text-xs font-medium text-gray-500">接口数量</span>
              </div>
              <span className="text-sm font-medium text-gray-800">{interfaces.length} 个</span>
            </div>
          </div>

          {/* 方法分布 */}
          <div className="bg-gray-50 rounded-xl p-3">
            <span className="text-xs font-medium text-gray-500 mb-2 block">请求方式分布</span>
            <div className="flex items-center space-x-2">
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md font-medium">GET {methodCounts.GET}</span>
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-md font-medium">POST {methodCounts.POST}</span>
              <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-md font-medium">PUT {methodCounts.PUT}</span>
              <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-md font-medium">DELETE {methodCounts.DELETE}</span>
            </div>
          </div>

          {/* 分类统计 */}
          {categories.length > 0 && (
            <div className="bg-gray-50 rounded-xl p-3">
              <span className="text-xs font-medium text-gray-500 mb-1 block">接口分类</span>
              <div className="flex flex-wrap gap-1">
                {categories.slice(0, 5).map(cat => (
                  <span key={cat} className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-md border border-indigo-100">
                    {cat}
                  </span>
                ))}
                {categories.length > 5 && (
                  <span className="text-xs text-gray-400">+{categories.length - 5}</span>
                )}
              </div>
            </div>
          )}

          <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
            <span className="text-xs font-medium text-blue-600">来源信息</span>
            <p className="text-sm text-gray-700 mt-1">{sourceSummary()}</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={saving}>
            取消
          </Button>
          <Button
            onClick={() => onConfirm(title)}
            disabled={!title.trim() || saving}
            className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                保存中...
              </>
            ) : (
              <>
                <Archive className="h-4 w-4 mr-1.5" />
                确认归档
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default InterfaceArchiveDialog
