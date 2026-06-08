import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { hasPermission } from '@/lib/permissions'
import { Skeleton } from '@/components/ui/index'
import type { UserRole } from '@/types'

interface ProtectedRouteProps {
  requiredRoles?: UserRole[]
  requiredPermission?: string
  fallback?: React.ReactNode
}

export function RoleProtectedRoute({ requiredRoles, requiredPermission, fallback }: ProtectedRouteProps) {
  const { user, isLoading } = useAuthStore()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="space-y-3 w-64">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" state={{ from: location }} replace />

  // Verificar roles se especificados
  if (requiredRoles && !requiredRoles.includes(user.role)) {
    return fallback || (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Acesso Negado</h1>
          <p className="text-muted-foreground">
            Você não tem permissão para acessar esta página.
          </p>
          <a href="/dashboard" className="text-primary hover:underline">
            Voltar ao Dashboard
          </a>
        </div>
      </div>
    )
  }

  // Verificar permissão específica se especificada
  if (requiredPermission && !hasPermission(user.role, requiredPermission)) {
    return fallback || (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Acesso Negado</h1>
          <p className="text-muted-foreground">
            Você não tem a permissão necessária para acessar esta página.
          </p>
          <a href="/dashboard" className="text-primary hover:underline">
            Voltar ao Dashboard
          </a>
        </div>
      </div>
    )
  }

  return <Outlet />
}
