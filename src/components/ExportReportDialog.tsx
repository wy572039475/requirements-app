import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Download, FileText } from 'lucide-react'

interface Task {
  _id: string
  title: string
  description: string
  status: string
  priority: string
  assignee?: { _id: string; username: string }
  dueDate?: string
  createdAt: string
}

interface Project {
  _id: string
  name: string
  description: string
  status: string
  priority: string
  progress: number
  owner: { _id: string; username: string }
  members: Array<{ user: { _id: string; username: string }; role: string }>
  startDate: string
  endDate?: string
  createdAt: string
}

interface ExportReportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  project: Project
  tasks: Task[]
}

const ExportReportDialog: React.FC<ExportReportDialogProps> = ({
  open,
  onOpenChange,
  project,
  tasks
}) => {
  const completedTasks = tasks.filter(t => t.status === '已完成').length
  const totalTasks = tasks.length

  const handleExportText = () => {
    const report = generateTextReport()
    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${project.name}-项目报告.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleExportJSON = () => {
    const data = {
      project: {
        name: project.name,
        description: project.description,
        status: project.status,
        progress: project.progress,
        startDate: project.startDate,
        endDate: project.endDate,
        owner: project.owner.username,
        memberCount: project.members.length
      },
      tasks: {
        total: totalTasks,
        completed: completedTasks,
        completionRate: totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(1) + '%' : '0%',
        items: tasks.map(t => ({
          title: t.title,
          status: t.status,
          priority: t.priority,
          assignee: t.assignee?.username || '未分配',
          dueDate: t.dueDate || '未设置'
        }))
      }
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${project.name}-项目报告.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const generateTextReport = () => {
    const lines = [
      `项目报告 - ${project.name}`,
      `${'='.repeat(50)}`,
      '',
      `项目名称: ${project.name}`,
      `项目描述: ${project.description}`,
      `项目状态: ${project.status}`,
      `项目进度: ${project.progress}%`,
      `开始日期: ${project.startDate}`,
      `结束日期: ${project.endDate || '未设置'}`,
      `项目负责人: ${project.owner.username}`,
      `团队成员: ${project.members.length}人`,
      '',
      `${'='.repeat(50)}`,
      '任务统计',
      `${'='.repeat(50)}`,
      `总任务数: ${totalTasks}`,
      `已完成: ${completedTasks}`,
      `完成率: ${totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(1) : 0}%`,
      '',
      '任务详情:',
      '-'.repeat(50),
    ]
    tasks.forEach((t, i) => {
      lines.push(`${i + 1}. [${t.status}] ${t.title}`)
      lines.push(`   优先级: ${t.priority} | 负责人: ${t.assignee?.username || '未分配'} | 截止: ${t.dueDate || '未设置'}`)
    })
    return lines.join('\n')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            导出项目报告
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium mb-2">{project.name}</h4>
            <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
              <div>任务总数: <span className="font-medium text-gray-900">{totalTasks}</span></div>
              <div>已完成: <span className="font-medium text-gray-900">{completedTasks}</span></div>
              <div>完成率: <span className="font-medium text-gray-900">{totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(1) : 0}%</span></div>
              <div>状态: <span className="font-medium text-gray-900">{project.status}</span></div>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-gray-600">选择导出格式：</p>
            <Button
              className="w-full justify-start gap-2"
              variant="outline"
              onClick={handleExportText}
            >
              <Download className="h-4 w-4" />
              导出为文本文件 (.txt)
            </Button>
            <Button
              className="w-full justify-start gap-2"
              variant="outline"
              onClick={handleExportJSON}
            >
              <Download className="h-4 w-4" />
              导出为 JSON 文件 (.json)
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>关闭</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ExportReportDialog
