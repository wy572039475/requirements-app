import { FC } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'

const DashboardSkeleton: FC = () => {
  return (
    <div className="space-y-6">
      {/* 页面标题骨架 */}
      <div className="space-y-2">
        <div className="h-10 w-48 skeleton rounded"></div>
        <div className="h-5 w-64 skeleton rounded"></div>
      </div>

      {/* KPI统计卡片骨架 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="bg-white">
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="h-4 w-24 skeleton rounded"></div>
                <div className="h-8 w-16 skeleton rounded"></div>
                <div className="h-3 w-20 skeleton rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 快捷操作和最近活动骨架 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 快捷操作骨架 */}
        <Card>
          <CardHeader>
            <div className="h-6 w-32 skeleton rounded"></div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex flex-col items-center p-4 rounded-lg border-2 border-dashed border-gray-200">
                  <div className="h-12 w-12 rounded-full skeleton"></div>
                  <div className="h-4 w-20 skeleton rounded mt-3"></div>
                  <div className="h-3 w-16 skeleton rounded mt-1"></div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 最近活动骨架 */}
        <Card>
          <CardHeader>
            <div className="h-6 w-32 skeleton rounded"></div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-start space-x-3">
                  <div className="w-10 h-10 rounded-full skeleton"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-64 skeleton rounded"></div>
                    <div className="h-3 w-24 skeleton rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 项目进度骨架 */}
      <Card>
        <CardHeader>
          <div className="h-6 w-32 skeleton rounded"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between">
                  <div className="h-5 w-40 skeleton rounded"></div>
                  <div className="h-5 w-8 skeleton rounded"></div>
                </div>
                <div className="w-full h-2 skeleton rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default DashboardSkeleton
