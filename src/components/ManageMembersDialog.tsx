import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Plus, X, Search, UserPlus } from 'lucide-react'
import { projectsAPI } from '@/services/projects-api'
import api from '@/services/api'
import { toast } from '@/components/ui/toast-container'
import ConfirmDialog from '@/components/ui/confirm-dialog'

interface Member {
  user: {
    _id: string
    username: string
    email?: string
  }
  role: string
  joinedAt: string
}

interface ManageMembersDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  projectOwner: { _id: string; username: string }
  members: Member[]
  onMembersUpdated: () => void
}

interface User {
  _id: string
  username: string
  email: string
}


const getRoleText = (role: string) => {
  switch (role) {
    case 'owner': return '项目负责人'
    case 'pm': return '产品经理'
    case 'developer': return '开发工程师'
    case 'designer': return '设计师'
    case 'tester': return '测试工程师'
    default: return role
  }
}

const ManageMembersDialog = ({
  open,
  onOpenChange,
  projectId,
  projectOwner,
  members,
  onMembersUpdated,
}: ManageMembersDialogProps) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<User[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    memberId: '',
    memberName: '',
  })

  // 搜索用户
  const handleSearchUsers = async (query: string) => {
    setSearchQuery(query)
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    try {
      console.log('[ManageMembersDialog] 搜索用户:', query)
      const response = await api.get('/users/assignable', {
        params: { search: query }
      })
      console.log('[ManageMembersDialog] 搜索结果:', response)
      
      // 过滤掉已经是成员的用户（安全检查）
      const safeMembers = members || []
      const memberIds = new Set(safeMembers.map(m => m?.user?._id).filter(Boolean))
      console.log('[ManageMembersDialog] 现有成员 IDs:', Array.from(memberIds))
      
      // API 响应拦截器已经返回 response.data，所以直接访问 data.users
      const users = response.data?.users || []
      console.log('[ManageMembersDialog] 获取到的用户:', users.length, '个')
      
      const availableUsers = users.filter(
        (user: User) => {
          if (!user?._id) return false
          const isMember = memberIds.has(user._id)
          const isOwner = user._id === projectOwner?._id
          return !isMember && !isOwner
        }
      )
      console.log('[ManageMembersDialog] 可添加用户:', availableUsers.length, '个')
      setSearchResults(availableUsers)
    } catch (error) {
      console.error('[ManageMembersDialog] 搜索用户失败:', error)
      toast.error('搜索用户失败', '操作失败')
    } finally {
      setIsSearching(false)
    }
  }

  // 添加成员
  const handleAddMember = async () => {
    if (!selectedUser) {
      toast.warning('请选择要添加的用户', '提示')
      return
    }

    try {
      await projectsAPI.addMember(projectId, selectedUser._id, 'pm')
      toast.success(`已将 ${selectedUser.username} 添加到项目`, '添加成功')
      setSelectedUser(null)
      setSearchQuery('')
      setSearchResults([])
      onMembersUpdated()
    } catch (error) {
      console.error('添加成员失败:', error)
      toast.error('添加成员失败，请重试', '操作失败')
    }
  }

  // 移除成员
  const handleRemoveMember = async () => {
    const { memberId, memberName } = confirmDialog
    try {
      await projectsAPI.removeMember(projectId, memberId)
      toast.success(`已将 ${memberName} 从项目中移除`, '移除成功')
      setConfirmDialog({ isOpen: false, memberId: '', memberName: '' })
      onMembersUpdated()
    } catch (error) {
      console.error('移除成员失败:', error)
      toast.error('移除成员失败，请重试', '操作失败')
      setConfirmDialog({ isOpen: false, memberId: '', memberName: '' })
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              管理项目成员
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* 当前成员列表 */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">当前成员</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {/* 项目负责人 */}
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                      <span className="text-primary-600 font-medium text-sm">
                        {projectOwner.username.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium">{projectOwner.username}</div>
                      <div className="text-xs text-gray-500">项目负责人</div>
                    </div>
                  </div>
                  <Badge className="bg-primary-100 text-primary-800">负责人</Badge>
                </div>

                {/* 其他成员 */}
                {members.map((member) => (
                  <div
                    key={member.user._id}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-gray-600 font-medium text-sm">
                          {member.user.username.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium">{member.user.username}</div>
                        <div className="text-xs text-gray-500">{member.user.email}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{getRoleText(member.role)}</Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-gray-400 hover:text-red-500"
                        onClick={() =>
                          setConfirmDialog({
                            isOpen: true,
                            memberId: member.user._id,
                            memberName: member.user.username,
                          })
                        }
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                {members.length === 0 && (
                  <div className="text-center text-gray-500 py-4">
                    暂无其他成员
                  </div>
                )}
              </div>
            </div>

            {/* 添加新成员 */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">添加新成员</h4>
              
              {/* 搜索用户 */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="搜索用户名或邮箱..."
                  value={searchQuery}
                  onChange={(e) => handleSearchUsers(e.target.value)}
                  className="pl-9"
                />
                {isSearching && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="animate-spin h-4 w-4 border-2 border-primary-600 border-t-transparent rounded-full" />
                  </div>
                )}
              </div>

              {/* 搜索结果 */}
              {searchResults.length > 0 && (
                <div className="border rounded-lg mb-3 max-h-32 overflow-y-auto">
                  {searchResults.map((user) => (
                    <div
                      key={user._id}
                      className={`flex items-center gap-3 p-2 cursor-pointer hover:bg-gray-100 ${
                        selectedUser?._id === user._id ? 'bg-primary-50' : ''
                      }`}
                      onClick={() => setSelectedUser(user)}
                    >
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-gray-600 font-medium text-sm">
                          {user.username.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium">{user.username}</div>
                        <div className="text-xs text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 已选择的用户 */}
              {selectedUser && (
                <div className="flex items-center gap-3 p-2 bg-primary-50 rounded-lg mb-3">
                  <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                    <span className="text-primary-600 font-medium text-sm">
                      {selectedUser.username.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{selectedUser.username}</div>
                    <div className="text-xs text-gray-500">{selectedUser.email}</div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setSelectedUser(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {/* 添加按钮 */}
              <Button
                onClick={handleAddMember}
                disabled={!selectedUser}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                添加成员
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 确认移除对话框 */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title="移除成员"
        message={`确定要将 ${confirmDialog.memberName} 从项目中移除吗？移除后该成员将无法访问此项目。`}
        type="danger"
        confirmText="确认移除"
        cancelText="取消"
        onConfirm={handleRemoveMember}
        onCancel={() => setConfirmDialog({ isOpen: false, memberId: '', memberName: '' })}
      />
    </>
  )
}

export default ManageMembersDialog
