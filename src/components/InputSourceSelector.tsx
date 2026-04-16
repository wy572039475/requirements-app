import React, { useState, useEffect } from 'react'
import { FileText, Upload, Database } from 'lucide-react'
import {
  UnifiedInputSource,
  INPUT_SOURCE_MODES,
  InputSourceType
} from '@/types/unified-input'
import RequirementSelectorDialog from './RequirementSelectorDialog'

interface InputSourceSelectorProps {
  value: UnifiedInputSource | null
  onChange: (source: UnifiedInputSource | null) => void
  availableModes?: InputSourceType[]
  disabled?: boolean
}

const InputSourceSelector: React.FC<InputSourceSelectorProps> = ({
  value,
  onChange,
  availableModes = ['text', 'document', 'requirement'],
  disabled = false
}) => {
  const [showRequirementSelector, setShowRequirementSelector] = useState(false)
  const [textValue, setTextValue] = useState('')

  // 同步外部 value 到内部 textValue 状态
  useEffect(() => {
    if (value?.type === 'text' && value.content !== undefined) {
      setTextValue(value.content)
    }
  }, [value])

  const modes = INPUT_SOURCE_MODES.filter(mode => availableModes.includes(mode.id))

  const handleSelectMode = (type: InputSourceType) => {
    if (disabled) return

    if (type === 'requirement') {
      setShowRequirementSelector(true)
    } else if (type === 'text') {
      onChange({
        type: 'text',
        content: ''
      })
    } else if (type === 'document') {
      onChange({
        type: 'document'
      })
    }
  }

  const handleRequirementSelect = (requirement: any) => {
    setShowRequirementSelector(false)

    onChange({
      type: 'requirement',
      requirementId: requirement._id,
      requirementTitle: requirement.title,
      businessId: requirement.businessId,
      hasAttachments: (requirement.attachments?.length || 0) > 0
    })
  }

  const handleTextChange = (content: string) => {
    setTextValue(content)
    if (value?.type === 'text') {
      onChange({ ...value, content })
    } else {
      onChange({
        type: 'text',
        content
      })
    }
  }

  const renderModeCard = (mode: any) => {
    const isActive = value?.type === mode.id
    const IconComponent = mode.id === 'text' ? FileText :
                       mode.id === 'document' ? Upload :
                       Database

    return (
      <button
        key={mode.id}
        onClick={() => handleSelectMode(mode.id)}
        disabled={disabled || !mode.enabled}
        className={`w-full p-4 rounded-xl border-2 transition-all group ${
          isActive
            ? 'border-indigo-500 bg-gradient-to-r from-indigo-50 to-purple-50 shadow-md'
            : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${!mode.enabled ? 'opacity-50' : ''}`}
      >
        <div className="flex items-center space-x-3">
          <div className={`p-2.5 rounded-xl transition-all ${
            isActive
              ? 'bg-gradient-to-br from-indigo-500 to-purple-500 shadow-lg'
              : 'bg-gray-200 group-hover:bg-indigo-200 group-hover:shadow-md'
          }`}>
            <IconComponent className={`h-5 w-5 transition-colors ${
              isActive ? 'text-white' : 'text-gray-600'
            }`} />
          </div>
          <div className="flex-1 text-left">
            <div className="font-bold text-gray-900 text-sm mb-1">{mode.label}</div>
            <div className="text-xs text-gray-600">{mode.description}</div>
          </div>
          {isActive && (
            <div className="h-2.5 w-2.5 rounded-full bg-indigo-500 border-2 border-white shadow-md animate-pulse" />
          )}
        </div>
      </button>
    )
  }

  return (
    <div className="space-y-3">
      {/* 输入方式选择卡片 */}
      <div className="space-y-2">
        {modes.map(renderModeCard)}
      </div>

      {/* 文本输入区域 */}
      {value?.type === 'text' && (
        <div className="space-y-2">
          <label className="block text-xs font-bold text-gray-700 mb-1">
            需求描述
          </label>
          <textarea
            value={textValue}
            onChange={(e) => handleTextChange(e.target.value)}
            placeholder="请输入您的需求规格说明..."
            disabled={disabled}
            className="w-full min-h-[150px] p-4 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white resize-y transition-all text-sm bg-white"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">请详细描述您的需求</span>
            <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">
              {textValue.length} 字符
            </span>
          </div>
        </div>
      )}

      {/* 需求来源信息展示 */}
      {value?.type === 'requirement' && value.requirementTitle && (
        <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
                <Database className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-gray-900 truncate mb-1">
                  {value.businessId} - {value.requirementTitle}
                </div>
                <div className="flex items-center space-x-2">
                  {value.hasAttachments ? (
                    <span className="text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded-full font-medium">
                      ✓ 包含附件
                    </span>
                  ) : (
                    <span className="text-xs text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full font-medium">
                      使用需求描述
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowRequirementSelector(true)}
              className="ml-3 text-xs font-bold text-blue-600 hover:text-blue-700 px-3 py-2 rounded-xl hover:bg-blue-100 transition-colors flex-shrink-0"
            >
              更换
            </button>
          </div>
        </div>
      )}

      {/* 需求选择对话框 */}
      <RequirementSelectorDialog
        open={showRequirementSelector}
        onClose={() => setShowRequirementSelector(false)}
        onSelect={handleRequirementSelect}
      />
    </div>
  )
}

export default InputSourceSelector
