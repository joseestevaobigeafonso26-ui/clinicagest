// Adicionar esta função ao teu appointmentsService existente
// Ficheiro: src/services/appointments.ts
// Adiciona o método getDoctors ao objecto appointmentsService:

/*
  async getDoctors(): Promise<Pick<Profile, 'id' | 'full_name' | 'specialty'>[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, specialty')
      .eq('role', 'medico')
      .eq('status', 'activo')
      .order('full_name')

    if (error) throw new Error(error.message)
    return data ?? []
  },

  async updateStatus(
    id: string,
    status: AppointmentStatus,
    rejectionReason?: string
  ): Promise<void> {
    const updates: Record<string, any> = {
      status,
      updated_at: new Date().toISOString(),
    }
    if (rejectionReason) {
      updates.rejection_reason = rejectionReason
    }
    const { error } = await supabase
      .from('appointments')
      .update(updates)
      .eq('id', id)

    if (error) throw new Error(error.message)
  },
*/

// NOTA: Este ficheiro é apenas para referência.
// Adiciona os métodos acima ao teu ficheiro src/services/appointments.ts existente.
export {}
