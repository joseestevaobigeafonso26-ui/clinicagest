import { supabase } from '@/lib/supabase'
import { authService } from './auth'
import type { Appointment, AppointmentFilters, AppointmentStatus } from '@/types'

export const appointmentsService = {
  async getAll(filters?: AppointmentFilters) {
    let query = supabase
      .from('appointments')
      .select(`
        *,
        patient:patients(id, full_name, phone, email),
        service:services(id, name, price, duration_minutes),
        doctor:profiles!appointments_doctor_id_fkey(id, full_name, email, specialty)
      `)
      .order('scheduled_at', { ascending: true })

    if (filters?.date) {
      const start = `${filters.date}T00:00:00`
      const end   = `${filters.date}T23:59:59`
      query = query.gte('scheduled_at', start).lte('scheduled_at', end)
    }
    // CORRECÇÃO: filtrar por doctor_id quando o utilizador é médico
    if (filters?.doctor_id) {
      query = query.eq('doctor_id', filters.doctor_id)
    }
    if (filters?.status) {
      query = query.eq('status', filters.status)
    }

    const { data, error } = await query
    if (error) throw error
    return data as Appointment[]
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        patient:patients(*),
        service:services(*),
        doctor:profiles!appointments_doctor_id_fkey(*)
      `)
      .eq('id', id)
      .single()
    if (error) throw error
    return data as Appointment
  },

  async getTodayCount() {
    const today = new Date().toISOString().split('T')[0]
    const { count, error } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .gte('scheduled_at', `${today}T00:00:00`)
      .lte('scheduled_at', `${today}T23:59:59`)
    if (error) throw error
    return count ?? 0
  },

  async create(appointment: Omit<Appointment, 'id' | 'created_at' | 'updated_at' | 'patient' | 'service' | 'doctor'>) {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user?.id) throw new Error('Utilizador não autenticado')

    // Verificar se o perfil do utilizador existe e está activo
    try {
      const profile = await authService.getProfile(userData.user.id)
      if (!profile) throw new Error('Perfil do utilizador não encontrado')
      if (profile.status !== 'activo') {
        throw new Error(`Conta em status "${profile.status}". Contacte o administrador.`)
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes('Conta em status')) throw err
      console.error('Erro ao verificar perfil:', err)
    }

    // 1. Criar o agendamento
    const { data, error } = await supabase
      .from('appointments')
      .insert({ ...appointment, created_by: userData.user.id })
      .select(`
        *,
        patient:patients(id, full_name, phone, email),
        service:services(id, name, price, duration_minutes),
        doctor:profiles!appointments_doctor_id_fkey(id, full_name, email, specialty)
      `)
      .single()

    if (error) {
      console.error('Appointments create error:', error)
      if (error.code === '42501' || error.message?.includes('row-level security')) {
        throw new Error('Sem permissão para agendar. Verifique se a sua conta está activa.')
      }
      if (error.code === '23503') {
        throw new Error('Dados inválidos: paciente, médico ou serviço não existem.')
      }
      throw error
    }

    // 2. Criar pagamento pendente automaticamente
    const servicePrice = (data as any).service?.price ?? 0
    const { error: payError } = await supabase
      .from('payments')
      .insert({ appointment_id: data.id, amount: servicePrice, status: 'pendente' })
    if (payError) {
      console.error('Erro ao criar pagamento automático:', payError.message)
    }

    return data as Appointment
  },

  async update(id: string, updates: Partial<Appointment>) {
    const { patient, service, doctor, ...cleanUpdates } = updates
    const { data, error } = await supabase
      .from('appointments')
      .update({ ...cleanUpdates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(`
        *,
        patient:patients(id, full_name, phone, email),
        service:services(id, name, price, duration_minutes),
        doctor:profiles!appointments_doctor_id_fkey(id, full_name, email, specialty)
      `)
      .single()
    if (error) throw error
    return data as Appointment
  },

  async cancel(id: string, reason?: string) {
    return this.update(id, { status: 'cancelado', cancelled_reason: reason })
  },

  async delete(id: string) {
    const { error } = await supabase.from('appointments').delete().eq('id', id)
    if (error) throw error
  },

  async getDoctors() {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, specialty, status, role')
      .eq('role', 'medico')
      .eq('status', 'activo')
      .order('full_name')
    if (error) throw error
    return (data ?? []) as Array<{ id: string; full_name: string; specialty?: string }>
  },

  async updateStatus(id: string, status: AppointmentStatus, rejectionReason?: string) {
    const updates: Record<string, any> = {
      status,
      updated_at: new Date().toISOString(),
    }
    if (rejectionReason) updates.rejection_reason = rejectionReason

    const { data, error } = await supabase
      .from('appointments')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        patient:patients(id, full_name, phone, email),
        service:services(id, name, price, duration_minutes),
        doctor:profiles!appointments_doctor_id_fkey(id, full_name, email, specialty)
      `)
      .single()
    if (error) throw error
    return data as Appointment
  },

  // Subscricão Realtime — recebe actualizações instantâneas dos agendamentos
  subscribe(
    filters: { date?: string; doctor_id?: string },
    callbacks: {
      onInsert?: (apt: Appointment) => void
      onUpdate?: (apt: Appointment) => void
      onDelete?: (id: string) => void
    }
  ) {
    const channelName = `appointments:${filters.doctor_id ?? 'all'}:${filters.date ?? 'any'}`

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'appointments' },
        async (payload) => {
          // Buscar o agendamento completo com joins
          try {
            const full = await appointmentsService.getById(payload.new.id)
            callbacks.onInsert?.(full)
          } catch { /* ignorar */ }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'appointments' },
        async (payload) => {
          try {
            const full = await appointmentsService.getById(payload.new.id)
            callbacks.onUpdate?.(full)
          } catch { /* ignorar */ }
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'appointments' },
        (payload) => {
          callbacks.onDelete?.(payload.old.id)
        }
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  },
}
