'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  DollarSign, Clock, CheckCircle2, CreditCard,
  TrendingUp, FileText, Banknote,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import { paymentsService } from '@/services/payments'
import { Button } from '@/components/ui/button'
import {
  Card, CardContent, CardHeader,
  CardTitle, CardDescription, Skeleton,
} from '@/components/ui'
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { toast } from '@/hooks/useToast'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Payment, PaymentMethod } from '@/types'
import { usePermissions } from '@/hooks/usePermissions'

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'dinheiro',       label: '💵 Dinheiro' },
  { value: 'transferencia',  label: '🏦 Transferência Bancária' },
  { value: 'cartao_credito', label: '💳 Cartão de Crédito' },
  { value: 'cartao_debito',  label: '💳 Cartão de Débito' },
  { value: 'convenio',       label: '🏥 Convénio / Seguro' },
]

const METHOD_LABELS: Record<string, string> = {
  dinheiro:       'Dinheiro',
  transferencia:  'Transferência',
  cartao_credito: 'Cartão Crédito',
  cartao_debito:  'Cartão Débito',
  convenio:       'Convénio',
}

const STATUS_COLORS: Record<string, string> = {
  pago:        'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  pendente:    'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  cancelado:   'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  reembolsado: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
}

const STATUS_LABELS: Record<string, string> = {
  pago:        'Pago',
  pendente:    'Pendente',
  cancelado:   'Cancelado',
  reembolsado: 'Reembolsado',
}

// ─── Dialog de registo de pagamento ─────────────────────────────────────────
function PaymentDialog({
  payment,
  open,
  onClose,
}: { payment: Payment; open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [method, setMethod] = useState<PaymentMethod>('dinheiro')

  const mutation = useMutation({
    mutationFn: () => paymentsService.markAsPaid(payment.id, method),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      queryClient.invalidateQueries({ queryKey: ['revenue-today'] })
      queryClient.invalidateQueries({ queryKey: ['revenue-chart-financial'] })
      toast({ title: 'Pagamento registado com sucesso!', variant: 'success' as any })
      onClose()
    },
    onError: (err: any) =>
      toast({ title: 'Erro ao registar pagamento', description: err.message, variant: 'destructive' }),
  })

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Registar Pagamento</DialogTitle>
          <DialogDescription>
            Confirme o recebimento do pagamento abaixo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Resumo do pagamento */}
          <div className="rounded-lg bg-muted p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Paciente</span>
              <span className="font-medium">{payment.appointment?.patient?.full_name ?? '—'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Serviço</span>
              <span className="font-medium">{payment.appointment?.service?.name ?? '—'}</span>
            </div>
            <div className="flex justify-between text-sm font-semibold">
              <span>Valor</span>
              <span className="text-primary text-base">{formatCurrency(payment.amount)}</span>
            </div>
          </div>

          {/* Forma de pagamento */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Forma de Pagamento *</label>
            <Select onValueChange={(v) => setMethod(v as PaymentMethod)} defaultValue={method}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map(m => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {mutation.isPending ? 'Confirmando...' : 'Confirmar Recebimento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── View principal ──────────────────────────────────────────────────────────
export function FinancialView() {
  const { isAdmin, isReceptionist } = usePermissions()  // ← booleanos
  const [payingPayment, setPayingPayment] = useState<Payment | null>(null)
  const [filterStatus, setFilterStatus]  = useState<string>('todos')

  // Acesso negado para médicos
  if (!isAdmin && !isReceptionist) {
    return (
      <div className="py-24 text-center">
        <DollarSign className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
        <h2 className="text-xl font-bold mb-2">Acesso Negado</h2>
        <p className="text-muted-foreground">Não tem permissão para aceder à área financeira.</p>
      </div>
    )
  }

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['payments'],
    queryFn: paymentsService.getAll,
  })

  const { data: revenueChart = [], isLoading: loadingChart } = useQuery({
    queryKey: ['revenue-chart-financial'],
    queryFn: () => paymentsService.getRevenueByMonth(6),
  })

  // Totais calculados
  const totalRecebido  = payments.filter(p => p.status === 'pago').reduce((s, p) => s + p.amount, 0)
  const totalPendente  = payments.filter(p => p.status === 'pendente').reduce((s, p) => s + p.amount, 0)
  const countPendente  = payments.filter(p => p.status === 'pendente').length

  // Filtro local
  const filtered = filterStatus === 'todos'
    ? payments
    : payments.filter(p => p.status === filterStatus)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Financeiro</h1>
        <p className="text-muted-foreground text-sm">Controlo de pagamentos e receitas</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-muted-foreground">Total Recebido</p>
              <div className="h-9 w-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalRecebido)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-muted-foreground">A Receber</p>
              <div className="h-9 w-9 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                <Clock className="h-4 w-4 text-yellow-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-yellow-600">{formatCurrency(totalPendente)}</p>
            <p className="text-xs text-muted-foreground mt-1">{countPendente} pagamento(s) pendente(s)</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-muted-foreground">Total de Transacções</p>
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="h-4 w-4 text-primary" />
              </div>
            </div>
            <p className="text-2xl font-bold">{payments.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de faturamento */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Faturamento Mensal
          </CardTitle>
          <CardDescription>Receita recebida nos últimos 6 meses</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingChart ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={revenueChart} margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 91%)" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip
                  formatter={(v: number) => [formatCurrency(v), 'Receita']}
                  labelStyle={{ fontWeight: 600 }}
                />
                <Bar dataKey="value" fill="hsl(221 83% 53%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Histórico de pagamentos */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="flex items-center gap-2">
              <Banknote className="h-4 w-4" />
              Histórico de Pagamentos
            </CardTitle>
            {/* Filtro de status */}
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="pendente">Pendentes</SelectItem>
                <SelectItem value="pago">Pagos</SelectItem>
                <SelectItem value="cancelado">Cancelados</SelectItem>
                <SelectItem value="reembolsado">Reembolsados</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <CreditCard className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>Nenhum pagamento encontrado</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/40 transition-colors"
                >
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {payment.appointment?.patient?.full_name ?? '—'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {payment.appointment?.service?.name ?? '—'}
                      {' · '}
                      {payment.paid_at
                        ? formatDate(payment.paid_at)
                        : formatDate(payment.created_at)}
                    </p>
                    {payment.method && (
                      <p className="text-xs text-muted-foreground">
                        {METHOD_LABELS[payment.method] ?? payment.method}
                      </p>
                    )}
                  </div>

                  {/* Valor */}
                  <div className="text-right shrink-0">
                    <p className="font-semibold">{formatCurrency(payment.amount)}</p>
                  </div>

                  {/* Status badge */}
                  <span className={`shrink-0 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[payment.status] ?? ''}`}>
                    {STATUS_LABELS[payment.status] ?? payment.status}
                  </span>

                  {/* Botão registar (só para pendentes) */}
                  {payment.status === 'pendente' && (
                    <Button
                      size="sm"
                      className="shrink-0 h-7 text-xs bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => setPayingPayment(payment)}
                    >
                      Receber
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de pagamento */}
      {payingPayment && (
        <PaymentDialog
          payment={payingPayment}
          open={!!payingPayment}
          onClose={() => setPayingPayment(null)}
        />
      )}
    </div>
  )
}
