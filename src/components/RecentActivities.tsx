import { FC, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { useDashboardStore, RecentActivity } from '../store/dashboard-store'
import { Users, RefreshCw, FileText, FolderOpen, Palette, BarChart3 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

// 获取活动类型对应的图标
const getActivityIcon = (type?: RecentActivity['type']) => {
  switch (type) {
    case 'requirement':
      return FileText
    case 'project':
      return FolderOpen
    case 'prd':
      return FileText
    case 'prototype':
      return Palette
    case 'analysis':
      return BarChart3
    default:
      return FileText
  }
}

// 获取活动类型对应的颜色
const getActivityColor = (type?: RecentActivity['type']) => {
  switch (type) {
    case 'requirement':
      return 'bg-blue-100 text-blue-600'
    case 'project':
      return 'bg-green-100 text-green-600'
    case 'prd':
      return 'bg-purple-100 text-purple-600'
    case 'prototype':
      return 'bg-pink-100 text-pink-600'
    case 'analysis':
      return 'bg-orange-100 text-orange-600'
    default:
      return 'bg-gray-100 text-gray-600'
  }
}

const RecentActivities: FC = () => {
  const { recentActivities, loadRecentActivities, isLoading } = useDashboardStore()
  const navigate = useNavigate()

  useEffect(() => {
    loadRecentActivities()
  }, [])

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>最近活动</span>
          </CardTitle>
          <button
            onClick={loadRecentActivities}
            disabled={isLoading}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            title="刷新活动记录"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recentActivities.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <div className="flex justify-center mb-4">
                <Users className="h-16 w-16 text-gray-300" />
              </div>
              <p className="text-lg font-medium">暂无活动记录</p>
              <p className="text-sm mt-2">团队活动将在这里显示</p>
            </div>
          ) : (
            recentActivities.map((activity) => {
              const Icon = getActivityIcon(activity.type)
              return (
                <div
                  key={activity.id}
                  className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer group"
                  onClick={() => {
                    // 点击活动可以跳转到相应页面
                    if (activity.type === 'requirement') {
                      navigate('/requirements')
                    } else if (activity.type === 'project') {
                      navigate('/projects')
                    } else if (activity.type === 'prd') {
                      navigate('/prd')
                    } else if (activity.type === 'prototype') {
                      navigate('/prototype/ai')
                    } else if (activity.type === 'analysis') {
                      navigate('/analysis')
                    }
                  }}
                >
                  {/* 用户头像或首字母 */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${getActivityColor(activity.type)}`}>
                    <span className="font-medium text-sm">
                      {activity.user.charAt(0)}
                    </span>
                  </div>
                  
                  {/* 活动内容 */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 group-hover:text-blue-600 transition-colors">
                      <span className="font-medium">{activity.user}</span> {activity.action}
                      <span className="font-medium"> {activity.target}</span>
                    </p>
                    <p className="text-sm text-gray-500 mt-1">{activity.time}</p>
                  </div>
                  
                  {/* 活动类型图标 */}
                  <div className={`p-2 rounded-full ${getActivityColor(activity.type)} opacity-0 group-hover:opacity-100 transition-opacity`}>
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
              )
            })
          )}
        </div>
        
        {/* 查看更多链接 */}
        {recentActivities.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <button
              onClick={() => navigate('/projects')}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center space-x-1"
            >
              <span>查看所有活动</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default RecentActivities
