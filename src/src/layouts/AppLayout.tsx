import { Outlet } from 'react-router-dom'
import { Sidebar, TopBar } from '@/components/layout/Sidebar'
import { useUIStore } from '@/store/ui'
import { cn } from '@/utils'

export function AppLayout() {
  const { sidebarOpen } = useUIStore()

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className={cn(
        'flex flex-1 flex-col overflow-hidden transition-all duration-300',
        'min-w-0'
      )}>
        <TopBar />
        <main className="flex-1 overflow-y-auto scrollbar-thin p-4 lg:p-6">
          <div className="animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
