import { supabase } from '@/lib/supabase'
import type { Notification } from '@/types'

export const notificationsService = {
  // Buscar todas as notificações do utilizador actual
  async getAll(): Promise<Notification[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
    if (error) throw error
    return data ?? []
  },

  // Contar não lidas
  async getUnreadCount(): Promise<number> {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('read', false)
    if (error) throw error
    return count ?? 0
  },

  // Marcar uma como lida
  async markAsRead(id: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id)
    if (error) throw error
  },

  // Marcar todas como lidas
  async markAllAsRead(): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('read', false)
    if (error) throw error
  },

  // Apagar uma notificação
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id)
    if (error) throw error
  },

  // Subscrever a notificações em tempo real (Supabase Realtime)
  subscribe(userId: string, onNew: (notification: Notification) => void) {
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          onNew(payload.new as Notification)
        }
      )
      .subscribe()

    // Retorna função para cancelar a subscrição
    return () => {
      supabase.removeChannel(channel)
    }
  },
}
