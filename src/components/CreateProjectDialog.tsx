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
import { projectsAPI, CreateProjectRequest } from '@/services/projects-api'
import { toast } from '@/components/ui/toast-container'

interface CreateProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

const CreateProjectDialog = ({ open, onOpenChange, onSuccess }: CreateProjectDialogProps) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: '规划中',
    priority: '中',
    startDate: new Date().toISOString().split('T')[0],
    endDate: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 重置表单
  useEffect(() => {
    if (!open) {
      setFormData({
        name: '',
        description: '',
        status: '规划中',
        priority: '中',
        startDate: new Date().toISOString().split('T')[0],
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
    if (!formData.name.trim()) return
    if (formData.description.length > 500) {
      toast.error('项目描述不能超过500个字符', '输入有误')
      return
    }

    console.log('[CreateProjectDialog] 开始创建项目...')
    console.log('[CreateProjectDialog] 表单数据:', formData)

    setIsSubmitting(true)

    try {
      // 构建API请求的数据格式
      const projectData: CreateProjectRequest = {
        name: formData.name,
        description: formData.description,
        status: formData.status,
        startDate: formData.startDate,
        endDate: formData.endDate || undefined,
        priority: formData.priority as '低' | '中' | '高' | '紧急'
      }

      console.log('[CreateProjectDialog] API请求数据:', projectData)

      // 调用API创建项目
      const response = await projectsAPI.createProject(projectData)

      console.log('[CreateProjectDialog] API响应:', response)
      console.log('[CreateProjectDialog] 项目创建成功')

      // 调用成功回调
      onSuccess()

      // 关闭弹框
      onOpenChange(false)
      toast.success('项目创建成功！', '创建成功')
    } catch (error) {
      console.error('[CreateProjectDialog] 创建项目失败:', error)
      toast.error(`创建项目失败: ${error instanceof Error ? error.message : '未知错误'}`, '创建失败')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>新建项目</DialogTitle>
        </DialogHeader>

        <form id="create-project-dialog-form" onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
            form="create-project-dialog-form"
            disabled={isSubmitting || !formData.name.trim()}
          >
            {isSubmitting ? '创建中...' : '保存项目'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default CreateProjectDialog
