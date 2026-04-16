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
import { Plus, Trash2, AlertCircle, Folder, Paperclip } from 'lucide-react'
import { projectsAPI } from '@/services/projects-api'
import { authAPI } from '@/services/auth-api'
import { toast } from '@/components/ui/toast-container'

interface RequirementDialogProps {
  isOpen: boolean
  isEditing: boolean
  requirement?: any
  onCancel: () => void
  onSave: (data: any) => void
  initialProjectId?: string // 初始项目ID
}

const RequirementDialog: React.FC<RequirementDialogProps> = ({
  isOpen,
  isEditing,
  requirement,
  onCancel,
  onSave,
  initialProjectId
}) => {
  // 基础表单数据
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    type: 'feature',
    status: 'todo',
    assigneeId: '',
    projectId: '',
    dueDate: '',
    estimatedHours: '',
    actualHours: '',
    acceptanceCriteria: [] as string[],
    attachments: [] as Array<{ filename: string; url: string }>
  })

  // 验证错误
  const [errors, setErrors] = useState<Record<string, string>>({})

  // 新增验收标准输入
  const [newCriteria, setNewCriteria] = useState('')

  // 上传附件相关状态
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [uploadingFile, setUploadingFile] = useState<File | null>(null)

  // 可用项目列表
  const [projects, setProjects] = useState<any[]>([])
  const [loadingProjects, setLoadingProjects] = useState(false)

  // 可用用户列表
  const [users, setUsers] = useState<any[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)

  // 优先级选项
  const priorityOptions = [
    { value: 'critical', label: '紧急', color: 'bg-red-100 text-red-800 border-red-300' },
    { value: 'high', label: '高', color: 'bg-orange-100 text-orange-800 border-orange-300' },
    { value: 'medium', label: '中', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
    { value: 'low', label: '低', color: 'bg-green-100 text-green-800 border-green-300' }
  ]

  // 需求类型选项
  const typeOptions = [
    { value: 'feature', label: '功能', icon: '⚡' },
    { value: 'bug', label: '缺陷', icon: '🐛' },
    { value: 'improvement', label: '改进', icon: '📈' },
    { value: 'task', label: '任务', icon: '✅' }
  ]

  // 加载项目列表
  useEffect(() => {
    const loadProjects = async () => {
      if (isOpen) {
        setLoadingProjects(true)
        try {
          const response = await projectsAPI.getProjects()
          // API拦截器已经返回response.data，所以直接访问data.projects
          const projectList = response.data?.projects || []
          setProjects(projectList)
        } catch (error) {
          console.error('加载项目列表失败:', error)
          setProjects([])
        } finally {
          setLoadingProjects(false)
        }
      }
    }
    loadProjects()
  }, [isOpen])

  // 加载用户列表
  useEffect(() => {
    const loadUsers = async () => {
      if (isOpen) {
        setLoadingUsers(true)
        try {
          const response = await authAPI.getAssignableUsers()
          const userList = (response as any)?.data?.data?.users ?? (response as any)?.data?.users ?? []
          setUsers(Array.isArray(userList) ? userList : [])
        } catch (error) {
          console.error('加载用户列表失败:', error)
          // 如果加载失败，使用默认用户列表
          setUsers([
            { _id: '1', username: '张三' },
            { _id: '2', username: '李四' },
            { _id: '3', username: '王五' },
            { _id: '4', username: '赵六' }
          ])
        } finally {
          setLoadingUsers(false)
        }
      }
    }
    loadUsers()
  }, [isOpen])

  // 初始化表单数据
  useEffect(() => {
    if (isOpen && requirement) {
      setFormData({
        title: requirement.title || '',
        description: requirement.description || '',
        priority: requirement.priority || 'medium',
        type: requirement.type || 'feature',
        status: requirement.status || 'todo',
        assigneeId: requirement.assignee?._id || requirement.assigneeId || '',
        projectId: requirement.projectId || requirement.project?._id || '',
        dueDate: requirement.dueDate ? requirement.dueDate.split('T')[0] : '',
        estimatedHours: requirement.estimatedHours || '',
        actualHours: requirement.actualHours || '',
        acceptanceCriteria: requirement.acceptanceCriteria?.map((c: any) =>
          typeof c === 'string' ? c : c.description
        ) || [],
        attachments: requirement.attachments?.map((a: any) => ({
          filename: a.filename,
          url: a.url
        })) || []
      })
    } else if (isOpen && !isEditing) {
      // 重置表单为新建状态，如果有初始项目ID则设置
      setFormData({
        title: '',
        description: '',
        priority: 'medium',
        type: 'feature',
        status: 'todo',
        assigneeId: '',
        projectId: initialProjectId || '', // 使用初始项目ID
        dueDate: '',
        estimatedHours: '',
        actualHours: '',
        acceptanceCriteria: [],
        attachments: []
      })
    }
  }, [isOpen, isEditing, requirement, initialProjectId])

  // 验证表单
  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.title.trim()) {
      newErrors.title = '需求标题不能为空'
    } else if (formData.title.length > 200) {
      newErrors.title = '标题不能超过200个字符'
    }

    if (!formData.description.trim()) {
      newErrors.description = '需求描述不能为空'
    }

    if (!formData.assigneeId) {
      newErrors.assigneeId = '请选择指派人'
    }

    if (formData.estimatedHours && (isNaN(Number(formData.estimatedHours)) || Number(formData.estimatedHours) < 0)) {
      newErrors.estimatedHours = '预估工时必须为正数'
    }

    if (formData.actualHours && (isNaN(Number(formData.actualHours)) || Number(formData.actualHours) < 0)) {
      newErrors.actualHours = '实际工时必须为正数'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // 添加验收标准（使用函数式更新，避免连续添加时闭包拿到旧 state 导致只保存最后一条）
  const handleAddCriteria = () => {
    const toAdd = newCriteria.trim()
    if (!toAdd) return
    setFormData((prev) => ({
      ...prev,
      acceptanceCriteria: [...prev.acceptanceCriteria, toAdd]
    }))
    setNewCriteria('')
  }

  // 删除验收标准（使用函数式更新保证基于最新列表操作）
  const handleRemoveCriteria = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      acceptanceCriteria: prev.acceptanceCriteria.filter((_, i) => i !== index)
    }))
  }

  // 处理文件选择
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setUploadingFile(file)
    }
  }

  // 添加附件
  const handleAddAttachment = async () => {
    if (!uploadingFile) return

    try {
      // 将文件转换为 base64 格式存储
      const readFileAsBase64 = (): Promise<string> => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = (e) => {
            const base64 = e.target?.result as string
            resolve(base64)
          }
          reader.onerror = () => reject(new Error('文件读取失败'))
          reader.readAsDataURL(uploadingFile)
        })
      }

      const base64Url = await readFileAsBase64()
      const newAttachment = {
        filename: uploadingFile.name,
        url: base64Url
      }

      console.log('[handleAddAttachment] 添加附件:', newAttachment.filename)
      console.log('[handleAddAttachment] 当前附件列表:', formData.attachments)

      setFormData(prevFormData => ({
        ...prevFormData,
        attachments: [...prevFormData.attachments, newAttachment]
      }))

      setShowUploadDialog(false)
      setUploadingFile(null)

      console.log('[handleAddAttachment] 附件添加成功')
    } catch (error) {
      console.error('添加附件失败:', error)
      toast.error('添加附件失败')
    }
  }

  // 删除附件
  const handleRemoveAttachment = (index: number) => {
    setFormData({
      ...formData,
      attachments: formData.attachments.filter((_, i) => i !== index)
    })
  }

  // 保存需求
  const handleSave = () => {
    if (validateForm()) {
      // 合并已添加的验收标准 + 输入框中未按回车确认的内容，避免填写了但未保存
      const allCriteria = [
        ...formData.acceptanceCriteria,
        ...(newCriteria.trim() ? [newCriteria.trim()] : [])
      ]
      const dataToSave: any = {
        ...formData,
        assigneeId: formData.assigneeId || undefined,
        estimatedHours: formData.estimatedHours ? Number(formData.estimatedHours) : undefined,
        actualHours: formData.actualHours ? Number(formData.actualHours) : undefined,
        dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : undefined,
        attachments: formData.attachments,
        // 确保验收标准是对象数组格式
        acceptanceCriteria: allCriteria.map((c: string) => ({
          description: c,
          isCompleted: false
        }))
      }

      console.log('[handleSave] 保存需求数据:', dataToSave)
      onSave(dataToSave)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0 gap-0 overflow-hidden flex flex-col">
        <DialogHeader className="bg-primary text-primary-foreground px-6 py-4 shrink-0 rounded-t-lg">
          <div className="flex items-center space-x-3">
            <AlertCircle className="h-6 w-6" />
            <DialogTitle className="text-xl font-bold text-white">
              {isEditing ? '编辑需求' : '新建需求'}
            </DialogTitle>
          </div>
        </DialogHeader>

        {/* 内容区域 */}
        <div className="p-6 overflow-y-auto flex-1 min-h-0">
            <div className="space-y-6">
              {/* 标题 */}
              <div>
                <Label htmlFor="title">
                  需求标题 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="输入需求标题"
                  className={`mt-2 ${errors.title ? 'border-red-500' : ''}`}
                  maxLength={200}
                />
                {errors.title && (
                  <p className="text-red-500 text-sm mt-1">{errors.title}</p>
                )}
                <p className="text-gray-500 text-xs mt-1">{formData.title.length}/200</p>
              </div>

              {/* 描述 */}
              <div>
                <Label htmlFor="description">
                  需求描述 <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="详细描述需求内容、背景和价值"
                  className={`mt-2 min-h-[150px] ${errors.description ? 'border-red-500' : ''}`}
                />
                {errors.description && (
                  <p className="text-red-500 text-sm mt-1">{errors.description}</p>
                )}
                {formData.description.length > 0 && (
                  <p className="text-gray-500 text-xs mt-1">
                    {formData.description.length > 10000 
                      ? `${(formData.description.length / 1024).toFixed(1)} KB` 
                      : `${formData.description.length} 字符`}
                  </p>
                )}
              </div>

              {/* 优先级、类型和状态 */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="priority">优先级</Label>
                  <select
                    id="priority"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="mt-2 w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {priorityOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="type">需求类型</Label>
                  <select
                    id="type"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="mt-2 w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {typeOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.icon} {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="status">状态</Label>
                  <select
                    id="status"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="mt-2 w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="todo">待处理</option>
                    <option value="in-progress">进行中</option>
                    <option value="done">已完成</option>
                    <option value="blocked">已阻塞</option>
                  </select>
                </div>
              </div>

              {/* 所属项目 */}
              <div>
                <Label htmlFor="project" className="flex items-center space-x-2">
                  <Folder className="h-4 w-4" />
                  <span>所属项目</span>
                  <span className="text-gray-400 font-normal">(可选)</span>
                </Label>
                <select
                  id="project"
                  value={formData.projectId}
                  onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                  className="mt-2 w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loadingProjects}
                >
                  <option value="">不关联项目</option>
                  {projects.map(project => (
                    <option key={project._id} value={project._id}>
                      {project.name}
                    </option>
                  ))}
                </select>
                {loadingProjects && (
                  <p className="text-gray-500 text-xs mt-1">加载项目列表中...</p>
                )}
              </div>

              {/* 指派人 */}
              <div>
                <Label htmlFor="assignee">
                  指派人 <span className="text-red-500">*</span>
                </Label>
                <select
                  id="assignee"
                  value={formData.assigneeId}
                  onChange={(e) => setFormData({ ...formData, assigneeId: e.target.value })}
                  className={`mt-2 w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.assigneeId ? 'border-red-500' : ''}`}
                  disabled={loadingUsers}
                >
                  <option value="">
                    {loadingUsers ? '加载用户中...' : '选择指派人'}
                  </option>
                  {users.map(user => (
                    <option key={user._id} value={user._id}>{user.username}</option>
                  ))}
                </select>
                {errors.assigneeId && (
                  <p className="text-red-500 text-sm mt-1">{errors.assigneeId}</p>
                )}
              </div>

              {/* 截止日期和工时 */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="dueDate">截止日期</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="estimatedHours">预估工时（小时）</Label>
                  <Input
                    id="estimatedHours"
                    type="number"
                    min="0"
                    step="0.5"
                    value={formData.estimatedHours}
                    onChange={(e) => setFormData({ ...formData, estimatedHours: e.target.value })}
                    placeholder="0"
                    className={`mt-2 ${errors.estimatedHours ? 'border-red-500' : ''}`}
                  />
                  {errors.estimatedHours && (
                    <p className="text-red-500 text-sm mt-1">{errors.estimatedHours}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="actualHours">实际工时（小时）</Label>
                  <Input
                    id="actualHours"
                    type="number"
                    min="0"
                    step="0.5"
                    value={formData.actualHours}
                    onChange={(e) => setFormData({ ...formData, actualHours: e.target.value })}
                    placeholder="0"
                    className={`mt-2 ${errors.actualHours ? 'border-red-500' : ''}`}
                  />
                  {errors.actualHours && (
                    <p className="text-red-500 text-sm mt-1">{errors.actualHours}</p>
                  )}
                </div>
              </div>

              {/* 验收标准 */}
              <div>
                <Label>验收标准</Label>
                <div className="mt-2 space-y-2">
                  {formData.acceptanceCriteria.map((criteria, index) => (
                    <div
                      key={index}
                      className="flex items-start space-x-2 p-3 bg-gray-50 rounded-lg"
                    >
                      <span className="flex-1 text-sm">{criteria}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveCriteria(index)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex space-x-2">
                  <Input
                    value={newCriteria}
                    onChange={(e) => setNewCriteria(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddCriteria()}
                    placeholder="添加验收标准，按回车确认"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    onClick={handleAddCriteria}
                    variant="outline"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* 附件 */}
              <div>
                <Label>附件</Label>
                <div className="mt-2 space-y-2">
                  {formData.attachments && formData.attachments.length > 0 ? (
                    formData.attachments.map((attachment, index) => (
                      <div
                        key={`${attachment.filename}-${index}`}
                        className="flex items-start space-x-2 p-3 bg-gray-50 rounded-lg"
                      >
                        <Paperclip className="h-4 w-4 text-gray-500 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{attachment.filename}</p>
                          <p className="text-xs text-gray-500 truncate">{attachment.url}</p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveAttachment(index)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-4">暂无附件</p>
                  )}
                </div>
                <div className="mt-2">
                  <Button
                    type="button"
                    onClick={() => setShowUploadDialog(!showUploadDialog)}
                    variant="outline"
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    添加附件
                  </Button>
                </div>

                {/* 上传附件对话框 */}
                {showUploadDialog && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm text-gray-600 mb-1 block">选择文件</label>
                        <input
                          type="file"
                          onChange={handleFileSelect}
                          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        {uploadingFile && (
                          <p className="text-sm text-gray-600 mt-1">
                            已选择: {uploadingFile.name} ({(uploadingFile.size / 1024).toFixed(2)} KB)
                          </p>
                        )}
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setShowUploadDialog(false)
                            setUploadingFile(null)
                          }}
                        >
                          取消
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleAddAttachment}
                          disabled={!uploadingFile}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          添加
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

        {/* 底部操作 */}
        <DialogFooter className="border-t p-4 bg-muted/50 shrink-0 rounded-b-lg">
          <Button variant="outline" onClick={onCancel}>
            取消
          </Button>
          <Button onClick={handleSave}>
            {isEditing ? '保存修改' : '创建需求'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default RequirementDialog
