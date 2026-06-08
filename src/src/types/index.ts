export type UserRole = 'admin' | 'medico' | 'recepcao'
export type UserStatus = 'pendente' | 'activo' | 'bloqueado'

export interface Profile {
  id: string
  email: string
  full_name: string
  role: UserRole
  status: UserStatus          // ← ADICIONADO
  specialty?: string          // ← ADICIONADO (para médicos)
  avatar_url?: string
  phone?: string
  created_at: string
  updated_at: string
}

export interface Patient {
  id: string
  full_name: string
  email?: string
  phone: string
  cpf: string
  birth_date: string
  gender: 'masculino' | 'feminino' | 'outro'
  address?: string
  city?: string
  state?: string
  zip_code?: string
  blood_type?: string
  allergies?: string
  notes?: string
  insurance?: string
  created_by: string
  created_at: string
  updated_at: string
}

export interface Service {
  id: string
  name: string
  description?: string
  price: number
  duration_minutes: number
  category: string
  active: boolean
  created_at: string
  updated_at: string
}

export type AppointmentStatus =
  | 'agendado'
  | 'confirmado'
  | 'rejeitado'
  | 'realizado'
  | 'cancelado'
  | 'falta'

export interface Appointment {
  id: string
  patient_id: string
  service_id: string
  doctor_id: string
  scheduled_at: string
  status: AppointmentStatus
  notes?: string
  cancelled_reason?: string
  rejection_reason?: string   // ← ADICIONADO
  created_by: string
  created_at: string
  updated_at: string
  // Joined
  patient?: Patient
  service?: Service
  doctor?: Profile
}

// transferencia em vez de pix (corresponde ao schema da BD)
export type PaymentMethod =
  | 'dinheiro'
  | 'cartao_credito'
  | 'cartao_debito'
  | 'transferencia'           // ← corrigido de 'pix'
  | 'convenio'

export type PaymentStatus = 'pendente' | 'pago' | 'cancelado' | 'reembolsado'

export interface Payment {
  id: string
  appointment_id: string
  amount: number
  method?: PaymentMethod
  status: PaymentStatus
  paid_at?: string
  notes?: string
  created_at: string
  updated_at: string
  // Joined
  appointment?: Appointment & {
    patient?: Patient
    service?: Service
  }
}

export interface MedicalRecord {
  id: string
  appointment_id: string
  patient_id: string
  doctor_id: string
  symptoms?: string
  diagnosis?: string
  prescription?: string
  observations?: string
  follow_up_date?: string
  created_at: string
  updated_at: string
  appointment?: Appointment
  patient?: Patient
  doctor?: Profile
}

export interface DashboardKPIs {
  consultasHoje: number
  consultasMes: number
  pacientesCadastrados: number
  faturamentoHoje: number
  faturamentoMes: number
  taxaCancelamento: number
}

export interface AppointmentFilters {
  date?: string
  doctor_id?: string
  status?: AppointmentStatus
  search?: string
}

export interface PatientFilters {
  search?: string
  gender?: string
}
