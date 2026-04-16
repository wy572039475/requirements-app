import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'

interface Feature {
  id: string
  name: string
  description: string
  kanoModel: string
  priority: string
  businessRules: string
}

interface FeatureEditDialogProps {
  isOpen: boolean
  feature?: Feature
  mode: 'create' | 'edit'
  onSave: (feature: Feature) => void
  onCancel: () => void
}

const FeatureEditDialog: React.FC<FeatureEditDialogProps> = ({
  isOpen,
  feature,
  mode,
  onSave,
  onCancel
}) => {
  const [formData, setFormData] = useState<Feature>({
    id: '',
    name: '',
    description: '',
    kanoModel: '基本型',
    priority: '中',
    businessRules: ''
  })

  useEffect(() => {
    if (feature) {
      setFormData(feature)
    } else {
      setFormData({
        id: '',
        name: '',
        description: '',
        kanoModel: '基本型',
        priority: '中',
        businessRules: ''
      })
    }
  }, [feature, isOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const savedFeature: Feature = {
      ...formData,
      id: formData.id || `feature-${Date.now()}`
    }
    onSave(savedFeature)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? '新增功能' : '编辑功能'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">功能名称</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="请输入功能名称"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">功能描述</label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="请输入功能描述"
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Kano模型</label>
              <Select
                value={formData.kanoModel}
                onValueChange={(value) => setFormData({ ...formData, kanoModel: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="基本型">基本型</SelectItem>
                  <SelectItem value="期望型">期望型</SelectItem>
                  <SelectItem value="兴奋型">兴奋型</SelectItem>
                  <SelectItem value="无差异">无差异</SelectItem>
                  <SelectItem value="反向型">反向型</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">优先级</label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData({ ...formData, priority: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="高">高</SelectItem>
                  <SelectItem value="中">中</SelectItem>
                  <SelectItem value="低">低</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">业务规则</label>
            <Textarea
              value={formData.businessRules}
              onChange={(e) => setFormData({ ...formData, businessRules: e.target.value })}
              placeholder="请输入业务规则"
              rows={2}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel}>取消</Button>
            <Button type="submit">{mode === 'create' ? '新增' : '保存'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default FeatureEditDialog
