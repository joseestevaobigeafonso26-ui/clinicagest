# Matriz de Controlo de Acesso - ClinicaGest

## Resumo Visual por Funcionalidade

| Funcionalidade | Admin | Médico | Recepcionista |
|---|:---:|:---:|:---:|
| **UTILIZADORES** |  |  |  |
| Gerir utilizadores | ✅ | ❌ | ❌ |
| Ver lista de utilizadores | ✅ | ❌ | ❌ |
| **AGENDAMENTOS** |  |  |  |
| Ver todos os agendamentos | ✅ | ❌ | ✅ |
| Ver meus agendamentos | ✅ | ✅ | - |
| Criar agendamento | ✅ | ❌ | ✅ |
| Editar agendamento | ✅ | Seus | ✅ |
| Cancelar agendamento | ✅ | Seus | ✅ |
| **PACIENTES** |  |  |  |
| Ver todos os pacientes | ✅ | ✅ | ✅ |
| Criar paciente | ✅ | ❌ | ✅ |
| Editar paciente | ✅ | ❌ | ✅ |
| Eliminar paciente | ✅ | ❌ | ❌ |
| Ver história clínica | ✅ | Seus | ❌ |
| **PRONTUÁRIOS** |  |  |  |
| Ver todos os prontuários | ✅ | ❌ | ❌ |
| Ver meus prontuários | ✅ | ✅ | ❌ |
| Criar prontuário | ✅ | ✅ | ❌ |
| Editar prontuário | ✅ | Seus | ❌ |
| Auditar prontuários | ✅ | ❌ | ❌ |
| **SERVIÇOS** |  |  |  |
| Ver serviços | ✅ | ✅ | ✅ |
| Criar serviço | ✅ | ❌ | ❌ |
| Editar serviço | ✅ | ❌ | ❌ |
| Eliminar serviço | ✅ | ❌ | ❌ |
| **FINANCEIRO** |  |  |  |
| Ver todos os pagamentos | ✅ | ❌ | ❌ |
| Registrar pagamento | ✅ | ❌ | ✅ |
| Ver análise financeira | ✅ | ❌ | ❌ |
| Exportar relatórios | ✅ | ❌ | ❌ |
| Gerir métodos de pagamento | ✅ | ❌ | ❌ |

---

## Descrições de Permissões

### Utilizadores
- **manage_users**: Criar, editar e eliminar utilizadores
- **view_users**: Listar todos os utilizadores
- **edit_users**: Editar dados de utilizadores
- **delete_users**: Eliminar utilizadores

### Agendamentos
- **view_all_appointments**: Ver todos os agendamentos (todos os médicos)
- **view_own_appointments**: Ver apenas seus agendamentos (para médicos)
- **create_appointment**: Criar novo agendamento
- **edit_all_appointments**: Editar agendamentos de qualquer médico
- **edit_own_appointments**: Editar apenas seus agendamentos
- **cancel_appointment**: Cancelar agendamentos

### Pacientes
- **view_all_patients**: Ver lista completa de pacientes
- **create_patient**: Cadastrar novo paciente
- **edit_patient**: Editar dados do paciente
- **delete_patient**: Eliminar paciente do sistema
- **view_patient_info**: Ver informações detalhadas do paciente

### Prontuários
- **view_all_medical_records**: Ver todos os prontuários
- **view_own_medical_records**: Ver apenas seus prontuários
- **create_medical_record**: Criar novo prontuário
- **edit_medical_record**: Editar prontuários de outros
- **edit_own_medical_records**: Editar seus próprios prontuários
- **audit_medical_records**: Aceder e auditar histórico de prontuários

### Serviços
- **manage_services**: Permissão geral para gerir serviços
- **view_services**: Ver lista de serviços disponíveis
- **create_service**: Criar novo serviço
- **edit_service**: Editar serviço existente
- **delete_service**: Eliminar serviço

### Pagamentos e Financeiro
- **view_all_payments**: Ver todos os pagamentos registados
- **view_own_payments**: Ver pagamentos criados por este utilizador
- **create_payment**: Registrar novo pagamento
- **update_payment_status**: Alterar status de pagamento
- **view_financial_analytics**: Aceder a análise de receitas e gráficos
- **export_financial_reports**: Exportar relatórios financeiros
- **manage_payment_methods**: Configurar métodos de pagamento

---

## Exemplos de Uso

### Verificar Permissão Específica
```typescript
const { can } = usePermissions()

if (can('delete_patient')) {
  // Mostrar botão de eliminar
}
```

### Verificar Role
```typescript
const { isAdmin, isDoctor } = usePermissions()

if (isAdmin) {
  // Mostrar painel de administração
} else if (isDoctor) {
  // Mostrar painel médico
}
```

### Proteger Componente
```typescript
<RoleGuard requires="manage_services">
  <ServiceManager />
</RoleGuard>
```

### Múltiplas Permissões
```typescript
<RoleGuard requires={['view_all_payments', 'export_financial_reports']} type="all">
  <FinancialReport />
</RoleGuard>
```

---

## Notas Importantes

1. **RLS no Backend**: Todas as restrições também estão implementadas no Supabase RLS
2. **Frontend é UI apenas**: O backend valida e nega acesso real aos dados
3. **Segurança por camadas**: Tanto frontend quanto backend protegem os dados
4. **Extensível**: Fácil adicionar novas permissões conforme necessário
5. **Auditável**: Sistema pronto para registar ações por utilizador
