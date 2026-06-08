import { useQuery } from '@tanstack/react-query'
import {
  Users, Calendar, TrendingUp, DollarSign,
  ArrowUpRight, ArrowDownRight, Clock, CheckCircle2,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Skeleton } from '@/components/ui/index'
import { patientsService } from '@/services/patients'
import { appointmentsService } from '@/services/appointments'
import { paymentsService } from '@/services/payments'
import { formatCurrency, formatDate, getStatusColor, getStatusLabel } from '@/utils'
import { useAuthStore } from '@/store/auth'

const STATUS_COLORS: Record<string, string> = {
  agendado: '#3b82f6',
  confirmado: '#10b981',
  realizado: '#059669',
  cancelado: '#ef4444',
  falta: '#f97316',
}

function KPICard({ title, value, subtitle, icon: Icon, trend, loading }: {
  title: string; value: string; subtitle: string; icon: any; trend?: number; loading?: boolean
}) {
  if (loading) return (
    <Card>
      <CardContent className="p-6 space-y-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-3 w-20" />
      </CardContent>
    </Card>
  )

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="h-4 w-4 text-primary" />
          </div>
        </div>
        <p className="text-2xl font-bold tracking-tight">{value}</p>
        <div className="mt-2 flex items-center gap-1">
          {trend !== undefined && (
            trend >= 0
              ? <ArrowUpRight className="h-3 w-3 text-emerald-500" />
              : <ArrowDownRight className="h-3 w-3 text-red-500" />
          )}
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </CardContent>
    </Card>
  )
}

export function DashboardPage() {
  const { user } = useAuthStore()

  const { data: patientCount = 0, isLoading: loadingPatients } = useQuery({
    queryKey: ['patients-count'],
    queryFn: patientsService.count,
  })

  const { data: todayAppointments = 0, isLoading: loadingAppts } = useQuery({
    queryKey: ['appointments-today-count'],
    queryFn: appointmentsService.getTodayCount,
  })

  const { data: todayRevenue = 0, isLoading: loadingRevenue } = useQuery({
    queryKey: ['revenue-today'],
    queryFn: paymentsService.getTodayRevenue,
  })

  const { data: revenueChart = [], isLoading: loadingChart } = useQuery({
    queryKey: ['revenue-chart'],
    queryFn: () => paymentsService.getRevenueByMonth(6),
  })

  const { data: todayList = [], isLoading: loadingList } = useQuery({
    queryKey: ['appointments-today-list'],
    queryFn: () => appointmentsService.getAll({ date: new Date().toISOString().split('T')[0] }),
  })

  const statusData = Object.entries(
    todayList.reduce<Record<string, number>>((acc, a) => {
      acc[a.status] = (acc[a.status] ?? 0) + 1
      return acc
    }, {})
  ).map(([name, value]) => ({ name: getStatusLabel(name), value, color: STATUS_COLORS[name] ?? '#94a3b8' }))

  const loading = loadingPatients || loadingAppts || loadingRevenue

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">
          Olá, {user?.full_name?.split(' ')[0]} 👋
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {formatDate(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy")} — Visão geral do dia
        </p>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KPICard
          title="Pacientes Cadastrados"
          value={patientCount.toLocaleString('pt-BR')}
          subtitle="Total no sistema"
          icon={Users}
          loading={loading}
        />
        <KPICard
          title="Consultas Hoje"
          value={todayAppointments.toString()}
          subtitle="Agendadas para hoje"
          icon={Calendar}
          loading={loading}
        />
        <KPICard
          title="Faturamento Hoje"
          value={formatCurrency(todayRevenue)}
          subtitle="Receita do dia"
          icon={DollarSign}
          trend={5}
          loading={loading}
        />
        <KPICard
          title="Taxa de Ocupação"
          value={todayAppointments > 0 ? `${Math.min(100, Math.round((todayAppointments / 20) * 100))}%` : '0%'}
          subtitle="Capacidade utilizada"
          icon={TrendingUp}
          loading={loading}
        />
      </div>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Revenue chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Faturamento Mensal</CardTitle>
            <CardDescription>Receita dos últimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingChart ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={revenueChart}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tickFormatter={(v) => `Kz${(v/1000).toFixed(0)}k`} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip
                    formatter={(v: number) => [formatCurrency(v), 'Receita']}
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }}
                  />
                  <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#colorRevenue)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Status pie */}
        <Card>
          <CardHeader>
            <CardTitle>Consultas Hoje</CardTitle>
            <CardDescription>Por status</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingList ? (
              <Skeleton className="h-48 w-full" />
            ) : statusData.length === 0 ? (
              <div className="flex h-48 items-center justify-center text-muted-foreground text-sm">
                Nenhuma consulta hoje
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                    {statusData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
                  <Legend iconType="circle" iconSize={8} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Today's appointments list */}
      <Card>
        <CardHeader>
          <CardTitle>Agenda de Hoje</CardTitle>
          <CardDescription>Consultas agendadas para {formatDate(new Date())}</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingList ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : todayList.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Calendar className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>Nenhuma consulta agendada para hoje</p>
            </div>
          ) : (
            <div className="space-y-2">
              {todayList.slice(0, 8).map((apt) => (
                <div key={apt.id} className="flex items-center gap-4 rounded-lg border p-3 hover:bg-muted/40 transition-colors">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
                    {apt.scheduled_at ? new Date(apt.scheduled_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{apt.patient?.full_name ?? 'Paciente'}</p>
                    <p className="text-xs text-muted-foreground truncate">{apt.service?.name ?? 'Serviço'}</p>
                  </div>
                  <span className={`shrink-0 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${getStatusColor(apt.status)}`}>
                    {getStatusLabel(apt.status)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
