import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, Calendar, Stethoscope,
  CreditCard, Menu, X, Sun, Moon, LogOut, ChevronRight,
  Bell, Settings, Activity,
} from 'lucide-react'
import { cn, getInitials } from '@/utils'
import { useAuthStore } from '@/store/auth'
import { useUIStore } from '@/store/ui'
import { authService } from '@/services/auth'
import { toast } from '@/hooks/useToast'
import { Button } from '@/components/ui/button'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/patients', icon: Users, label: 'Pacientes' },
  { to: '/appointments', icon: Calendar, label: 'Agendamentos' },
  { to: '/services', icon: Stethoscope, label: 'Serviços' },
  { to: '/financial', icon: CreditCard, label: 'Financeiro' },
]

export function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { sidebarOpen, toggleSidebar, theme, toggleTheme } = useUIStore()

  async function handleLogout() {
    try {
      await authService.signOut()
      navigate('/login')
    } catch {
      toast({ title: 'Erro ao sair', variant: 'destructive' })
    }
  }

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-50 flex h-full flex-col bg-sidebar text-sidebar-foreground transition-all duration-300 ease-in-out lg:static lg:z-auto',
          sidebarOpen ? 'w-64' : 'w-0 lg:w-16 overflow-hidden'
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-sidebar-border">
          {sidebarOpen && (
            <div className="flex items-center gap-2 animate-fade-in">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Activity className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold text-lg tracking-tight">ClinicaGest</span>
            </div>
          )}
          {!sidebarOpen && (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary mx-auto">
              <Activity className="h-4 w-4 text-white" />
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto scrollbar-thin py-4 px-2">
          <ul className="space-y-1">
            {navItems.map(({ to, icon: Icon, label }) => {
              const active = location.pathname.startsWith(to)
              return (
                <li key={to}>
                  <Link
                    to={to}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150',
                      active
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                        : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground'
                    )}
                    title={!sidebarOpen ? label : undefined}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {sidebarOpen && (
                      <span className="animate-fade-in flex-1">{label}</span>
                    )}
                    {sidebarOpen && active && (
                      <ChevronRight className="h-3 w-3 opacity-50" />
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className="border-t border-sidebar-border p-3 space-y-2">
          <button
            onClick={toggleTheme}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground transition-colors"
            title={!sidebarOpen ? 'Alternar tema' : undefined}
          >
            {theme === 'light' ? <Moon className="h-4 w-4 shrink-0" /> : <Sun className="h-4 w-4 shrink-0" />}
            {sidebarOpen && <span>{theme === 'light' ? 'Modo Escuro' : 'Modo Claro'}</span>}
          </button>

          {sidebarOpen && user && (
            <div className="flex items-center gap-3 rounded-lg px-3 py-2 animate-fade-in">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary text-xs font-bold">
                {getInitials(user.full_name)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.full_name}</p>
                <p className="text-xs text-sidebar-foreground/50 capitalize">{user.role}</p>
              </div>
            </div>
          )}

          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/70 hover:bg-red-500/10 hover:text-red-400 transition-colors"
            title={!sidebarOpen ? 'Sair' : undefined}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {sidebarOpen && <span>Sair</span>}
          </button>
        </div>
      </aside>
    </>
  )
}

export function TopBar() {
  const { toggleSidebar } = useUIStore()
  const { user } = useAuthStore()

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/95 backdrop-blur px-4 lg:px-6">
      <Button variant="ghost" size="icon" onClick={toggleSidebar} className="shrink-0">
        <Menu className="h-5 w-5" />
      </Button>

      <div className="flex-1" />

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary" />
        </Button>
        {user && (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-primary text-xs font-bold cursor-pointer">
            {getInitials(user.full_name)}
          </div>
        )}
      </div>
    </header>
  )
}
