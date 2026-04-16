import { FC } from 'react'
import { Users, Plus, Mail, Phone, MapPin } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const Team: FC = () => {
  const teamMembers = [
    { id: 1, name: '张三', role: '产品经理', email: 'zhangsan@example.com', phone: '138-0000-0001', avatar: '张', status: 'online' },
    { id: 2, name: '李四', role: '开发工程师', email: 'lisi@example.com', phone: '138-0000-0002', avatar: '李', status: 'online' },
    { id: 3, name: '王五', role: '设计师', email: 'wangwu@example.com', phone: '138-0000-0003', avatar: '王', status: 'away' },
    { id: 4, name: '赵六', role: '测试工程师', email: 'zhaoliu@example.com', phone: '138-0000-0004', avatar: '赵', status: 'offline' },
  ]

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">团队协作</h1>
          <p className="text-gray-600 mt-2">管理团队成员和协作任务</p>
        </div>
        <Button className="btn-primary">
          <Plus className="h-5 w-5 mr-2" />
          添加成员
        </Button>
      </div>

      {/* 团队统计 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">团队成员</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{teamMembers.length}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-100">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">在线成员</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {teamMembers.filter(m => m.status === 'online').length}
                </p>
              </div>
              <div className="p-3 rounded-full bg-green-100">
                <div className="h-6 w-6 bg-green-500 rounded-full" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">进行中任务</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">12</p>
              </div>
              <div className="p-3 rounded-full bg-purple-100">
                <div className="h-6 w-6 bg-purple-500 rounded-full" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">已完成</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">45</p>
              </div>
              <div className="p-3 rounded-full bg-orange-100">
                <div className="h-6 w-6 bg-orange-500 rounded-full" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 成员列表 */}
      <Card>
        <CardHeader>
          <CardTitle>团队成员</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {teamMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
              >
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <div className="w-12 h-12 bg-primary-500 rounded-full flex items-center justify-center text-white font-semibold">
                      {member.avatar}
                    </div>
                    <div
                      className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${
                        member.status === 'online'
                          ? 'bg-green-500'
                          : member.status === 'away'
                          ? 'bg-yellow-500'
                          : 'bg-gray-400'
                      }`}
                    />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{member.name}</h3>
                    <p className="text-sm text-gray-600">{member.role}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-6">
                  <div className="flex items-center text-sm text-gray-600">
                    <Mail className="h-4 w-4 mr-2" />
                    <span className="hidden lg:inline">{member.email}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Phone className="h-4 w-4 mr-2" />
                    <span className="hidden lg:inline">{member.phone}</span>
                  </div>
                  <Button variant="ghost" size="sm">
                    编辑
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default Team
