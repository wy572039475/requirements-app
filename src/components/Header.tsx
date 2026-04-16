import { useState } from 'react'
import { User, LogOut } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth-store'
import { Button } from './ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu'

const Header = () => {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      logout()
      navigate('/login')
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <header className="h-14 bg-[#1E293B] border-b border-[#334155] sticky top-0 z-50">
      <div className="flex items-center justify-between h-full px-4">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 bg-[#6366F1] rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xs">R</span>
          </div>
          <span className="text-sm font-semibold text-[#F8FAFC]">需求管理平台</span>
        </div>
        <div className="flex items-center space-x-2">
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-2 p-1.5 text-[#CBD5E1] hover:text-[#F8FAFC] hover:bg-[#334155]">
                  <div className="w-7 h-7 bg-[#6366F1]/20 rounded-full flex items-center justify-center">
                    <User className="h-3.5 w-3.5 text-[#6366F1]" />
                  </div>
                  <span className="text-sm font-medium">{user?.username || '用户'}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-[#1E293B] border-[#334155] text-[#CBD5E1]">
                <div className="px-2 py-1.5 text-sm font-medium text-[#94A3B8]">{user?.email}</div>
                <DropdownMenuSeparator className="bg-[#334155]" />
                <DropdownMenuItem className="focus:bg-red-500/10 text-red-400 focus:text-red-400" onClick={handleLogout} disabled={isLoggingOut}>
                  <LogOut className="h-4 w-4" />
                  <span>{isLoggingOut ? '登出中...' : '退出登录'}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  )
}

export default Header
