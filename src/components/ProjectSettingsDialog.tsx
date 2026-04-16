import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Settings, Loader2 } from 'lucide-react'
import { projectsAPI } from '@/services/projects-api'
import { toast } from '@/components/ui/toast-container'

interface Project {
  _id: string
  name: string
  description: string
  status: string
  priority: string
  startDate?: string
  endDate?: string
  progress: number
}

interface ProjectSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  project: Project
  onSettingsUpdated: () => void
}

const statusOptions = [
  { value: '规划中', label: '规划中' },
  { value: '进行中', label: '进行中' },
  { value: '测试中', label: '测试中' },
  { value: '已完成', label: '已完成' },
  { value: '已归档', label: '已归档' },
]

const priorityOptions = [
  { value: '低', label: '低' },
  { value: '中', label: '中' },
  { value: '高', label: '高' },
  { value: '紧急', label: '紧急' },
]

const ProjectSettingsDialog = ({
  open,
  onOpenChange,
  project,
  onSettingsUpdated,
}: ProjectSettingsDialogProps) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: '',
    priority: '',
    startDate: '',
    endDate: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 初始化表单数据
  useEffect(() => {
    if (project && open) {
      setFormData({
        name: project.name || '',
        description: project.description || '',
        status: project.status || '规划中',
        priority: project.priority || '中',
        startDate: project.startDate 
          ? new Date(project.startDate).toISOString().split('T')[0] 
          : '',
        endDate: project.endDate 
          ? new Date(project.endDate).toISOString().split('T')[0] 
          : '',
      })
    }
  }, [project, open])

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.warning('项目名称不能为空', '提示')
      return
    }

    if (formData.description.length > 500) {
      toast.warning('项目描述不能超过500个字符', '提示')
      return
    }

    setIsSubmitting(true)
    try {
      await projectsAPI.updateProject(project._id, {
        name: formData.name.trim(),
        description: formData.description.trim(),
        status: formData.status,
        priority: formData.priority,
        startDate: formData.startDate || undefined,
        endDate: formData.endDate || undefined,
      })
      
      toast.success('项目设置已更新', '更新成功')
      onSettingsUpdated()
      onOpenChange(false)
    } catch (error) {
      console.error('更新项目设置失败:', error)
      toast.error('更新项目设置失败，请重试', '操作失败')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            项目设置
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 项目名称 */}
          <div className="space-y-2">
            <Label htmlFor="name">项目名称 *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="请输入项目名称"
              maxLength={100}
            />
          </div>

          {/* 项目描述 */}
          <div className="space-y-2">
            <Label htmlFor="description">项目描述</Label>
            <textarea
              id="description"
              className="w-full min-h-[80px] px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="请输入项目描述（最多500字）"
              maxLength={500}
            />
            <div className="text-xs text-gray-500 text-right">
              {formData.description.length}/500
            </div>
          </div>

          {/* 状态和优先级 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>项目状态</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => handleInputChange('status', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择状态" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>优先级</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => handleInputChange('priority', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择优先级" />
                </SelectTrigger>
                <SelectContent>
                  {priorityOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 日期 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">开始日期</Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => handleInputChange('startDate', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">结束日期</Label>
              <Input
                id="endDate"
                type="date"
                value={formData.endDate}
                onChange={(e) => handleInputChange('endDate', e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            保存设置
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ProjectSettingsDialog
