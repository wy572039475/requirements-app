import { Outlet } from 'react-router-dom'
import Header from './Header'

interface LayoutProps {
  children?: React.ReactNode
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="h-full bg-background flex flex-col overflow-hidden">
      <Header />
      <main className="flex-1 overflow-hidden min-h-0">
        <div className="p-4 h-full overflow-y-auto">
          {children || <Outlet />}
        </div>
      </main>
    </div>
  )
}

export default Layout
