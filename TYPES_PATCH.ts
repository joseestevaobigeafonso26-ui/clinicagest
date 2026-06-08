// Este ficheiro é um PATCH ao src/types/index.ts existente.
// Adicionar os campos em falta ao tipo Notification.
//
// No ficheiro src/types/index.ts (ou equivalente), localizar a interface/type
// Notification e adicionar os campos marcados com "// ADICIONADO":

/*
export interface Notification {
  id: string
  user_id: string
  type: 'novo_agendamento' | 'aceite' | 'rejeitado' | 'cancelado'
  title: string
  message: string
  read: boolean
  created_at: string

  // ADICIONADO — necessário para navegação e acções inline na NotificationBell
  appointment_id?: string     // ID do agendamento associado
  scheduled_date?: string     // Data do agendamento em formato 'yyyy-MM-dd' (ex: '2026-06-10')
}
*/

// ─── ALTERNATIVA: se usares um tipo inferido do Supabase ─────────────────────
// Adicionar as colunas appointment_id e scheduled_date à tabela notifications no Supabase:
//
//   ALTER TABLE notifications ADD COLUMN IF NOT EXISTS appointment_id uuid REFERENCES appointments(id);
//   ALTER TABLE notifications ADD COLUMN IF NOT EXISTS scheduled_date date;
//
// E ao criar a notificação (no hook useNotifications ou no edge function),
// guardar também esses valores:
//
//   supabase.from('notifications').insert({
//     user_id: doctor_id,
//     type: 'novo_agendamento',
//     title: 'Novo agendamento',
//     message: `Consulta com ${patient_name} marcada para ${formatted_date}`,
//     appointment_id: appointment.id,              // ← ADICIONADO
//     scheduled_date: appointment.scheduled_at.slice(0, 10),  // ← ADICIONADO
//   })
