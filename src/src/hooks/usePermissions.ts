'use client'

import { useAuthStore } from '@/store/auth'
import { hasPermission, hasAllPermissions, hasAnyPermission } from '@/lib/permissions'

export function usePermissions() {
  const user = useAuthStore((state) => state.user)

  const can = (permission: string): boolean => {
    if (!user) return false
    return hasPermission(user.role, permission)
  }

  const canAll = (permissions: string[]): boolean => {
    if (!user) return false
    return hasAllPermissions(user.role, permissions)
  }

  const canAny = (permissions: string[]): boolean => {
    if (!user) return false
    return hasAnyPermission(user.role, permissions)
  }

  const isRole = (role: string | string[]): boolean => {
    if (!user) return false
    if (Array.isArray(role)) return role.includes(user.role)
    return user.role === role
  }

  // ← CORRIGIDO: eram funções, agora são booleanos directos
  const isAdmin       = user?.role === 'admin'
  const isDoctor      = user?.role === 'medico'
  const isReceptionist = user?.role === 'recepcao'

  return {
    user,
    can,
    canAll,
    canAny,
    isRole,
    isAdmin,
    isDoctor,
    isReceptionist,
  }
}
