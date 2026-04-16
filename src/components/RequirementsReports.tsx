import { useState, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { BarChart3, PieChart, TrendingUp, Users, Clock, CheckCircle } from 'lucide-react'
import { Requirement } from '@/store/requirements-store'
import { useRequirementsStore } from '@/store/requirements-store'

interface RequirementsReportsProps {
  requirements: Requirement[]
}

const RequirementsReports = ({ requirements }: RequirementsReportsProps) => {
  const [activeChart, setActiveChart] = useState<'status' | 'priority' | 'type' | 'assignee' | 'trend'>('status')
  const [chartType, setChartType] = useState<'bar' | 'pie'>('bar')

  // 统计数据
  const stats = useMemo(() => {
    // 按状态统计
    const statusStats = {
      todo: requirements.filter(r => r.status === 'todo').length,
      'in-progress': requirements.filter(r => r.status === 'in-progress').length,
      done: requirements.filter(r => r.status === 'done').length,
      blocked: requirements.filter(r => r.status === 'blocked').length
    }

    // 按优先级统计
    const priorityStats = {
      critical: requirements.filter(r => r.priority === 'critical').length,
      high: requirements.filter(r => r.priority === 'high').length,
      medium: requirements.filter(r => r.priority === 'medium').length,
      low: requirements.filter(r => r.priority === 'low').length
    }

    // 按类型统计
    const typeStats = {
      feature: requirements.filter(r => r.type === 'feature').length,
      bug: requirements.filter(r => r.type === 'bug').length,
      improvement: requirements.filter(r => r.type === 'improvement').length,
      task: requirements.filter(r => r.type === 'task').length
    }

    // 按指派人统计
    const assigneeStats: Record<string, number> = {}
    requirements.forEach(req => {
      const assigneeName = typeof req.assignee === 'object'
        ? req.assignee?.username || '未指派'
        : req.assignee || '未指派'
      assigneeStats[assigneeName] = (assigneeStats[assigneeName] || 0) + 1
    })

    // 工时统计
    const hoursStats = {
      estimated: requirements.reduce((sum, r) => sum + (r.estimatedHours || 0), 0),
      actual: requirements.reduce((sum, r) => sum + (r.actualHours || 0), 0)
    }

    return {
      statusStats,
      priorityStats,
      typeStats,
      assigneeStats,
      hoursStats,
      total: requirements.length
    }
  }, [requirements])

  // 渲染状态图表
  const renderStatusChart = () => {
      const statusConfig = {
        todo: { label: '待处理', color: 'bg-slate-400' },
        'in-progress': { label: '进行中', color: 'bg-blue-500' },
        done: { label: '已完成', color: 'bg-green-500' },
        blocked: { label: '已阻塞', color: 'bg-red-500' }
      }

      const data = [
        { label: '待处理', value: stats.statusStats.todo, color: 'bg-slate-400' },
        { label: '进行中', value: stats.statusStats['in-progress'], color: 'bg-blue-500' },
        { label: '已完成', value: stats.statusStats.done, color: 'bg-green-500' },
        { label: '已阻塞', value: stats.statusStats.blocked, color: 'bg-red-500' }
      ].filter(d => d.value > 0)

    const max = Math.max(...data.map(d => d.value))

    return (
      <Card className="border border-gray-200/60 shadow-sm hover:shadow-md transition-shadow duration-300">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-5 flex items-center text-gray-800">
            <BarChart3 className="h-5 w-5 mr-2 text-blue-500" />
            按状态统计
          </h3>
          {chartType === 'bar' ? (
            <div className="space-y-4">
              {data.map((item) => (
                <div key={item.label}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">{item.label}</span>
                    <span className="text-sm font-bold text-gray-800">{item.value}</span>
                  </div>
                  <div className="h-7 bg-gray-100 rounded-full overflow-hidden shadow-inner">
                    <div
                      className={`h-full ${item.color} transition-all duration-500 ease-out shadow-sm`}
                      style={{ width: `${(item.value / max) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-6">
              {data.map((item) => (
                <div key={item.label} className="text-center">
                  <div
                    className={`w-24 h-24 mx-auto rounded-full ${item.color} flex items-center justify-center shadow-lg hover:scale-105 transition-transform duration-300`}
                    style={{ width: `${150 + item.value * 10}px`, height: `${150 + item.value * 10}px` }}
                  >
                    <div className="text-white">
                      <div className="text-3xl font-bold">{item.value}</div>
                      <div className="text-sm font-medium">{item.label}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  // 渲染优先级图表
  const renderPriorityChart = () => {
    const data = [
      { label: '紧急', value: stats.priorityStats.critical, color: 'bg-red-500' },
      { label: '高', value: stats.priorityStats.high, color: 'bg-orange-500' },
      { label: '中', value: stats.priorityStats.medium, color: 'bg-yellow-500' },
      { label: '低', value: stats.priorityStats.low, color: 'bg-green-500' }
    ].filter(d => d.value > 0)

    const max = Math.max(...data.map(d => d.value))

    return (
      <Card className="border border-gray-200/60 shadow-sm hover:shadow-md transition-shadow duration-300">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-5 flex items-center text-gray-800">
            <TrendingUp className="h-5 w-5 mr-2 text-orange-500" />
            按优先级统计
          </h3>
          {chartType === 'bar' ? (
            <div className="space-y-4">
              {data.map((item) => (
                <div key={item.label}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">{item.label}</span>
                    <span className="text-sm font-bold text-gray-800">{item.value}</span>
                  </div>
                  <div className="h-7 bg-gray-100 rounded-full overflow-hidden shadow-inner">
                    <div
                      className={`h-full ${item.color} transition-all duration-500 ease-out shadow-sm`}
                      style={{ width: `${(item.value / max) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-6">
              {data.map((item) => (
                <div key={item.label} className="text-center">
                  <div
                    className={`w-24 h-24 mx-auto rounded-full ${item.color} flex items-center justify-center shadow-lg hover:scale-105 transition-transform duration-300`}
                    style={{ width: `${120 + item.value * 15}px`, height: `${120 + item.value * 15}px` }}
                  >
                    <div className="text-white">
                      <div className="text-3xl font-bold">{item.value}</div>
                      <div className="text-sm font-medium">{item.label}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  // 渲染类型图表
  const renderTypeChart = () => {
    const typeInfo: Record<string, { label: string; icon: string; color: string }> = {
      feature: { label: '功能', icon: '⚡', color: 'bg-blue-500' },
      bug: { label: '缺陷', icon: '🐛', color: 'bg-red-500' },
      improvement: { label: '改进', icon: '📈', color: 'bg-green-500' },
      task: { label: '任务', icon: '✅', color: 'bg-violet-500' }
    }

    const data = [
      { key: 'feature', value: stats.typeStats.feature },
      { key: 'bug', value: stats.typeStats.bug },
      { key: 'improvement', value: stats.typeStats.improvement },
      { key: 'task', value: stats.typeStats.task }
    ].filter(d => d.value > 0)

    const max = Math.max(...data.map(d => d.value))

    return (
      <Card className="border border-gray-200/60 shadow-sm hover:shadow-md transition-shadow duration-300">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-5 flex items-center text-gray-800">
            <BarChart3 className="h-5 w-5 mr-2 text-indigo-500" />
            按类型统计
          </h3>
          {chartType === 'bar' ? (
            <div className="space-y-4">
              {data.map((item) => {
                const info = typeInfo[item.key]
                return (
                  <div key={item.key}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700 flex items-center">
                        <span className="mr-2 text-base">{info.icon}</span>
                        {info.label}
                      </span>
                      <span className="text-sm font-bold text-gray-800">{item.value}</span>
                    </div>
                    <div className="h-7 bg-gray-100 rounded-full overflow-hidden shadow-inner">
                      <div
                        className={`h-full ${info.color} transition-all duration-500 ease-out shadow-sm`}
                        style={{ width: `${(item.value / max) * 100}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-6">
              {data.map((item) => {
                const info = typeInfo[item.key]
                return (
                  <div key={item.key} className="text-center">
                    <div
                      className={`w-24 h-24 mx-auto rounded-full ${info.color} flex items-center justify-center shadow-lg hover:scale-105 transition-transform duration-300`}
                      style={{ width: `${150 + item.value * 10}px`, height: `${150 + item.value * 10}px` }}
                    >
                      <div className="text-white">
                        <div className="text-4xl">{info.icon}</div>
                        <div className="text-2xl font-bold">{item.value}</div>
                        <div className="text-sm font-medium">{info.label}</div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  // 渲染指派人图表
  const renderAssigneeChart = () => {
    const data = Object.entries(stats.assigneeStats)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)

    const max = Math.max(...Object.values(stats.assigneeStats))

    return (
      <Card className="border border-gray-200/60 shadow-sm hover:shadow-md transition-shadow duration-300">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-5 flex items-center text-gray-800">
            <Users className="h-5 w-5 mr-2 text-purple-500" />
            按指派人统计（Top 10）
          </h3>
          <div className="space-y-4">
            {data.map(([name, count]) => (
              <div key={name}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">{name}</span>
                  <span className="text-sm font-bold text-gray-800">{count}</span>
                </div>
                <div className="h-7 bg-gray-100 rounded-full overflow-hidden shadow-inner">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500 ease-out shadow-sm"
                    style={{ width: `${(count / max) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  // 渲染趋势图表（模拟数据）
  const renderTrendChart = () => {
    // 使用最近7天的数据（模拟）
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - (6 - i))
      return date.toLocaleDateString('zh-CN')
    })

    const trendData = last7Days.map((date, i) => {
      // 模拟：基于总需求数的随机分配
      const baseCount = Math.floor(stats.total / 7)
      const variance = Math.floor(Math.random() * (baseCount * 0.5))
      return {
        date,
        completed: Math.floor(baseCount * 0.3 + variance * 0.3),
        created: Math.floor(baseCount + variance * 0.7)
      }
    })

    const maxCreated = Math.max(...trendData.map(d => d.created))

    return (
      <Card className="border border-gray-200/60 shadow-sm hover:shadow-md transition-shadow duration-300">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-5 flex items-center text-gray-800">
            <TrendingUp className="h-5 w-5 mr-2 text-cyan-500" />
            最近7天趋势
          </h3>
          <div className="space-y-5">
            {trendData.map((item) => (
              <div key={item.date}>
                <div className="mb-2">
                  <span className="text-sm font-medium text-gray-600">{item.date}</span>
                </div>
                <div className="space-y-2.5">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium flex items-center text-gray-700">
                        <CheckCircle className="h-3.5 w-3.5 mr-1.5 text-green-500" />
                        完成数
                      </span>
                      <span className="text-sm font-bold text-green-600">{item.completed}</span>
                    </div>
                    <div className="h-5 bg-gray-100 rounded-full overflow-hidden shadow-inner">
                      <div
                        className="h-full bg-gradient-to-r from-green-400 to-emerald-400 transition-all duration-500 ease-out shadow-sm"
                        style={{ width: `${Math.min(100, (item.completed / Math.max(1, ...trendData.map(d => d.completed))) * 100)}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium flex items-center text-gray-700">
                        <TrendingUp className="h-3.5 w-3.5 mr-1.5 text-blue-500" />
                        创建数
                      </span>
                      <span className="text-sm font-bold text-blue-600">{item.created}</span>
                    </div>
                    <div className="h-5 bg-gray-100 rounded-full overflow-hidden shadow-inner">
                      <div
                        className="h-full bg-gradient-to-r from-blue-400 to-indigo-400 transition-all duration-500 ease-out shadow-sm"
                        style={{ width: `${(item.created / maxCreated) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  // 渲染工时统计
  const renderHoursChart = () => {
    const data = [
      { label: '预估工时', value: stats.hoursStats.estimated, color: 'bg-blue-400' },
      { label: '实际工时', value: stats.hoursStats.actual, color: 'bg-green-400' }
    ]

    const max = Math.max(...data.map(d => d.value), 1)

    return (
      <Card className="border border-gray-200/60 shadow-sm hover:shadow-md transition-shadow duration-300">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-5 flex items-center text-gray-800">
            <Clock className="h-5 w-5 mr-2 text-amber-500" />
            工时统计
          </h3>
          <div className="space-y-4">
            {data.map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">{item.label}</span>
                  <span className="text-sm font-bold text-gray-800">{item.value} 小时</span>
                </div>
                <div className="h-9 bg-gray-100 rounded-full overflow-hidden shadow-inner">
                  <div
                    className={`h-full ${item.color} transition-all duration-500 ease-out shadow-sm`}
                    style={{ width: `${(item.value / max) * 100}%` }}
                  />
                </div>
              </div>
            ))}
            <div className="mt-5 p-4 bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl border border-gray-200/50">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">工时偏差</span>
                <span className={`text-sm font-bold ${stats.hoursStats.actual > stats.hoursStats.estimated ? 'text-red-600' : 'text-green-600'}`}>
                  {stats.hoursStats.estimated > 0
                    ? `${((stats.hoursStats.actual - stats.hoursStats.estimated) / stats.hoursStats.estimated * 100).toFixed(1)}%`
                    : '0%'}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* 概览卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-6">
        <Card className="border border-gray-200/60 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden">
          <CardContent className="p-6 bg-gradient-to-br from-white to-blue-50/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">总需求</p>
                <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200/60 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden">
          <CardContent className="p-6 bg-gradient-to-br from-white to-green-50/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">已完成</p>
                <p className="text-3xl font-bold text-green-600">{stats.statusStats.done}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200/60 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden">
          <CardContent className="p-6 bg-gradient-to-br from-white to-blue-50/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">进行中</p>
                <p className="text-3xl font-bold text-blue-600">{stats.statusStats['in-progress']}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200/60 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden">
          <CardContent className="p-6 bg-gradient-to-br from-white to-slate-50/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">待处理</p>
                <p className="text-3xl font-bold text-gray-600">{stats.statusStats.todo}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-slate-400 to-gray-500 rounded-xl flex items-center justify-center shadow-lg">
                <Clock className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 图表类型切换 */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-bold text-gray-900">统计分析</h2>
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-600">图表类型:</span>
          <div className="flex space-x-2">
            <Button
              size="sm"
              variant={chartType === 'bar' ? 'default' : 'outline'}
              onClick={() => setChartType('bar')}
              className={chartType === 'bar' ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white border-0 shadow-md' : 'border-gray-300'}
            >
              柱状图
            </Button>
            <Button
              size="sm"
              variant={chartType === 'pie' ? 'default' : 'outline'}
              onClick={() => setChartType('pie')}
              className={chartType === 'pie' ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white border-0 shadow-md' : 'border-gray-300'}
            >
              饼图
            </Button>
          </div>
        </div>
      </div>

      {/* 统计维度标签 */}
      <div className="flex space-x-2 mb-6 overflow-x-auto pb-2">
        {[
          { id: 'status', label: '状态', icon: BarChart3, color: 'bg-blue-500 text-white' },
          { id: 'priority', label: '优先级', icon: TrendingUp, color: 'bg-orange-500 text-white' },
          { id: 'type', label: '类型', icon: PieChart, color: 'bg-violet-500 text-white' },
          { id: 'assignee', label: '指派人', icon: Users, color: 'bg-pink-100 text-pink-700' },
          { id: 'trend', label: '趋势', icon: TrendingUp, color: 'bg-cyan-500 text-white' }
        ].map((tab) => (
          <Button
            key={tab.id}
            size="sm"
            variant={activeChart === tab.id ? 'default' : 'outline'}
            onClick={() => setActiveChart(tab.id as any)}
            className={activeChart === tab.id ? `bg-gradient-to-r ${tab.color} text-white border-0 shadow-md` : 'border-gray-300'}
          >
            <tab.icon className="h-4 w-4 mr-2" />
            {tab.label}
          </Button>
        ))}
      </div>

      {/* 图表区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {activeChart === 'status' && renderStatusChart()}
        {activeChart === 'priority' && renderPriorityChart()}
        {activeChart === 'type' && renderTypeChart()}
        {activeChart === 'assignee' && renderAssigneeChart()}
        {activeChart === 'trend' && renderTrendChart()}
      </div>

      {/* 工时统计（固定显示） */}
      <div className="mt-6">
        {renderHoursChart()}
      </div>
    </div>
  )
}

export default RequirementsReports
