import { supabase } from '@/lib/supabase'
import type { Patient, PatientFilters } from '@/types'

export const patientsService = {
  async getAll(filters?: PatientFilters) {
    let query = supabase
      .from('patients')
      .select('*')
      .order('full_name', { ascending: true })

    if (filters?.search) {
      query = query.or(
        `full_name.ilike.%${filters.search}%,cpf.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`
      )
    }
    if (filters?.gender) {
      query = query.eq('gender', filters.gender)
    }

    const { data, error } = await query
    if (error) throw error
    return data as Patient[]
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error
    return data as Patient
  },

  async create(patient: Omit<Patient, 'id' | 'created_at' | 'updated_at'>) {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user?.id) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('patients')
      .insert({ ...patient, created_by: userData.user.id })
      .select()
      .single()
    if (error) throw error
    return data as Patient
  },

  async update(id: string, updates: Partial<Patient>) {
    const { data, error } = await supabase
      .from('patients')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as Patient
  },

  async delete(id: string) {
    const { error } = await supabase.from('patients').delete().eq('id', id)
    if (error) throw error
  },

  async count() {
    const { count, error } = await supabase
      .from('patients')
      .select('*', { count: 'exact', head: true })
    if (error) throw error
    return count ?? 0
  },
}
