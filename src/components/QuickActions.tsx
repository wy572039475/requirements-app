import { FC } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Calendar, FileText, FolderOpen, Palette, BarChart3 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface QuickAction {
  icon: any
  label: string
  description: string
  path: string
  color: string
}

const QuickActions: FC = () => {
  const navigate = useNavigate()

  const quickActions: QuickAction[] = [
    { icon: FileText, label: '新建需求', description: '创建新的产品需求', path: '/requirements', color: 'bg-blue-500' },
    { icon: FolderOpen, label: '项目管理', description: '管理项目和进度', path: '/projects', color: 'bg-indigo-500' },
    { icon: FileText, label: '编写PRD', description: '开始撰写产品文档', path: '/prd', color: 'bg-green-500' },
    { icon: Palette, label: '原型设计', description: '创建界面原型', path: '/prototype/ai', color: 'bg-purple-500' },
    { icon: BarChart3, label: '数据分析', description: '生成分析报告', path: '/analysis', color: 'bg-orange-500' },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Calendar className="h-5 w-5" />
          <span>快捷操作</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {quickActions.map((action, index) => {
            const Icon = action.icon
            return (
              <button
                key={index}
                onClick={() => navigate(action.path)}
                className="flex flex-col items-center p-4 rounded-lg border-2 border-dashed border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 group relative overflow-hidden"
              >
                {/* 背景装饰 */}
                <div className={`absolute inset-0 ${action.color} opacity-0 group-hover:opacity-5 transition-opacity`} />
                
                <div className={`p-3 rounded-full ${action.color} text-white mb-3 group-hover:scale-110 transition-transform shadow-md`}>
                  <Icon className="h-6 w-6" />
                </div>
                <span className="font-medium text-gray-900 group-hover:text-blue-700 transition-colors relative z-10">
                  {action.label}
                </span>
                <span className="text-sm text-gray-600 mt-1 group-hover:text-gray-700 transition-colors relative z-10">
                  {action.description}
                </span>
                
                {/* 箭头指示器 */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

export default QuickActions
