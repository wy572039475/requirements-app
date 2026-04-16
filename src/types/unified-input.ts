// 统一输入源抽象
export type InputSourceType = 'text' | 'document' | 'requirement'

export interface UnifiedInputSource {
  type: InputSourceType
  content?: string  // 文本内容
  fileName?: string  // 文档文件名
  fileData?: string  // 文档文件数据（base64）
  fileType?: string  // 文档 MIME 类型
  fileSize?: number  // 文档大小
  requirementId?: string  // 需求ID
  requirementTitle?: string  // 需求标题
  businessId?: string  // 需求业务ID
  hasAttachments?: boolean  // 是否有附件
}

export interface ContentLoadResult {
  text: string  // 文本内容
  html?: string  // HTML内容（如果有的话）
  fileName?: string  // 文件名
  fileData?: string  // 文件数据
  fileSize?: number  // 文件大小
  sourceInfo?: string  // 来源信息（用于显示）
  sourceRequirementId?: string  // 来源需求ID
}

// 输入源选择模式配置
export interface InputSourceMode {
  id: InputSourceType
  label: string
  description: string
  icon: string  // 图标名称
  enabled: boolean
}

// 预定义的输入源模式
export const INPUT_SOURCE_MODES: InputSourceMode[] = [
  {
    id: 'text',
    label: '文本输入',
    description: '直接输入需求描述',
    icon: 'FileText',
    enabled: true
  },
  {
    id: 'document',
    label: '文档上传',
    description: '上传TXT、DOCX等文档',
    icon: 'Upload',
    enabled: true
  },
  {
    id: 'requirement',
    label: '从需求池选择',
    description: '选择已保存的需求',
    icon: 'Database',
    enabled: true
  }
]
