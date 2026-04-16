import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  FolderOpen,
  FileText,
  Users,
  BarChart3,
  Sparkles
} from 'lucide-react'
import { useAppStore } from '../store/app-store'
import { cn } from '../lib/utils'

const menuItems = [
  { icon: LayoutDashboard, label: '工作台', path: '/dashboard' },
  { icon: FolderOpen, label: '项目管理', path: '/projects' },
  { icon: FileText, label: '需求管理', path: '/requirements' },
  { icon: Sparkles, label: 'AI 需求评审', path: '/requirements', tab: 'ai-review' },
  { icon: BarChart3, label: '需求报表', path: '/requirements', tab: 'reports' },
  { icon: Users, label: '团队管理', path: '/team' },
]

const Sidebar = () => {
  const { sidebarCollapsed } = useAppStore()
  const location = useLocation()

  const isActive = (item: typeof menuItems[number]) => {
    if (item.tab) {
      return location.pathname === item.path && location.search === `?tab=${item.tab}`
    }
    return location.pathname === item.path
  }

  return (
    <aside
      className={cn(
        "fixed top-14 bottom-0 z-40 transition-all duration-300",
        sidebarCollapsed ? "w-16" : "w-56",
        "bg-[#1E293B]",
        "shadow-[2px_0_8px_rgba(0,0,0,0.1)]"
      )}
    >
      <nav className="p-2.5">
        <ul className="space-y-0.5">
          {menuItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item)

            return (
              <li key={`${item.path}-${item.tab || ''}`}>
                <Link
                  to={{ pathname: item.path, search: item.tab ? `tab=${item.tab}` : undefined }}
                  className={cn(
                    "flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150",
                    active
                      ? "bg-[#334155] text-[#6366F1]"
                      : "text-[#94A3B8] hover:bg-[#334155]/50 hover:text-[#F8FAFC]"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4.5 w-4.5 transition-colors duration-150",
                      sidebarCollapsed ? "mx-auto" : "mr-2.5",
                      active ? "text-[#6366F1]" : "text-[#CBD5E1]"
                    )}
                  />
                  {!sidebarCollapsed && (
                    <span className={cn(
                      "transition-colors duration-150",
                      active ? "text-[#F8FAFC] font-medium" : "text-[#94A3B8]"
                    )}>
                      {item.label}
                    </span>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {!sidebarCollapsed && (
        <div className="absolute bottom-3 left-2.5 right-2.5">
          <p className="text-[10px] text-[#475569] text-center">
            需求管理平台 v1.0
          </p>
        </div>
      )}
    </aside>
  )
}

export default Sidebar
