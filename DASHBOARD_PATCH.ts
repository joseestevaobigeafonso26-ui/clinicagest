// PATCH para src/components/views/DashboardView.tsx
//
// O erro acontece porque o React Query chama a queryFn sem argumentos,
// mas appointmentsService.getTodayCount precisa do doctor_id opcional.
//
// SUBSTITUIR as linhas problemáticas por estas:

// ── No topo do componente DashboardView, obter user e isDoctor: ──────────────
//
//   const { user } = useAuthStore()
//   const { isDoctor } = usePermissions()

// ── Substituir os dois useQuery do dashboard: ────────────────────────────────
//
// ANTES (quebrado):
//   const { data: todayAppointments = 0, isLoading: loadingAppts } = useQuery({
//     queryKey: ['appointments-today-count'],
//     queryFn: appointmentsService.getTodayCount,   // ← sem doctor_id
//   })
//
//   const { data: todayList = [], isLoading: loadingList } = useQuery({
//     queryKey: ['appointments-today-list'],
//     queryFn: appointmentsService.getTodayList,    // ← sem doctor_id
//   })
//
// DEPOIS (correcto):
//   const { data: todayAppointments = 0, isLoading: loadingAppts } = useQuery({
//     queryKey: ['appointments-today-count', isDoctor ? user?.id : null],
//     queryFn: () => appointmentsService.getTodayCount(
//       isDoctor && user?.id ? user.id : undefined
//     ),
//   })
//
//   const { data: todayList = [], isLoading: loadingList } = useQuery({
//     queryKey: ['appointments-today-list', isDoctor ? user?.id : null],
//     queryFn: () => appointmentsService.getTodayList(
//       isDoctor && user?.id ? user.id : undefined
//     ),
//   })
//
// O doctor_id no queryKey garante que o cache é separado por utilizador.
