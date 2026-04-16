import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'
import { Requirement } from '@/store/requirements-store'

interface RequirementDeleteDialogProps {
  isOpen: boolean
  requirement: Requirement | null
  onCancel: () => void
  onConfirm: () => void
}

const RequirementDeleteDialog: React.FC<RequirementDeleteDialogProps> = ({
  isOpen,
  requirement,
  onCancel,
  onConfirm
}) => {
  if (!requirement) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader className="pb-2">
          <div className="flex items-center space-x-3 text-destructive">
            <AlertTriangle className="h-6 w-6" />
            <DialogTitle>删除需求</DialogTitle>
          </div>
        </DialogHeader>
        <DialogDescription asChild>
          <div className="p-0 space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-red-800 mb-2">警告：此操作不可撤销</h3>
                  <p className="text-red-700 text-sm">
                    删除需求将永久移除该需求及其所有相关数据，包括评论、附件和依赖关系。
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-600">需求标题</label>
                <p className="mt-1 text-lg font-semibold text-gray-900">
                  {requirement.title}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">状态</label>
                  <p className="mt-1 text-gray-900">
                    {requirement.status === 'todo' ? '待处理' : 
                     requirement.status === 'in-progress' ? '进行中' : '已完成'}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600">优先级</label>
                  <p className="mt-1 text-gray-900">
                    {requirement.priority === 'critical' ? '紧急' : 
                     requirement.priority === 'high' ? '高' : 
                     requirement.priority === 'medium' ? '中' : '低'}
                  </p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600">指派人</label>
                <p className="mt-1 text-gray-900">
                  {typeof requirement.assignee === 'object'
                    ? requirement.assignee?.username || '未指派'
                    : requirement.assignee || '未指派'}
                </p>
              </div>

              {requirement.comments && requirement.comments.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm text-yellow-800">
                    ⚠️ 此需求有 <strong>{requirement.comments.length}</strong> 条评论，删除后所有评论将被永久删除
                  </p>
                </div>
              )}

              {requirement.attachments && requirement.attachments.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm text-yellow-800">
                    ⚠️ 此需求有 <strong>{requirement.attachments.length}</strong> 个附件，删除后所有附件将被永久删除
                  </p>
                </div>
              )}
            </div>
          </div>
        </DialogDescription>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onCancel}>
            取消
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            确认删除
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default RequirementDeleteDialog
