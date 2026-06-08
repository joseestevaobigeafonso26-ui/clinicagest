import { supabase } from '@/lib/supabase'
import type { Service } from '@/types'

export const servicesService = {
  async getAll(activeOnly = false) {
    let query = supabase
      .from('services')
      .select('*')
      .order('name', { ascending: true })

    if (activeOnly) query = query.eq('active', true)

    const { data, error } = await query
    if (error) throw error
    return data as Service[]
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error
    return data as Service
  },

  async create(service: Omit<Service, 'id' | 'created_at' | 'updated_at'>) {
    // Garantir que active tem valor por defeito
    const payload = { ...service, active: service.active ?? true }

    const { data, error } = await supabase
      .from('services')
      .insert(payload)
      .select()
      .single()

    if (error) {
      // Mensagem de erro mais clara para facilitar debug
      const msg = error.code === '42501'
        ? 'Sem permissão para criar serviços. Verifique se a sua conta é Administrador e está activa.'
        : error.message
      throw new Error(msg)
    }

    return data as Service
  },

  async update(id: string, updates: Partial<Service>) {
    const { data, error } = await supabase
      .from('services')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      const msg = error.code === '42501'
        ? 'Sem permissão para editar serviços.'
        : error.message
      throw new Error(msg)
    }

    return data as Service
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('services')
      .delete()
      .eq('id', id)

    if (error) {
      const msg = error.code === '42501'
        ? 'Sem permissão para remover serviços.'
        : error.message
      throw new Error(msg)
    }
  },

  async toggleActive(id: string, active: boolean) {
    return this.update(id, { active })
  },
}
