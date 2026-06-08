import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types'

export const usersService = {
  /**
   * Busca todos os utilizadores — apenas admin tem acesso via RLS
   */
  async getAll(): Promise<Profile[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)
    return data ?? []
  },

  /**
   * Actualiza o status e o papel de um utilizador
   * Só é chamado pelo admin — RLS no Supabase protege esta operação
   */
  async updateUserStatusAndRole(
    userId: string,
    status: 'activo' | 'pendente' | 'bloqueado',
    role: 'admin' | 'medico' | 'recepcao'
  ): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .update({ status, role, updated_at: new Date().toISOString() })
      .eq('id', userId)

    if (error) throw new Error(error.message)
  },

  /**
   * Aprovação rápida — activa conta e mantém o papel
   */
  async approve(userId: string, currentRole: string): Promise<void> {
    return this.updateUserStatusAndRole(
      userId,
      'activo',
      currentRole as 'admin' | 'medico' | 'recepcao'
    )
  },

  /**
   * Bloqueio rápido — bloqueia conta
   */
  async block(userId: string, currentRole: string): Promise<void> {
    return this.updateUserStatusAndRole(
      userId,
      'bloqueado',
      currentRole as 'admin' | 'medico' | 'recepcao'
    )
  },
}
