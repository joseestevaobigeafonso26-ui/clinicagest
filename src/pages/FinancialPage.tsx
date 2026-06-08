import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DollarSign, TrendingUp, Clock, CheckCircle2, CreditCard } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { paymentsService } from '@/services/payments'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Badge, Skeleton } from '@/components/ui/index'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/hooks/useToast'
import { formatCurrency, formatDateTime, getStatusColor, getStatusLabel, formatDate } from '@/utils'
import type { Payment, PaymentMethod } from '@/types'

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'cartao_credito', label: 'Cartão de Crédito' },
  { value: 'cartao_debito', label: 'Cartão de Débito' },
  { value: 'pix', label: 'PIX' },
  { value: 'convenio', label: 'Convênio' },
]

export function FinancialPage() {
  const queryClient = useQueryClient()
  const [payingId, setPayingId] = useState<string | null>(null)
  const [method, setMethod] = useState<PaymentMethod>('pix')

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['payments'],
    queryFn: paymentsService.getAll,
  })

  const { data: revenueChart = [], isLoading: loadingChart } = useQuery({
    queryKey: ['revenue-chart-financial'],
    queryFn: () => paymentsService.getRevenueByMonth(6),
  })

  const markPaidMutation = useMutation({
    mutationFn: ({ id, method }: { id: string; method: PaymentMethod }) =>
      paymentsService.markAsPaid(id, method),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      queryClient.invalidateQueries({ queryKey: ['revenue-today'] })
      queryClient.invalidateQueries({ queryKey: ['revenue-chart-financial'] })
      toast({ title: 'Pagamento registrado!', variant: 'success' as any })
      setPayingId(null)
    },
    onError: (err: any) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  })

  const total = payments.filter(p => p.status === 'pago').reduce((s, p) => s + p.amount, 0)
  const pending = payments.filter(p => p.status === 'pendente').reduce((s, p) => s + p.amount, 0)
  const pendingCount = payments.filter(p => p.status === 'pendente').length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Financeiro</h1>
        <p className="text-muted-foreground text-sm">Controle de pagamentos e receitas</p>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-muted-foreground">Total Recebido</p>
              <div className="h-9 w-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-emerald-600">{formatCurrency(total)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-muted-foreground">Aguardando Pagamento</p>
              <div className="h-9 w-9 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                <Clock className="h-4 w-4 text-yellow-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-yellow-600">{formatCurrency(pending)}</p>
            <p className="text-xs text-muted-foreground mt-1">{pendingCount} pagamento(s) pendente(s)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-muted-foreground">Total de Transações</p>
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <DollarSign className="h-4 w-4 text-primary" />
              </div>
            </div>
            <p className="text-2xl font-bold">{payments.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue chart */}
      <Card>
        <CardHeader>
          <CardTitle>Faturamento por Mês</CardTitle>
          <CardDescription>Receita dos últimos 6 meses</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingChart ? <Skeleton className="h-48 w-full" /> : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={revenueChart}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tickFormatter={(v) => `Kz${(v/1000).toFixed(0)}k`} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip
                  formatter={(v: number) => [formatCurrency(v), 'Receita']}
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }}
                />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Payments list */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Pagamentos</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : payments.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <CreditCard className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>Nenhum pagamento registrado</p>
            </div>
          ) : (
            <div className="space-y-2">
              {payments.map((payment) => (
                <div key={payment.id} className="flex items-center gap-4 rounded-lg border p-3 hover:bg-muted/40 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {payment.appointment?.patient?.full_name ?? '—'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {payment.appointment?.service?.name ?? '—'} ·{' '}
                      {payment.paid_at ? formatDate(payment.paid_at) : formatDate(payment.created_at)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold">{formatCurrency(payment.amount)}</p>
                    {payment.method && (
                      <p className="text-xs text-muted-foreground">{getStatusLabel(payment.method)}</p>
                    )}
                  </div>
                  <span className={`shrink-0 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${getStatusColor(payment.status)}`}>
                    {getStatusLabel(payment.status)}
                  </span>
                  {payment.status === 'pendente' && (
                    <Button size="sm" variant="outline" className="shrink-0 h-7 text-xs" onClick={() => setPayingId(payment.id)}>
                      Registrar
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mark as paid dialog */}
      <Dialog open={!!payingId} onOpenChange={() => setPayingId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Registrar Pagamento</DialogTitle>
            <DialogDescription>Selecione a forma de pagamento</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Select onValueChange={(v) => setMethod(v as PaymentMethod)} defaultValue={method}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayingId(null)}>Cancelar</Button>
            <Button
              variant="success"
              loading={markPaidMutation.isPending}
              onClick={() => payingId && markPaidMutation.mutate({ id: payingId, method })}
            >
              Confirmar Pagamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
