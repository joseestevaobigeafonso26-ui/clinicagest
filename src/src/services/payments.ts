import { supabase } from '@/lib/supabase'
import type { Payment, PaymentMethod } from '@/types'

export const paymentsService = {
  async getAll() {
    const { data, error } = await supabase
      .from('payments')
      .select(`
        *,
        appointment:appointments(
          id, scheduled_at, status,
          patient:patients(id, full_name, phone),
          service:services(id, name, price)
        )
      `)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data as Payment[]
  },

  async getMonthlyRevenue(year: number, month: number) {
    const start = new Date(year, month - 1, 1).toISOString()
    const end   = new Date(year, month, 0, 23, 59, 59).toISOString()
    const { data, error } = await supabase
      .from('payments')
      .select('amount')
      .eq('status', 'pago')
      .gte('paid_at', start)
      .lte('paid_at', end)
    if (error) throw error
    return (data ?? []).reduce((sum, p) => sum + (p.amount ?? 0), 0)
  },

  async getTodayRevenue() {
    const today = new Date().toISOString().split('T')[0]
    const { data, error } = await supabase
      .from('payments')
      .select('amount')
      .eq('status', 'pago')
      .gte('paid_at', `${today}T00:00:00`)
      .lte('paid_at', `${today}T23:59:59`)
    if (error) throw error
    return (data ?? []).reduce((sum, p) => sum + (p.amount ?? 0), 0)
  },

  async create(payment: Omit<Payment, 'id' | 'created_at' | 'updated_at' | 'appointment'>) {
    const { data, error } = await supabase
      .from('payments')
      .insert(payment)
      .select()
      .single()
    if (error) throw error
    return data as Payment
  },

  async update(id: string, updates: Partial<Payment>) {
    const { appointment, ...cleanUpdates } = updates
    const { data, error } = await supabase
      .from('payments')
      .update({ ...cleanUpdates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as Payment
  },

  async markAsPaid(id: string, method: PaymentMethod) {
    return this.update(id, {
      status: 'pago',
      method,
      paid_at: new Date().toISOString(),
    })
  },

  async getRevenueByMonth(months = 6) {
    const results = []
    const now = new Date()
    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const revenue = await this.getMonthlyRevenue(date.getFullYear(), date.getMonth() + 1)
      results.push({
        month: date.toLocaleDateString('pt-AO', { month: 'short', year: '2-digit' }),
        value: revenue,
      })
    }
    return results
  },

  // Sumário rápido para o dashboard
  async getSummary() {
    const { data, error } = await supabase
      .from('payments')
      .select('amount, status')
    if (error) throw error
    const all = data ?? []
    return {
      totalRecebido:  all.filter(p => p.status === 'pago').reduce((s, p) => s + p.amount, 0),
      totalPendente:  all.filter(p => p.status === 'pendente').reduce((s, p) => s + p.amount, 0),
      countPendente:  all.filter(p => p.status === 'pendente').length,
      countTotal:     all.length,
    }
  },
}
