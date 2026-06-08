'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, CheckCheck, Trash2, X, Calendar, CheckCircle2, XCircle, Ban } from 'lucide-react'
import { useNotifications } from '@/hooks/useNotifications'
import { usePermissions } from '@/hooks/usePermissions'
import { appointmentsService } from '@/services/appointments'
import { useQueryClient, useMutation } from '@tanstack/react-query'
import { formatRelativeTime } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { toast } from '@/hooks/useToast'
import { cn } from '@/lib/utils'
import type { Notification } from '@/types'

const TYPE_CONFIG = {
  novo_agendamento: {
    icon: Calendar,
    iconClass: 'text-blue-500',
    bgClass: 'bg-blue-50 dark:bg-blue-900/20',
  },
  aceite: {
    icon: CheckCircle2,
    iconClass: 'text-emerald-500',
    bgClass: 'bg-emerald-50 dark:bg-emerald-900/20',
  },
  rejeitado: {
    icon: XCircle,
    iconClass: 'text-red-500',
    bgClass: 'bg-red-50 dark:bg-red-900/20',
  },
  cancelado: {
    icon: Ban,
    iconClass: 'text-orange-500',
    bgClass: 'bg-orange-50 dark:bg-orange-900/20',
  },
}

// ─── Item de notificação com acções inline ────────────────────────────────────
function NotificationItem({
  notification,
  onRead,
  onDelete,
  onClose,
}: {
  notification: Notification
  onRead: (id: string) => void
  onDelete: (id: string) => void
  onClose: () => void
}) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { isDoctor, isReceptionist, isAdmin } = usePermissions()

  const cfg = TYPE_CONFIG[notification.type] ?? TYPE_CONFIG.novo_agendamento
  const Icon = cfg.icon

  // ─── FIX — Problema 2: acções de aceitar/rejeitar directamente na notificação
  const acceptMutation = useMutation({
    mutationFn: () =>
      appointmentsService.updateStatus(notification.appointment_id!, 'confirmado'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      queryClient.invalidateQueries({ queryKey: ['appointments-today-count'] })
      onRead(notification.id)
      toast({ title: 'Agendamento aceite!', variant: 'success' as any })
    },
    onError: (err: any) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  })

  const rejectMutation = useMutation({
    mutationFn: () =>
      appointmentsService.updateStatus(notification.appointment_id!, 'rejeitado'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      queryClient.invalidateQueries({ queryKey: ['appointments-today-count'] })
      onRead(notification.id)
      toast({ title: 'Agendamento rejeitado', variant: 'success' as any })
    },
    onError: (err: any) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  })

  // Navegar para a página de agendamentos com a data correcta
  function handleNavigate() {
    if (!notification.read) onRead(notification.id)
    if (notification.appointment_id) {
      // Se a notificação tiver a data do agendamento, navegar para esse dia
      const dateParam = notification.scheduled_date
        ? `?date=${notification.scheduled_date}`
        : ''
      router.push(`/appointments${dateParam}`)
    } else {
      router.push('/appointments')
    }
    onClose()
  }

  // Mostrar botões aceitar/rejeitar para médicos em notificações de novo agendamento
  const showDoctorActions =
    isDoctor &&
    notification.type === 'novo_agendamento' &&
    !!notification.appointment_id &&
    !notification.read

  // Mostrar botões aceitar/rejeitar para recepção em notificações de estado (aceite/rejeitado)
  const showReceptionStatus =
    (isAdmin || isReceptionist) &&
    (notification.type === 'aceite' || notification.type === 'rejeitado')

  const isPending = acceptMutation.isPending || rejectMutation.isPending

  return (
    <div
      className={cn(
        'flex gap-3 p-3 rounded-lg border transition-colors group',
        notification.read
          ? 'bg-background border-border opacity-70'
          : `${cfg.bgClass} border-transparent`
      )}
    >
      {/* Ícone */}
      <div
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full cursor-pointer',
          notification.read ? 'bg-muted' : 'bg-white dark:bg-background/50 shadow-sm'
        )}
        onClick={handleNavigate}
      >
        <Icon className={cn('h-4 w-4', notification.read ? 'text-muted-foreground' : cfg.iconClass)} />
      </div>

      {/* Conteúdo */}
      <div className="flex-1 min-w-0">
        <p
          className={cn('text-sm font-medium leading-snug cursor-pointer hover:underline', !notification.read && 'font-semibold')}
          onClick={handleNavigate}
        >
          {notification.title}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
          {notification.message}
        </p>
        <p className="text-xs text-muted-foreground mt-1 opacity-60">
          {formatRelativeTime(notification.created_at)}
        </p>

        {/* ─── FIX — Botões de acção inline para o médico ───────────────── */}
        {showDoctorActions && (
          <div className="flex gap-2 mt-2">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs border-emerald-500 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 px-2"
              onClick={(e) => { e.stopPropagation(); acceptMutation.mutate() }}
              disabled={isPending}
            >
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Aceitar
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs border-red-400 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 px-2"
              onClick={(e) => { e.stopPropagation(); rejectMutation.mutate() }}
              disabled={isPending}
            >
              <Ban className="h-3 w-3 mr-1" />
              Rejeitar
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs text-muted-foreground px-2"
              onClick={(e) => { e.stopPropagation(); handleNavigate() }}
              disabled={isPending}
            >
              Ver detalhes
            </Button>
          </div>
        )}

        {/* ─── Botão "Ver agendamento" para recepção após aceite/rejeição ── */}
        {showReceptionStatus && (
          <button
            className="mt-2 text-xs text-primary hover:underline"
            onClick={(e) => { e.stopPropagation(); handleNavigate() }}
          >
            Ver agendamento →
          </button>
        )}
      </div>

      {/* Botão apagar */}
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(notification.id) }}
        className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive self-start mt-1"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>

      {/* Indicador não lida */}
      {!notification.read && (
        <div className="absolute right-3 top-3 h-2 w-2 rounded-full bg-primary" />
      )}
    </div>
  )
}

// ─── Sino de notificações ─────────────────────────────────────────────────────
export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotif,
  } = useNotifications()

  // Fechar ao clicar fora
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      {/* Botão sino */}
      <button
        onClick={() => setOpen(!open)}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg hover:bg-muted transition-colors"
        aria-label="Notificações"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 rounded-xl border bg-background shadow-xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span className="font-semibold text-sm">Notificações</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllAsRead(undefined)}
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                  title="Marcar todas como lidas"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Todas lidas
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="ml-2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Lista */}
          <div className="max-h-96 overflow-y-auto p-2 space-y-1">
            {isLoading ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                A carregar...
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-10 text-center">
                <Bell className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">Sem notificações</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div key={n.id} className="relative">
                  <NotificationItem
                    notification={n}
                    onRead={markAsRead}
                    onDelete={deleteNotif}
                    onClose={() => setOpen(false)}
                  />
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
