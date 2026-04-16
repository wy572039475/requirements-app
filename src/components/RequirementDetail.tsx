import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  X,
  Edit2,
  Trash2,
  User,
  Check,
  Calendar,
  Clock,
  Flag,
  CheckSquare,
  MessageSquare,
  Paperclip,
  Tag,
  ExternalLink,
  Plus
} from 'lucide-react'
import { Requirement } from '@/store/requirements-store'
import { useRequirementsStore } from '@/store/requirements-store'
import { isHtmlContent, htmlContentStyles } from '@/utils/html-utils'
import { toast } from '@/components/ui/toast-container'
import ConfirmModal from './ConfirmModal'

interface RequirementDetailProps {
  isOpen: boolean
  requirement: Requirement | null
  onClose: () => void
  onEdit: (requirement: Requirement) => void
  onDelete: (id: string) => void
  onUpdateStatus: (id: string, status: string) => void
}

const RequirementDetail: React.FC<RequirementDetailProps> = ({
  isOpen,
  requirement: propRequirement,
  onClose,
  onEdit,
  onDelete,
  onUpdateStatus
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'acceptance' | 'comments' | 'attachments'>('overview')

  // 新增评论
  const [newComment, setNewComment] = useState('')
  // 编辑评论：当前编辑的评论索引与内容
  const [editingCommentIndex, setEditingCommentIndex] = useState<number | null>(null)
  const [editingCommentContent, setEditingCommentContent] = useState('')
  // 删除评论确认
  const [deleteCommentIndex, setDeleteCommentIndex] = useState<number | null>(null)

  // 获取store中的actions和requirements
  const { addComment, updateComment, deleteComment, toggleAcceptanceCriteria, requirements, addAttachment, deleteAttachment } = useRequirementsStore()

  // 上传附件
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [uploadingFile, setUploadingFile] = useState<File | null>(null)

  // 从store中获取最新的需求数据
  const requirement = requirements.find(r => r._id === propRequirement?._id) || propRequirement

  if (!isOpen || !requirement) return null

  // 获取优先级显示
  const getPriorityDisplay = (priority: string) => {
    const config = {
      critical: { text: '紧急', color: 'bg-red-100 text-red-800 border-red-300', icon: '🔴' },
      high: { text: '高', color: 'bg-orange-100 text-orange-800 border-orange-300', icon: '🟠' },
      medium: { text: '中', color: 'bg-yellow-100 text-yellow-800 border-yellow-300', icon: '🟡' },
      low: { text: '低', color: 'bg-green-100 text-green-800 border-green-300', icon: '🟢' }
    }
    return config[priority as keyof typeof config] || config.medium
  }

  // 获取状态显示
  const getStatusDisplay = (status: string) => {
    const config = {
      todo: { text: '待处理', color: 'bg-gray-100 text-gray-800 border-gray-300' },
      'in-progress': { text: '进行中', color: 'bg-blue-100 text-blue-800 border-blue-300' },
      done: { text: '已完成', color: 'bg-green-100 text-green-800 border-green-300' },
      blocked: { text: '已阻塞', color: 'bg-red-100 text-red-800 border-red-300' }
    }
    return config[status as keyof typeof config] || config.todo
  }

  // 获取类型显示
  const getTypeDisplay = (type: string) => {
    const config = {
      feature: { text: '功能', icon: '⚡' },
      bug: { text: '缺陷', icon: '🐛' },
      improvement: { text: '改进', icon: '📈' },
      task: { text: '任务', icon: '✅' }
    }
    return config[type as keyof typeof config] || config.feature
  }

  // 添加评论
  const handleAddComment = async () => {
    if (newComment.trim() && requirement) {
      try {
        await addComment(requirement._id, newComment.trim())
        setNewComment('')
      } catch (error) {
        console.error('添加评论失败:', error)
      }
    }
  }

  // 开始编辑评论
  const handleStartEditComment = (index: number) => {
    const comment = requirement?.comments?.[index]
    if (comment) {
      setEditingCommentIndex(index)
      setEditingCommentContent(comment.content)
    }
  }

  // 保存编辑评论
  const handleSaveEditComment = async () => {
    if (requirement && editingCommentIndex !== null && editingCommentContent.trim()) {
      try {
        await updateComment(requirement._id, editingCommentIndex, editingCommentContent.trim())
        setEditingCommentIndex(null)
        setEditingCommentContent('')
      } catch (error) {
        console.error('更新评论失败:', error)
      }
    }
  }

  // 取消编辑评论
  const handleCancelEditComment = () => {
    setEditingCommentIndex(null)
    setEditingCommentContent('')
  }

  // 删除评论
  const handleDeleteComment = async (index: number) => {
    if (requirement) {
      try {
        await deleteComment(requirement._id, index)
        setDeleteCommentIndex(null)
      } catch (error) {
        console.error('删除评论失败:', error)
      }
    }
  }

  // 切换验收标准状态
  const handleToggleCriteria = async (index: number) => {
    if (requirement) {
      try {
        await toggleAcceptanceCriteria(requirement._id, index)
      } catch (error) {
        console.error('切换验收标准状态失败:', error)
      }
    }
  }

  // 处理文件选择
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setUploadingFile(file)
    }
  }

  // 上传附件
  const handleUploadAttachment = async () => {
    if (!requirement || !uploadingFile) return

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
      await addAttachment(requirement._id, uploadingFile.name, base64Url)
      setShowUploadDialog(false)
      setUploadingFile(null)
      toast.success('附件上传成功')
    } catch (error) {
      console.error('上传附件失败:', error)
      toast.error('上传附件失败')
    }
  }

  return (
    <>
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 gap-0 overflow-hidden flex flex-col" hideCloseButton>
        {/* 头部 */}
        <div className="bg-primary text-primary-foreground p-6 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">{getTypeDisplay(requirement.type).icon}</span>
                <div>
                  <h2 className="text-xl font-bold">{requirement.title}</h2>
                  <p className="text-blue-100 text-sm mt-1">
                    ID: {requirement.businessId || requirement._id}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(requirement)}
                  className="text-primary-foreground hover:bg-primary/80"
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(requirement._id)}
                  className="text-primary-foreground hover:bg-destructive/90"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="text-primary-foreground hover:bg-primary/80"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* 标签页导航 */}
          <div className="border-b bg-white sticky top-[88px] z-10">
            <div className="flex space-x-1 px-4">
              {[
                { id: 'overview', label: '概览', icon: Flag },
                { id: 'acceptance', label: '验收标准', icon: CheckSquare },
                { id: 'comments', label: '评论', icon: MessageSquare },
                { id: 'attachments', label: '附件', icon: Paperclip }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center space-x-2 ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 内容区域 */}
          <div className="p-6 max-h-[calc(100vh-250px)] overflow-y-auto">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* 基本信息卡片 */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold mb-4 flex items-center space-x-2">
                    <Flag className="h-4 w-4" />
                    <span>基本信息</span>
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm text-gray-600">类型</label>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-lg">{getTypeDisplay(requirement.type).icon}</span>
                          <span className="font-medium">{getTypeDisplay(requirement.type).text}</span>
                        </div>
                      </div>

                      <div>
                        <label className="text-sm text-gray-600">优先级</label>
                        <div className="mt-1">
                          <Badge className={getPriorityDisplay(requirement.priority).color}>
                            {getPriorityDisplay(requirement.priority).icon} {getPriorityDisplay(requirement.priority).text}
                          </Badge>
                        </div>
                      </div>

                      <div>
                        <label className="text-sm text-gray-600">状态</label>
                        <div className="mt-1">
                          <Badge className={getStatusDisplay(requirement.status).color}>
                            {getStatusDisplay(requirement.status).text}
                          </Badge>
                        </div>
                      </div>

                      {requirement.project && (
                        <div>
                          <label className="text-sm text-gray-600">所属项目</label>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className="text-lg">📁</span>
                            <span className="font-medium">
                              {typeof requirement.project === 'object'
                                ? requirement.project?.name || '未知项目'
                                : requirement.project || '未知项目'}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm text-gray-600">指派人</label>
                        <div className="flex items-center space-x-2 mt-1">
                          <User className="h-4 w-4 text-gray-500" />
                          <span className="font-medium">
                            {typeof requirement.assignee === 'object'
                              ? requirement.assignee?.username || '未指派'
                              : requirement.assignee || '未指派'}
                          </span>
                        </div>
                      </div>
                      
                      <div>
                        <label className="text-sm text-gray-600">创建日期</label>
                        <div className="flex items-center space-x-2 mt-1">
                          <Calendar className="h-4 w-4 text-gray-500" />
                          <span className="text-sm">
                            {requirement.createdAt ? new Date(requirement.createdAt).toLocaleString('zh-CN') : '未知'}
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="text-sm text-gray-600">更新日期</label>
                        <div className="flex items-center space-x-2 mt-1">
                          <Calendar className="h-4 w-4 text-gray-500" />
                          <span className="text-sm">
                            {requirement.updatedAt ? new Date(requirement.updatedAt).toLocaleString('zh-CN') : '未知'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 描述 */}
                <div>
                  <h3 className="font-semibold mb-3 flex items-center space-x-2">
                    <MessageSquare className="h-4 w-4" />
                    <span>需求描述</span>
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    {isHtmlContent(requirement.description) ? (
                      <div
                        className={htmlContentStyles}
                        dangerouslySetInnerHTML={{ __html: requirement.description || '' }}
                      />
                    ) : (
                      <p className="text-gray-700 whitespace-pre-wrap">{requirement.description}</p>
                    )}
                  </div>
                </div>

                {/* 标签 */}
                {requirement.tags && requirement.tags.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center space-x-2">
                      <Tag className="h-4 w-4" />
                      <span>标签</span>
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {requirement.tags.map((tag, index) => (
                        <Badge key={index} className="bg-blue-100 text-blue-800">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* 工时和故事点 */}
                <div className="grid grid-cols-3 gap-4">
                  {requirement.storyPoints && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center space-x-2 text-gray-600 text-sm">
                        <Flag className="h-4 w-4" />
                        <span>故事点</span>
                      </div>
                      <p className="text-2xl font-bold mt-2">{requirement.storyPoints}</p>
                    </div>
                  )}
                  
                  {requirement.estimatedHours && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center space-x-2 text-gray-600 text-sm">
                        <Clock className="h-4 w-4" />
                        <span>预估工时</span>
                      </div>
                      <p className="text-2xl font-bold mt-2">{requirement.estimatedHours}h</p>
                    </div>
                  )}
                  
                  {requirement.actualHours && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center space-x-2 text-gray-600 text-sm">
                        <Clock className="h-4 w-4" />
                        <span>实际工时</span>
                      </div>
                      <p className="text-2xl font-bold mt-2">{requirement.actualHours}h</p>
                    </div>
                  )}
                </div>

                {/* 截止日期 */}
                {requirement.dueDate && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-semibold mb-2 flex items-center space-x-2">
                      <Calendar className="h-4 w-4" />
                      <span>截止日期</span>
                    </h3>
                    <p className="text-lg font-semibold">
                      {new Date(requirement.dueDate).toLocaleDateString('zh-CN')}
                    </p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'acceptance' && (
              <div className="space-y-4">
                <h3 className="font-semibold">验收标准</h3>
                {requirement.acceptanceCriteria && requirement.acceptanceCriteria.length > 0 ? (
                  <div className="space-y-2">
                    {requirement.acceptanceCriteria.map((criteria, index) => (
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-start space-x-3">
                          <input
                            type="checkbox"
                            checked={typeof criteria === 'object' ? criteria.isCompleted : false}
                            onChange={() => handleToggleCriteria(index)}
                            className="mt-1 h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <div className="flex-1">
                            <p className="text-gray-700">
                              {typeof criteria === 'string' ? criteria : criteria.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <CheckSquare className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                    <p>暂无验收标准</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'comments' && (
              <div className="space-y-4">
                <h3 className="font-semibold">评论</h3>
                
                {/* 添加评论 */}
                <div className="space-y-2">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="添加评论..."
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
                  />
                  <div className="flex justify-end">
                    <Button
                      onClick={handleAddComment}
                      disabled={!newComment.trim()}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      发送评论
                    </Button>
                  </div>
                </div>

                {/* 评论列表 */}
                {requirement.comments && requirement.comments.length > 0 ? (
                  <div className="space-y-4">
                    {requirement.comments.map((comment: any, index: number) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-2">
                              <span className="font-medium">
                                {comment.user?.username || '用户'}
                              </span>
                              <span className="text-gray-500 text-sm">
                                {comment.createdAt ? new Date(comment.createdAt).toLocaleString('zh-CN') : ''}
                              </span>
                            </div>
                            {editingCommentIndex === index ? (
                              <div className="space-y-2">
                                <textarea
                                  value={editingCommentContent}
                                  onChange={(e) => setEditingCommentContent(e.target.value)}
                                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px] text-gray-700"
                                  autoFocus
                                />
                                <div className="flex gap-2">
                                  <Button size="sm" onClick={handleSaveEditComment} disabled={!editingCommentContent.trim()}>
                                    <Check className="h-4 w-4 mr-1" />
                                    保存
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={handleCancelEditComment}>
                                    <X className="h-4 w-4 mr-1" />
                                    取消
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <p className="text-gray-700">{comment.content}</p>
                            )}
                          </div>
                          {editingCommentIndex !== index && (
                            <div className="flex items-center gap-1 shrink-0">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-gray-500 hover:text-blue-600"
                                onClick={() => handleStartEditComment(index)}
                                title="编辑"
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-gray-500 hover:text-red-600"
                                onClick={() => setDeleteCommentIndex(index)}
                                title="删除"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <MessageSquare className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                    <p>暂无评论</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'attachments' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">附件</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowUploadDialog(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    上传附件
                  </Button>
                </div>

                {/* 上传附件对话框 */}
                {showUploadDialog && (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
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
                          onClick={handleUploadAttachment}
                          disabled={!uploadingFile}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          上传
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {requirement.attachments && requirement.attachments.length > 0 ? (
                  <div className="space-y-2">
                    {requirement.attachments.map((attachment: any, index: number) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <Paperclip className="h-5 w-5 text-gray-500" />
                          <div>
                            <p className="font-medium">{attachment.filename}</p>
                            <p className="text-sm text-gray-500">
                              {attachment.uploadedAt ? new Date(attachment.uploadedAt).toLocaleString('zh-CN') : ''}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button variant="ghost" size="sm" title="下载">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteAttachment(requirement._id, index)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            title="删除"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Paperclip className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                    <p>暂无附件</p>
                    <p className="text-sm mt-1">点击"上传附件"按钮添加文件</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 底部操作 */}
          <div className="border-t p-4 bg-gray-50 sticky bottom-0">
            <div className="flex justify-between items-center">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onUpdateStatus(requirement._id, 'todo')}
                  className={requirement.status === 'todo' ? 'bg-gray-600 text-white' : ''}
                >
                  待处理
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onUpdateStatus(requirement._id, 'in-progress')}
                  className={requirement.status === 'in-progress' ? 'bg-blue-600 text-white' : ''}
                >
                  进行中
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onUpdateStatus(requirement._id, 'done')}
                  className={requirement.status === 'done' ? 'bg-green-600 text-white' : ''}
                >
                  已完成
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onUpdateStatus(requirement._id, 'blocked')}
                  className={requirement.status === 'blocked' ? 'bg-red-600 text-white' : ''}
                >
                  已阻塞
                </Button>
              </div>
              <Button onClick={onClose}>
                关闭
              </Button>
            </div>
          </div>
      </DialogContent>
    </Dialog>
    <ConfirmModal
      isOpen={deleteCommentIndex !== null}
      title="删除评论"
      message="确定要删除这条评论吗？删除后无法恢复。"
      confirmText="删除"
      cancelText="取消"
      danger
      onConfirm={() => deleteCommentIndex !== null && handleDeleteComment(deleteCommentIndex)}
      onCancel={() => setDeleteCommentIndex(null)}
    />
  </>
  )
}

export default RequirementDetail
