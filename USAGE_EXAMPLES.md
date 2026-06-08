/**
 * EXEMPLOS DE USO - Sistema de Controlo de Acesso
 * 
 * Este arquivo demonstra como usar o sistema de permissões
 * em diferentes cenários da aplicação.
 */

// ============================================================================
// 1. USAR O HOOK EM COMPONENTES
// ============================================================================

import { usePermissions } from '@/hooks/usePermissions'

function DashboardHeader() {
  const { isAdmin, isDoctor, isReceptionist, user } = usePermissions()

  return (
    <div>
      <h1>Bem-vindo, {user?.full_name}</h1>
      
      {isAdmin && <p>Você tem acesso de Administrador</p>}
      {isDoctor && <p>Você tem acesso de Médico</p>}
      {isReceptionist && <p>Você tem acesso de Recepcionista</p>}
    </div>
  )
}

// ============================================================================
// 2. MOSTRAR/ESCONDER BOTÕES BASEADO EM PERMISSÕES
// ============================================================================

function PatientActions({ patientId }: { patientId: string }) {
  const { isAdmin, can } = usePermissions()

  return (
    <div className="flex gap-2">
      <button>Editar</button>
      
      {/* Botão de eliminar - apenas Admin */}
      {isAdmin && (
        <button className="hover:text-red-500">Eliminar Paciente</button>
      )}

      {/* Botão de registar pagamento - apenas se tem permissão */}
      {can('create_payment') && (
        <button>Registar Pagamento</button>
      )}
    </div>
  )
}

// ============================================================================
// 3. USAR COMPONENTE RoleGuard PARA BLOQUEAR SEÇÕES
// ============================================================================

import { RoleGuard } from '@/components/auth/RoleGuard'

function AdminPanel() {
  return (
    <RoleGuard 
      requires="manage_users"
      fallback={<p>Apenas administradores podem aceder aqui</p>}
    >
      <div className="bg-blue-50 p-4 rounded">
        <h2>Painel de Administração</h2>
        <p>Aqui pode gerir utilizadores, ver logs, etc.</p>
      </div>
    </RoleGuard>
  )
}

// ============================================================================
// 4. MÚLTIPLAS PERMISSÕES COM AND (todas necessárias)
// ============================================================================

function FinancialExport() {
  const { canAll } = usePermissions()

  return (
    <RoleGuard 
      requires={['view_all_payments', 'export_financial_reports']}
      type="all"
      fallback={<p>Sem permissão para exportar relatórios</p>}
    >
      <button>Exportar Relatório Financeiro</button>
    </RoleGuard>
  )
}

// ============================================================================
// 5. MÚLTIPLAS PERMISSÕES COM OR (qualquer uma necessária)
// ============================================================================

function PaymentSection() {
  return (
    <RoleGuard 
      requires={['create_payment', 'update_payment_status']}
      type="any"
      fallback={<p>Sem permissão para gerir pagamentos</p>}
    >
      <div>
        <h3>Gestão de Pagamentos</h3>
        {/* Componentes de pagamento */}
      </div>
    </RoleGuard>
  )
}

// ============================================================================
// 6. VIEWS ESPECÍFICAS POR ROLE
// ============================================================================

import { RoleBasedView } from '@/components/auth/RoleGuard'

function Dashboard() {
  return (
    <>
      <RoleBasedView role="admin">
        <AdminDashboard />
      </RoleBasedView>

      <RoleBasedView role="medico">
        <DoctorDashboard />
      </RoleBasedView>

      <RoleBasedView role="recepcao">
        <ReceptionistDashboard />
      </RoleBasedView>
    </>
  )
}

// ============================================================================
// 7. CONDICIONAL AVANÇADA
// ============================================================================

function AppointmentActions({ appointment }: { appointment: any }) {
  const { isAdmin, isReceptionist, isDoctor, user } = usePermissions()

  // Apenas admin e recepcionista podem editar agendamentos de outros
  const canEdit = (isAdmin || isReceptionist) || 
                  (isDoctor && appointment.doctor_id === user?.id)

  return (
    <div>
      {canEdit && <button>Editar Agendamento</button>}
      {(isAdmin || isReceptionist) && <button>Cancelar</button>}
    </div>
  )
}

// ============================================================================
// 8. PROTEÇÃO DE ROTA (em router)
// ============================================================================

// No seu arquivo de rotas:
/*
import { RoleProtectedRoute } from '@/components/auth/RoleProtectedRoute'

{
  element: <RoleProtectedRoute requiredRoles={['admin']} />,
  children: [
    { path: '/admin/users', element: <UsersManagement /> }
  ]
},

{
  element: <RoleProtectedRoute 
    requiredPermission="view_all_payments" 
  />,
  children: [
    { path: '/financial', element: <FinancialReport /> }
  ]
}
*/

// ============================================================================
// 9. VERIFICAR PERMISSÃO EM SERVIÇOS (antes de chamar API)
// ============================================================================

import { paymentsService } from '@/services/payments'
import { usePermissions } from '@/hooks/usePermissions'

async function handlePaymentCreation() {
  const { can } = usePermissions()

  if (!can('create_payment')) {
    alert('Sem permissão para criar pagamentos')
    return
  }

  try {
    await paymentsService.create(paymentData)
  } catch (error) {
    console.error('Erro ao criar pagamento', error)
  }
}

// ============================================================================
// 10. COMBINAÇÃO DE VERIFICAÇÕES
// ============================================================================

function ComplexScenario() {
  const { isAdmin, isDoctor, can, isRole } = usePermissions()

  // Verificar por role
  if (!isRole(['admin', 'medico'])) {
    return <AccessDenied />
  }

  // Verificar permissão específica
  if (!can('view_patient_info')) {
    return <div>Sem permissão para ver informações do paciente</div>
  }

  // Lógica diferente baseada em role
  if (isAdmin) {
    return <AdminPatientView />
  } else if (isDoctor) {
    return <DoctorPatientView />
  }

  return null
}

// ============================================================================
// MÉTODOS DISPONÍVEIS NO HOOK
// ============================================================================

/*

const {
  // Dados do utilizador
  user,                        // Profile completo do utilizador atual

  // Verificações simples
  can,                         // (permission: string) => boolean
  isRole,                      // (role: string | string[]) => boolean
  isAdmin,                     // () => boolean
  isDoctor,                    // () => boolean
  isReceptionist,              // () => boolean

  // Verificações múltiplas
  canAll,                      // (permissions: string[]) => boolean (AND)
  canAny,                      // (permissions: string[]) => boolean (OR)
} = usePermissions()

*/

// ============================================================================
// REFERÊNCIA RÁPIDA DE PERMISSÕES
// ============================================================================

/*

ADMIN - Acesso Total:
- manage_users, view_users, edit_users, delete_users
- view_all_appointments, create_appointment, edit_all_appointments, cancel_appointment
- view_all_patients, create_patient, edit_patient, delete_patient
- view_all_medical_records, create_medical_record, edit_medical_record, audit_medical_records
- manage_services, view_services, create_service, edit_service, delete_service
- view_all_payments, view_financial_analytics, export_financial_reports, manage_payment_methods

MÉDICO - Foco Clínico:
- view_own_appointments, edit_own_appointments, view_all_patients
- create_medical_record, view_own_medical_records, edit_own_medical_records, view_patient_info
- view_services

RECEPCIONISTA - Foco Operacional:
- view_all_appointments, create_appointment, edit_all_appointments, cancel_appointment
- view_all_patients, create_patient, edit_patient
- create_payment, view_own_payments, update_payment_status
- view_services

*/
