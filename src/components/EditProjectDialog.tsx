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
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { projectsAPI, UpdateProjectRequest, Project } from '@/services/projects-api'
import { toast } from '@/components/ui/toast-container'

interface EditProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  project: Project | null
  onSuccess: () => void
}

const EditProjectDialog = ({ open, onOpenChange, project, onSuccess }: EditProjectDialogProps) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: '规划中',
    priority: '中',
    startDate: '',
    endDate: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 当project变化时，填充表单数据
  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name,
        description: project.description,
        status: project.status,
        priority: project.priority,
        startDate: project.startDate 
          ? new Date(project.startDate).toISOString().split('T')[0] 
          : '',
        endDate: project.endDate 
          ? new Date(project.endDate).toISOString().split('T')[0] 
          : ''
      })
    }
  }, [project])

  // 重置表单
  useEffect(() => {
    if (!open) {
      setFormData({
        name: '',
        description: '',
        status: '规划中',
        priority: '中',
        startDate: '',
        endDate: ''
      })
    }
  }, [open])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleStatusChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      status: value
    }))
  }

  const handlePriorityChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      priority: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!project || !formData.name.trim()) return
    if (formData.description.length > 500) {
      toast.error('项目描述不能超过500个字符', '输入有误')
      return
    }

    setIsSubmitting(true)

    try {
      // 构建更新数据
      const updateData: UpdateProjectRequest = {
        name: formData.name,
        description: formData.description,
        status: formData.status as any,
        priority: formData.priority as any,
        startDate: formData.startDate || undefined,
        endDate: formData.endDate || undefined
      }

      // 调用API更新项目
      await projectsAPI.updateProject(project._id, updateData)

      console.log('项目更新成功')

      // 调用成功回调
      onSuccess()

      // 关闭弹框
      onOpenChange(false)
      toast.success('项目更新成功！', '更新成功')
    } catch (error) {
      console.error('更新项目失败:', error)
      toast.error('更新项目失败，请重试', '更新失败')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>编辑项目</DialogTitle>
        </DialogHeader>

        <form id="edit-project-dialog-form" onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="name">项目名称 *</Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="输入项目名称"
              required
              className="mt-1"
            />
          </div>

          <div>
            <div className="flex justify-between items-center">
              <Label htmlFor="description">项目描述</Label>
              <span className={`text-sm ${formData.description.length > 500 ? 'text-red-500' : 'text-gray-500'}`}>
                {formData.description.length}/500
              </span>
            </div>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="详细描述项目目标、范围和主要功能"
              rows={4}
              maxLength={500}
              className={`mt-1 ${formData.description.length > 500 ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
            />
            {formData.description.length > 500 && (
              <p className="text-red-500 text-sm mt-1">项目描述不能超过500个字符</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="status">项目状态</Label>
              <Select value={formData.status} onValueChange={handleStatusChange}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="选择项目状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="规划中">规划中</SelectItem>
                  <SelectItem value="进行中">进行中</SelectItem>
                  <SelectItem value="测试中">测试中</SelectItem>
                  <SelectItem value="已完成">已完成</SelectItem>
                  <SelectItem value="已归档">已归档</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="priority">优先级</Label>
              <Select value={formData.priority} onValueChange={handlePriorityChange}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="选择优先级" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="低">低</SelectItem>
                  <SelectItem value="中">中</SelectItem>
                  <SelectItem value="高">高</SelectItem>
                  <SelectItem value="紧急">紧急</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="startDate">开始日期</Label>
              <Input
                id="startDate"
                name="startDate"
                type="date"
                value={formData.startDate}
                onChange={handleChange}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="endDate">结束日期</Label>
              <Input
                id="endDate"
                name="endDate"
                type="date"
                value={formData.endDate}
                onChange={handleChange}
                className="mt-1"
              />
            </div>
          </div>
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            type="submit"
            form="edit-project-dialog-form"
            disabled={isSubmitting || !formData.name.trim()}
          >
            {isSubmitting ? '保存中...' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default EditProjectDialog
