import { FC, useEffect } from 'react'
import { Card, CardContent } from './ui/card'
import { useDashboardStore } from '../store/dashboard-store'
import { FileText, TrendingUp, Palette, BarChart3, RefreshCw, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface KPIData {
  title: string
  value: number
  icon: any
  color: string
  description: string
  trend?: {
    value: number
    isPositive: boolean
    label: string
  }
  path?: string
}

const DashboardKPICards: FC = () => {
  const { stats, calculateStats, isLoading } = useDashboardStore()
  const navigate = useNavigate()

  useEffect(() => {
    calculateStats()
  }, [])

  // 生成趋势数据（实际应用中应从API获取）
  const kpis: KPIData[] = [
    {
      title: '待处理需求',
      value: stats.pendingRequirements,
      icon: FileText,
      color: 'text-blue-600',
      description: '待处理的需求总数',
      trend: {
        value: Math.floor(Math.random() * 20) + 5,
        isPositive: false,
        label: '较上周'
      },
      path: '/requirements'
    },
    {
      title: '进行中项目',
      value: stats.activeProjects,
      icon: TrendingUp,
      color: 'text-green-600',
      description: '当前进行中的项目',
      trend: {
        value: Math.floor(Math.random() * 10) + 2,
        isPositive: true,
        label: '较上周'
      },
      path: '/projects'
    },
    {
      title: '原型设计',
      value: stats.prototypes,
      icon: Palette,
      color: 'text-purple-600',
      description: '已创建的原型数量',
      trend: {
        value: Math.floor(Math.random() * 5) + 1,
        isPositive: true,
        label: '较上周'
      },
      path: '/prototype/ai'
    },
    {
      title: '分析报告',
      value: stats.reports,
      icon: BarChart3,
      color: 'text-orange-600',
      description: '生成的分析报告',
      trend: {
        value: Math.floor(Math.random() * 3) + 1,
        isPositive: true,
        label: '较上周'
      },
      path: '/analysis'
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {kpis.map((kpi, index) => {
        const Icon = kpi.icon
        return (
          <Card
            key={index}
            className={`hover:shadow-lg transition-all duration-200 cursor-pointer group ${kpi.path ? 'hover:-translate-y-1' : ''} bg-white hover:bg-gray-50`}
            onClick={() => kpi.path && navigate(kpi.path)}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <p className="text-sm font-medium text-gray-600">{kpi.title}</p>
                    {isLoading && (
                      <RefreshCw className="h-3 w-3 text-gray-400 animate-spin" />
                    )}
                  </div>
                  <p className="text-3xl font-bold text-gray-900 mt-2 group-hover:text-blue-600 transition-colors">
                    {kpi.value}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{kpi.description}</p>
                </div>
                <div className={`p-3 rounded-full ${kpi.color.replace('text', 'bg')} bg-opacity-10 group-hover:scale-110 transition-transform`}>
                  <Icon className={`h-6 w-6 ${kpi.color}`} />
                </div>
              </div>
              
              {/* 趋势指示器 */}
              {kpi.trend && (
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center">
                    {kpi.trend.isPositive ? (
                      <ArrowUpRight className="h-4 w-4 text-green-500 mr-1" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4 text-red-500 mr-1" />
                    )}
                    <span className={`text-sm font-medium ${
                      kpi.trend.isPositive ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {kpi.trend.isPositive ? '+' : '-'}{kpi.trend.value}%
                    </span>
                    <span className="text-gray-500 text-sm ml-2">{kpi.trend.label}</span>
                  </div>
                  {kpi.path && (
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

export default DashboardKPICards
