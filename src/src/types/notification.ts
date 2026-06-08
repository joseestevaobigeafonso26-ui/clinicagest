// Adicionar ao ficheiro src/types/index.ts existente
// (juntar com os outros tipos já existentes)

export type NotificationType =
  | 'novo_agendamento'
  | 'aceite'
  | 'rejeitado'
  | 'cancelado'

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  message: string
  data?: {
    appointment_id?: string
    patient_name?: string
    service_name?: string
    scheduled_at?: string
    rejection_reason?: string
  }
  read: boolean
  created_at: string
}
