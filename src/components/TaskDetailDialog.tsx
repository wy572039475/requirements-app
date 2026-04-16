import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar, User, Edit, Trash2, CheckCircle } from 'lucide-react'

interface Task {
  _id: string
  title: string
  description: string
  status: '待办' | '进行中' | '已完成' | '已阻塞'
  priority: '低' | '中' | '高' | '紧急'
  assignee?: { _id: string; username: string }
  dueDate?: string
  createdAt: string
}

interface TaskDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task: Task | null
  onEdit: (task: Task) => void
  onDelete: (task: Task) => void
  onComplete: (task: Task) => void
}

const priorityColors: Record<string, string> = {
  '低': 'bg-gray-100 text-gray-700',
  '中': 'bg-blue-100 text-blue-700',
  '高': 'bg-orange-100 text-orange-700',
  '紧急': 'bg-red-100 text-red-700'
}

const statusColors: Record<string, string> = {
  '待办': 'bg-gray-100 text-gray-700',
  '进行中': 'bg-blue-100 text-blue-700',
  '已完成': 'bg-green-100 text-green-700',
  '已阻塞': 'bg-red-100 text-red-700'
}

const TaskDetailDialog: React.FC<TaskDetailDialogProps> = ({
  open,
  onOpenChange,
  task,
  onEdit,
  onDelete,
  onComplete
}) => {
  if (!task) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">{task.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="flex gap-2">
            <Badge className={statusColors[task.status]}>{task.status}</Badge>
            <Badge className={priorityColors[task.priority]}>{task.priority}</Badge>
          </div>

          {task.description && (
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-1">描述</h4>
              <p className="text-sm text-gray-900 whitespace-pre-wrap">{task.description}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <User className="h-4 w-4" />
              <span>{task.assignee?.username || '未分配'}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Calendar className="h-4 w-4" />
              <span>{task.dueDate || '无截止日期'}</span>
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2">
          {task.status !== '已完成' && (
            <Button
              size="sm"
              variant="outline"
              className="text-green-600"
              onClick={() => onComplete(task)}
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              完成
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => onEdit(task)}>
            <Edit className="h-4 w-4 mr-1" />
            编辑
          </Button>
          <Button size="sm" variant="outline" className="text-red-600" onClick={() => onDelete(task)}>
            <Trash2 className="h-4 w-4 mr-1" />
            删除
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default TaskDetailDialog
