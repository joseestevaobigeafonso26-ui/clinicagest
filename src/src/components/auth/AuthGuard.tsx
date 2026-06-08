'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Skeleton } from '@/components/ui'
import { Activity } from 'lucide-react'

interface AuthGuardProps {
  children: React.ReactNode
  requireAuth: boolean
}

export function AuthGuard({ children, requireAuth }: AuthGuardProps) {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading) {
      if (requireAuth && !user) {
        router.replace('/login')
      } else if (!requireAuth && user) {
        // Só redireciona para dashboard se a conta estiver activa
        if (user.status === 'activo') {
          router.replace('/dashboard')
        }
      }
    }
  }, [user, isLoading, requireAuth, router])

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary animate-pulse">
            <Activity className="h-6 w-6 text-white" />
          </div>
          <div className="space-y-2 text-center">
            <Skeleton className="h-3 w-32 mx-auto" />
            <Skeleton className="h-3 w-24 mx-auto" />
          </div>
        </div>
      </div>
    )
  }

  // Conta existe mas não está activa — não mostrar conteúdo protegido
  if (requireAuth && user && user.status !== 'activo') {
    return null
  }

  if (requireAuth && !user) return null
  if (!requireAuth && user && user.status === 'activo') return null

  return <>{children}</>
}
