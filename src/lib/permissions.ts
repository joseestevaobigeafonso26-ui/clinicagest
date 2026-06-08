import type { UserRole } from '@/types'

// Definição de permissões por role
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  admin: [
    // Utilizadores
    'manage_users',
    'view_users',
    'edit_users',
    'delete_users',
    
    // Agendamentos
    'view_all_appointments',
    'create_appointment',
    'edit_all_appointments',
    'cancel_appointment',
    
    // Pacientes
    'view_all_patients',
    'create_patient',
    'edit_patient',
    'delete_patient',
    
    // Prontuários
    'view_all_medical_records',
    'create_medical_record',
    'edit_medical_record',
    'audit_medical_records',
    
    // Serviços
    'manage_services',
    'view_services',
    'create_service',
    'edit_service',
    'delete_service',
    
    // Financeiro
    'view_all_payments',
    'view_financial_analytics',
    'export_financial_reports',
    'manage_payment_methods',
  ],
  
  medico: [
    // Agendamentos
    'view_own_appointments',
    'edit_own_appointments',
    'view_all_patients',
    
    // Prontuários
    'create_medical_record',
    'view_own_medical_records',
    'edit_own_medical_records',
    'view_patient_info',
    
    // Serviços
    'view_services',
  ],
  
  recepcao: [
    // Agendamentos
    'view_all_appointments',
    'create_appointment',
    'edit_all_appointments',
    'cancel_appointment',
    
    // Pacientes
    'view_all_patients',
    'create_patient',
    'edit_patient',
    
    // Pagamentos
    'create_payment',
    'view_own_payments',
    'update_payment_status',
    
    // Serviços
    'view_services',
  ],
}

// Verificar se um role tem uma permissão específica
export function hasPermission(role: UserRole, permission: string): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false
}

// Verificar múltiplas permissões (AND)
export function hasAllPermissions(role: UserRole, permissions: string[]): boolean {
  return permissions.every(p => hasPermission(role, p))
}

// Verificar múltiplas permissões (OR)
export function hasAnyPermission(role: UserRole, permissions: string[]): boolean {
  return permissions.some(p => hasPermission(role, p))
}

// Descrições das permissões
export const PERMISSION_LABELS: Record<string, string> = {
  // Utilizadores
  manage_users: 'Gerir Utilizadores',
  view_users: 'Ver Utilizadores',
  edit_users: 'Editar Utilizadores',
  delete_users: 'Eliminar Utilizadores',
  
  // Agendamentos
  view_all_appointments: 'Ver Todos os Agendamentos',
  view_own_appointments: 'Ver Meus Agendamentos',
  create_appointment: 'Criar Agendamento',
  edit_all_appointments: 'Editar Todos os Agendamentos',
  edit_own_appointments: 'Editar Meus Agendamentos',
  cancel_appointment: 'Cancelar Agendamento',
  
  // Pacientes
  view_all_patients: 'Ver Todos os Pacientes',
  create_patient: 'Criar Paciente',
  edit_patient: 'Editar Paciente',
  delete_patient: 'Eliminar Paciente',
  view_patient_info: 'Ver Informações do Paciente',
  
  // Prontuários
  view_all_medical_records: 'Ver Todos os Prontuários',
  view_own_medical_records: 'Ver Meus Prontuários',
  create_medical_record: 'Criar Prontuário',
  edit_medical_record: 'Editar Prontuário',
  edit_own_medical_records: 'Editar Meus Prontuários',
  audit_medical_records: 'Auditar Prontuários',
  
  // Serviços
  manage_services: 'Gerir Serviços',
  view_services: 'Ver Serviços',
  create_service: 'Criar Serviço',
  edit_service: 'Editar Serviço',
  delete_service: 'Eliminar Serviço',
  
  // Pagamentos
  view_all_payments: 'Ver Todos os Pagamentos',
  view_own_payments: 'Ver Meus Pagamentos',
  create_payment: 'Criar Pagamento',
  update_payment_status: 'Atualizar Status do Pagamento',
  
  // Financeiro
  view_financial_analytics: 'Ver Análise Financeira',
  export_financial_reports: 'Exportar Relatórios Financeiros',
  manage_payment_methods: 'Gerir Métodos de Pagamento',
}
