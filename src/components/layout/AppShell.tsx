'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Users, Calendar, Stethoscope,
  CreditCard, Menu, Sun, Moon, LogOut, ChevronRight,
  Activity, ShieldCheck,
} from 'lucide-react'
import { cn, getInitials } from '@/lib/utils'
import { NotificationBell } from '@/components/ui/NotificationBell'
import { useAuthStore } from '@/store/auth'
import { useUIStore } from '@/store/ui'
import { authService } from '@/services/auth'
import { toast } from '@/hooks/useToast'
import { Button } from '@/components/ui/button'

// Definição dos itens de navegação com controlo de acesso por papel
const ALL_NAV_ITEMS = [
  {
    href: '/dashboard',
    icon: LayoutDashboard,
    label: 'Dashboard',
    roles: ['admin', 'medico', 'recepcao'], // todos vêem
  },
  {
    href: '/patients',
    icon: Users,
    label: 'Pacientes',
    roles: ['admin', 'recepcao'], // médico NÃO vê
  },
  {
    href: '/appointments',
    icon: Calendar,
    label: 'Agendamentos',
    roles: ['admin', 'medico', 'recepcao'], // todos vêem
  },
  {
    href: '/services',
    icon: Stethoscope,
    label: 'Serviços',
    roles: ['admin', 'medico'], // recepção NÃO vê
  },
  {
    href: '/financial',
    icon: CreditCard,
    label: 'Financeiro',
    roles: ['admin', 'recepcao'], // médico NÃO vê
  },
  {
    href: '/admin/users',
    icon: ShieldCheck,
    label: 'Utilizadores',
    roles: ['admin'], // só admin vê
  },
]

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  medico: 'Médico',
  recepcao: 'Recepção',
}

function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user } = useAuthStore()
  const { sidebarOpen, toggleSidebar, theme, toggleTheme } = useUIStore()

  // Filtrar itens visíveis para o papel actual
  const navItems = ALL_NAV_ITEMS.filter(item =>
    user?.role && item.roles.includes(user.role)
  )

  async function handleLogout() {
    try {
      await authService.signOut()
      router.replace('/login')
    } catch {
      toast({ title: 'Erro ao sair', variant: 'destructive' })
    }
  }

  return (
    <>
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={toggleSidebar} />
      )}
      <aside
        style={{ backgroundColor: 'hsl(var(--sidebar))', color: 'hsl(var(--sidebar-foreground))' }}
        className={cn(
          'fixed left-0 top-0 z-50 flex h-full flex-col transition-all duration-300 ease-in-out lg:static lg:z-auto',
          sidebarOpen ? 'w-64' : 'w-0 lg:w-16 overflow-hidden'
        )}
      >
        {/* Logo */}
        <div
          style={{ borderBottomColor: 'hsl(var(--sidebar-border))' }}
          className="flex h-16 items-center justify-between px-4 border-b"
        >
          {sidebarOpen ? (
            <div className="flex items-center gap-2 animate-fade-in">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Activity className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold text-lg tracking-tight">ClinicaGest</span>
            </div>
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary mx-auto">
              <Activity className="h-4 w-4 text-white" />
            </div>
          )}
        </div>

        {/* Role badge — visível quando sidebar aberta */}
        {sidebarOpen && user && (
          <div className="px-4 pt-3 pb-1">
            <span className={cn(
              'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
              user.role === 'admin'    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' :
              user.role === 'medico'   ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                                         'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300'
            )}>
              {ROLE_LABELS[user.role] ?? user.role}
            </span>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto scrollbar-thin py-3 px-2">
          <ul className="space-y-1">
            {navItems.map(({ href, icon: Icon, label }) => {
              const active = pathname.startsWith(href)
              return (
                <li key={href}>
                  <Link
                    href={href}
                    style={active ? {
                      backgroundColor: 'hsl(var(--sidebar-accent))',
                      color: 'hsl(var(--sidebar-accent-foreground))',
                    } : {}}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150',
                      active ? '' : 'opacity-70 hover:opacity-100'
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
        <div style={{ borderTopColor: 'hsl(var(--sidebar-border))' }} className="border-t p-3 space-y-2">
          <button
            onClick={toggleTheme}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm opacity-70 hover:opacity-100 transition-opacity"
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
                <p className="text-xs opacity-50">{ROLE_LABELS[user.role] ?? user.role}</p>
              </div>
            </div>
          )}

          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm opacity-70 hover:text-red-400 hover:opacity-100 transition-colors"
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

function TopBar() {
  const { toggleSidebar } = useUIStore()
  const { user } = useAuthStore()

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/95 backdrop-blur px-4 lg:px-6">
      <Button variant="ghost" size="icon" onClick={toggleSidebar} className="shrink-0">
        <Menu className="h-5 w-5" />
      </Button>
      <div className="flex-1" />
      <div className="flex items-center gap-2">
        <NotificationBell />
        {user && (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-primary text-xs font-bold cursor-pointer">
            {getInitials(user.full_name)}
          </div>
        )}
      </div>
    </header>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <TopBar />
        <main className="flex-1 overflow-y-auto scrollbar-thin p-4 lg:p-6">
          <div className="animate-fade-in">{children}</div>
        </main>
      </div>
    </div>
  )
}
