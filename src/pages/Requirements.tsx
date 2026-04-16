import { FC, useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import RequirementsToolbar from '../components/RequirementsToolbar'
import RequirementsBoard from '../components/RequirementsBoard'
import AIRequirementsEngine from '../components/AIRequirementsEngine'
import PRDFeatureBreakdown from '../components/PRDFeatureBreakdown'
import FeatureBreakdownHistory from '../components/FeatureBreakdownHistory'
import InterfaceList from '../components/InterfaceList'
import InterfaceArchiveHistory from '../components/InterfaceArchiveHistory'
import { Database, Sparkles, FileText, Globe, ArrowLeft, Scissors, Archive } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRequirementsStore } from '@/store/requirements-store'

const Requirements: FC = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const projectIdFromUrl = searchParams.get('projectId')
  const [activeTab, setActiveTab] = useState<'requirements' | 'ai-engine' | 'feature-breakdown' | 'interface-list'>('requirements')
  const [breakdownSubTab, setBreakdownSubTab] = useState<'editor' | 'history'>('editor')
  const [interfaceSubTab, setInterfaceSubTab] = useState<'list' | 'history'>('list')
  const { fetchRequirements, setFilter } = useRequirementsStore()

  // 统一处理数据获取逻辑
  useEffect(() => {
    if (projectIdFromUrl) {
      // 如果有项目ID，设置筛选并获取该项目的需求
      setFilter({ project: [projectIdFromUrl] })
      fetchRequirements({ projectId: projectIdFromUrl })
    } else {
      // 否则获取所有需求
      fetchRequirements()
    }
  }, [projectIdFromUrl, setFilter, fetchRequirements])

  // 如果有 projectId，返回到项目详情
  const handleBackToProject = () => {
    if (projectIdFromUrl) {
      navigate(`/projects/${projectIdFromUrl}`)
    } else {
      navigate('/projects')
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-shrink-0">
        {/* 如果是从项目跳转过来的，显示返回按钮 */}
        {projectIdFromUrl && (
          <Button variant="ghost" onClick={handleBackToProject} className="mb-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回项目详情
          </Button>
        )}
      </div>

      {/* 页签切换 */}
      <div className="border-b">
        <div className="flex space-x-8">
          <button
            onClick={() => setActiveTab('requirements')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center space-x-2 ${
              activeTab === 'requirements'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
            }`}
          >
            <Database className="h-4 w-4" />
            <span>需求池</span>
          </button>
          <button
            onClick={() => setActiveTab('ai-engine')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center space-x-2 ${
              activeTab === 'ai-engine'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
            }`}
          >
            <Sparkles className="h-4 w-4" />
            <span>AI需求评审</span>
          </button>
          <button
            onClick={() => setActiveTab('feature-breakdown')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center space-x-2 ${
              activeTab === 'feature-breakdown'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>需求拆解</span>
          </button>
          <button
            onClick={() => setActiveTab('interface-list')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center space-x-2 ${
              activeTab === 'interface-list'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
            }`}
          >
            <Globe className="h-4 w-4" />
            <span>需求接口</span>
          </button>
        </div>
      </div>

      {/* 内容区域 */}
      {activeTab === 'requirements' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* 工具栏 */}
          <RequirementsToolbar initialProjectId={projectIdFromUrl || undefined} />

          {/* 看板 */}
          <div className="flex-1 overflow-hidden">
            <RequirementsBoard />
          </div>
        </div>
      )}

      {activeTab === 'ai-engine' && (
        <div className="h-full">
          <AIRequirementsEngine />
        </div>
      )}

      {activeTab === 'feature-breakdown' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* 子页签 */}
          <div className="flex items-center space-x-1 px-4 py-2 bg-gray-50/80 border-b border-gray-100">
            <button
              onClick={() => setBreakdownSubTab('editor')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                breakdownSubTab === 'editor'
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
              }`}
            >
              <Scissors className="h-3.5 w-3.5" />
              <span>功能拆解</span>
            </button>
            <button
              onClick={() => setBreakdownSubTab('history')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                breakdownSubTab === 'history'
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
              }`}
            >
              <Archive className="h-3.5 w-3.5" />
              <span>归档记录</span>
            </button>
          </div>

          {/* 子页签内容 */}
          {breakdownSubTab === 'editor' ? (
            <div className="flex-1 overflow-hidden">
              <PRDFeatureBreakdown />
            </div>
          ) : (
            <div className="flex-1 overflow-hidden">
              <FeatureBreakdownHistory />
            </div>
          )}
        </div>
      )}

      {activeTab === 'interface-list' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* 子页签 */}
          <div className="flex items-center space-x-1 px-4 py-2 bg-gray-50/80 border-b border-gray-100">
            <button
              onClick={() => setInterfaceSubTab('list')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                interfaceSubTab === 'list'
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
              }`}
            >
              <Globe className="h-3.5 w-3.5" />
              <span>接口列表</span>
            </button>
            <button
              onClick={() => setInterfaceSubTab('history')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                interfaceSubTab === 'history'
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
              }`}
            >
              <Archive className="h-3.5 w-3.5" />
              <span>归档记录</span>
            </button>
          </div>

          {/* 子页签内容 */}
          {interfaceSubTab === 'list' ? (
            <div className="flex-1 min-h-0">
              <InterfaceList />
            </div>
          ) : (
            <div className="flex-1 min-h-0">
              <InterfaceArchiveHistory />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default Requirements
