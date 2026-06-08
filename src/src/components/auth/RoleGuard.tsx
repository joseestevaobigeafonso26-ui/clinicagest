'use client'

import React from 'react'
import { usePermissions } from '@/hooks/usePermissions'

interface RoleGuardProps {
  children: React.ReactNode
  requires: string | string[]
  type?: 'all' | 'any'
  fallback?: React.ReactNode
}

/**
 * Componente que renderiza conteúdo apenas se o utilizador tem a(s) permissão(ões) necessária(s)
 * 
 * @param requires - String ou array de permissões necessárias
 * @param type - 'all' (AND) ou 'any' (OR) - por defeito 'all'
 * @param fallback - Componente a renderizar se acesso negado
 */
export function RoleGuard({ children, requires, type = 'all', fallback = null }: RoleGuardProps) {
  const { can, canAll, canAny } = usePermissions()

  const hasAccess = typeof requires === 'string'
    ? can(requires)
    : type === 'all'
      ? canAll(requires)
      : canAny(requires)

  return hasAccess ? <>{children}</> : <>{fallback}</>
}

interface ProtectedFeatureProps {
  children: React.ReactNode
  permission: string | string[]
  type?: 'all' | 'any'
  show?: boolean
  className?: string
}

/**
 * Componente que mostra/esconde elementos baseado em permissões
 * Útil para ocultar botões, formulários, etc
 */
export function ProtectedFeature({ 
  children, 
  permission, 
  type = 'all',
  show = true,
  className 
}: ProtectedFeatureProps) {
  const { canAll, canAny } = usePermissions()

  const hasAccess = Array.isArray(permission)
    ? type === 'all'
      ? canAll(permission)
      : canAny(permission)
    : false

  if (!show || !hasAccess) return null

  return <div className={className}>{children}</div>
}

interface RoleBasedProps {
  children: React.ReactNode
  role: string | string[]
  fallback?: React.ReactNode
}

/**
 * Componente simples para proteger conteúdo por role
 */
export function RoleBasedView({ children, role, fallback = null }: RoleBasedProps) {
  const { isRole } = usePermissions()

  return isRole(role) ? <>{children}</> : <>{fallback}</>
}

/**
 * Hook alternativo para verificar acesso a permissões
 */
export function useCanAccess(permission: string | string[], type: 'all' | 'any' = 'all'): boolean {
  const { can, canAll, canAny } = usePermissions()

  if (typeof permission === 'string') {
    return can(permission)
  }

  return type === 'all' ? canAll(permission) : canAny(permission)
}
