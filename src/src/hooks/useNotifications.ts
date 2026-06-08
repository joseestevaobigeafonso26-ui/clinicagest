'use client'

import { useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { notificationsService } from '@/services/notifications'
import { useAuthStore } from '@/store/auth'
import { toast } from '@/hooks/useToast'
import type { Notification } from '@/types'

export function useNotifications() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  // Buscar todas as notificações
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationsService.getAll,
    enabled: !!user,
    refetchInterval: 30_000, // fallback polling a cada 30s
  })

  const unreadCount = notifications.filter(n => !n.read).length

  // Subscrição Realtime — recebe novas notificações instantaneamente
  useEffect(() => {
    if (!user?.id) return

    const unsubscribe = notificationsService.subscribe(user.id, (newNotif) => {
      // Actualizar cache do React Query com a nova notificação
      queryClient.setQueryData<Notification[]>(['notifications'], (old = []) => [
        newNotif,
        ...old,
      ])

      // Mostrar toast em tempo real
      toast({
        title: newNotif.title,
        description: newNotif.message,
        variant: getToastVariant(newNotif.type),
      } as any)
    })

    return unsubscribe
  }, [user?.id, queryClient])

  // Marcar como lida
  const markAsRead = useMutation({
    mutationFn: notificationsService.markAsRead,
    onSuccess: (_, id) => {
      queryClient.setQueryData<Notification[]>(['notifications'], (old = []) =>
        old.map(n => n.id === id ? { ...n, read: true } : n)
      )
    },
  })

  // Marcar todas como lidas
  const markAllAsRead = useMutation({
    mutationFn: notificationsService.markAllAsRead,
    onSuccess: () => {
      queryClient.setQueryData<Notification[]>(['notifications'], (old = []) =>
        old.map(n => ({ ...n, read: true }))
      )
    },
  })

  // Apagar
  const deleteNotif = useMutation({
    mutationFn: notificationsService.delete,
    onSuccess: (_, id) => {
      queryClient.setQueryData<Notification[]>(['notifications'], (old = []) =>
        old.filter(n => n.id !== id)
      )
    },
  })

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead: markAsRead.mutate,
    markAllAsRead: markAllAsRead.mutate,
    deleteNotif: deleteNotif.mutate,
  }
}

function getToastVariant(type: string): string {
  switch (type) {
    case 'aceite':          return 'success'
    case 'rejeitado':       return 'destructive'
    case 'cancelado':       return 'destructive'
    case 'novo_agendamento': return 'default'
    default:                return 'default'
  }
}
