import { FC, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { useDashboardStore } from '../store/dashboard-store'
import { TrendingUp, RefreshCw, ExternalLink, FolderOpen } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const ProjectProgress: FC = () => {
  const { projectProgress, loadProjectProgress, isLoading } = useDashboardStore()
  const navigate = useNavigate()

  useEffect(() => {
    loadProjectProgress()
  }, [])

  const getStatusText = (status: string) => {
    return status
  }

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      '规划中': 'bg-gray-500',
      '进行中': 'bg-blue-500',
      '测试中': 'bg-yellow-500',
      '已完成': 'bg-green-500',
      '已归档': 'bg-gray-400'
    }
    return colorMap[status] || 'bg-gray-500'
  }

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'bg-green-500'
    if (progress >= 60) return 'bg-blue-500'
    if (progress >= 40) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>项目进度</span>
          </CardTitle>
          <button
            onClick={loadProjectProgress}
            disabled={isLoading}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            title="刷新项目进度"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </CardHeader>
      <CardContent>
        {projectProgress.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <div className="flex justify-center mb-4">
              <FolderOpen className="h-16 w-16 text-gray-300" />
            </div>
            <p className="text-lg font-medium">暂无项目数据</p>
            <p className="text-sm mt-2">您可以创建新项目或刷新数据</p>
            <button
              onClick={() => navigate('/projects/create')}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              创建新项目
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-5">
              {projectProgress.map((project) => (
                <div
                  key={project.id}
                  className="group"
                >
                  {/* 项目信息 */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors cursor-pointer">
                          {project.name}
                        </h3>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(project.status)} text-white`}>
                          {getStatusText(project.status)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className={`text-sm font-semibold ${project.progress >= 80 ? 'text-green-600' : project.progress >= 60 ? 'text-blue-600' : project.progress >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {project.progress}%
                      </span>
                      <button
                        onClick={() => navigate(`/projects/${project.id}`)}
                        className="p-1 hover:bg-gray-100 rounded transition-colors opacity-0 group-hover:opacity-100"
                        title="查看项目详情"
                      >
                        <ExternalLink className="h-4 w-4 text-gray-500" />
                      </button>
                    </div>
                  </div>

                  {/* 进度条 */}
                  <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-2.5 rounded-full transition-all duration-500 ease-out ${getProgressColor(project.progress)}`}
                      style={{ width: `${project.progress}%` }}
                    ></div>
                  </div>

                  {/* 额外信息 */}
                  <div className="flex items-center justify-between mt-1 text-xs text-gray-500">
                    <span>更新时间: {new Date().toLocaleDateString()}</span>
                    <span className={project.progress >= 80 ? 'text-green-600' : ''}>
                      {project.progress >= 80 ? '即将完成' : project.progress >= 50 ? '正常推进' : '需要关注'}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* 查看所有项目链接 */}
            <div className="mt-6 pt-4 border-t border-gray-100">
              <button
                onClick={() => navigate('/projects')}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center space-x-1"
              >
                <span>查看所有项目</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

export default ProjectProgress
