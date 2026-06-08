'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Plus, Calendar, ChevronLeft, ChevronRight,
  Edit2, XCircle, CheckCircle2, Ban, Clock, AlertCircle,
} from 'lucide-react'
import {
  format, addDays, subDays,
  startOfWeek, endOfWeek, eachDayOfInterval,
  isSameDay, parseISO,
} from 'date-fns'
import { pt } from 'date-fns/locale'
import { appointmentsService } from '@/services/appointments'
import { patientsService } from '@/services/patients'
import { servicesService } from '@/services/services'
import { Button } from '@/components/ui/button'
import {
  Card, CardContent, Input, Label,
  Textarea, Skeleton,
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
import { formatCurrency, getStatusColor, getStatusLabel } from '@/lib/utils'
import type { Appointment, AppointmentStatus } from '@/types'
import { useAuthStore } from '@/store/auth'
import { usePermissions } from '@/hooks/usePermissions'

// ─── Schemas ──────────────────────────────────────────────────────────────────
const appointmentSchema = z.object({
  patient_id:   z.string().min(1, 'Seleccione um paciente'),
  service_id:   z.string().min(1, 'Seleccione um serviço'),
  doctor_id:    z.string().min(1, 'Seleccione um médico'),
  scheduled_at: z.string().min(1, 'Data e hora obrigatórias'),
  notes:        z.string().optional(),
})
type AppointmentFormData = z.infer<typeof appointmentSchema>

const rejectSchema = z.object({
  rejection_reason: z.string().min(5, 'Descreva o motivo (mínimo 5 caracteres)'),
})
type RejectFormData = z.infer<typeof rejectSchema>

// ─── Formulário de agendamento (recepção / admin) ─────────────────────────────
function AppointmentForm({
  appointment,
  defaultDate,
  onClose,
}: { appointment?: Appointment; defaultDate: string; onClose: () => void }) {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: () => patientsService.getAll(),
  })
  const { data: services = [] } = useQuery({
    queryKey: ['services-active'],
    queryFn: () => servicesService.getAll(true),
  })
  const { data: doctors = [], isLoading: loadingDoctors } = useQuery({
    queryKey: ['doctors'],
    queryFn: () => appointmentsService.getDoctors(),
  })

  const initDate = appointment?.scheduled_at
    ? appointment.scheduled_at.slice(0, 16)
    : defaultDate

  const {
    register, handleSubmit, setValue, watch,
    formState: { errors, isSubmitting },
  } = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: appointment
      ? { ...appointment, scheduled_at: initDate }
      : { scheduled_at: initDate },
  })

  const mutation = useMutation({
    mutationFn: (data: AppointmentFormData) =>
      appointment
        ? appointmentsService.update(appointment.id, data)
        : appointmentsService.create({ ...data, created_by: user!.id, status: 'agendado' }),
    onSuccess: (result) => {
      // Actualizar cache imediatamente sem esperar pelo Realtime
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      queryClient.invalidateQueries({ queryKey: ['appointments-today-count'] })
      toast({
        title: appointment ? 'Consulta actualizada!' : '✅ Consulta agendada com sucesso!',
        description: appointment
          ? undefined
          : `A consulta de ${result.patient?.full_name ?? 'paciente'} foi agendada. O médico receberá uma notificação.`,
        variant: 'success' as any,
      })
      onClose()
    },
    onError: (err: any) =>
      toast({ title: 'Erro ao agendar', description: err.message, variant: 'destructive' }),
  })

  const selectedService = services.find(s => s.id === watch('service_id'))
  const selectedDoctor  = doctors.find(d => d.id === watch('doctor_id'))

  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {/* Paciente */}
        <div className="col-span-2 space-y-2">
          <Label>Paciente *</Label>
          <Select
            onValueChange={(v) => setValue('patient_id', v, { shouldValidate: true })}
            defaultValue={appointment?.patient_id}
          >
            <SelectTrigger><SelectValue placeholder="Seleccione um paciente" /></SelectTrigger>
            <SelectContent>
              {patients.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.patient_id && <p className="text-xs text-destructive">{errors.patient_id.message}</p>}
        </div>

        {/* Médico */}
        <div className="col-span-2 space-y-2">
          <Label>Médico *</Label>
          <Select
            onValueChange={(v) => setValue('doctor_id', v, { shouldValidate: true })}
            defaultValue={appointment?.doctor_id}
          >
            <SelectTrigger>
              <SelectValue placeholder={
                loadingDoctors ? 'A carregar médicos...' : 'Seleccione um médico'
              } />
            </SelectTrigger>
            <SelectContent>
              {doctors.length === 0 && !loadingDoctors ? (
                <div className="p-3 text-xs text-muted-foreground text-center">
                  Nenhum médico activo encontrado
                </div>
              ) : (
                doctors.map(d => (
                  <SelectItem key={d.id} value={d.id}>
                    Dr. {d.full_name}{d.specialty ? ` — ${d.specialty}` : ''}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          {errors.doctor_id && <p className="text-xs text-destructive">{errors.doctor_id.message}</p>}
        </div>

        {/* Serviço */}
        <div className="col-span-2 space-y-2">
          <Label>Serviço *</Label>
          <Select
            onValueChange={(v) => setValue('service_id', v, { shouldValidate: true })}
            defaultValue={appointment?.service_id}
          >
            <SelectTrigger><SelectValue placeholder="Seleccione um serviço" /></SelectTrigger>
            <SelectContent>
              {services.map(s => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name} — {formatCurrency(s.price)} ({s.duration_minutes}min)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.service_id && <p className="text-xs text-destructive">{errors.service_id.message}</p>}
        </div>

        {/* Data e hora */}
        <div className="col-span-2 space-y-2">
          <Label>Data e hora *</Label>
          <Input type="datetime-local" {...register('scheduled_at')} />
          {errors.scheduled_at && <p className="text-xs text-destructive">{errors.scheduled_at.message}</p>}
        </div>

        {/* Observações */}
        <div className="col-span-2 space-y-2">
          <Label>Observações</Label>
          <Textarea placeholder="Observações sobre a consulta..." rows={2} {...register('notes')} />
        </div>
      </div>

      {/* Resumo do serviço seleccionado */}
      {selectedService && (
        <div className="rounded-lg bg-muted p-3 text-sm space-y-1">
          <p className="font-medium">{selectedService.name}</p>
          <p className="text-muted-foreground">
            Duração: {selectedService.duration_minutes} min · Valor: {formatCurrency(selectedService.price)}
            {selectedDoctor ? ` · Dr. ${selectedDoctor.full_name}` : ''}
          </p>
        </div>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
        <Button type="submit" disabled={isSubmitting || mutation.isPending}>
          {isSubmitting || mutation.isPending
            ? 'A guardar...'
            : appointment ? 'Guardar alterações' : 'Confirmar Agendamento'}
        </Button>
      </DialogFooter>
    </form>
  )
}

// ─── Modal de rejeição com motivo (médico) ────────────────────────────────────
function RejectDialog({
  appointment,
  open,
  onClose,
}: { appointment: Appointment; open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient()
  const {
    register, handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RejectFormData>({
    resolver: zodResolver(rejectSchema),
  })

  const mutation = useMutation({
    mutationFn: (data: RejectFormData) =>
      appointmentsService.updateStatus(appointment.id, 'rejeitado', data.rejection_reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      toast({ title: '❌ Agendamento rejeitado', description: 'A recepção foi notificada.', variant: 'destructive' })
      onClose()
    },
    onError: (err: any) =>
      toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  })

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-destructive" />
            Rejeitar Consulta
          </DialogTitle>
          <DialogDescription>
            Indique o motivo. A recepção receberá uma notificação automática.
          </DialogDescription>
        </DialogHeader>

        {/* Resumo do agendamento */}
        <div className="rounded-lg bg-muted p-3 text-sm space-y-1">
          <p className="font-medium">{appointment.patient?.full_name ?? '—'}</p>
          <p className="text-muted-foreground">
            {appointment.service?.name ?? '—'} · {format(parseISO(appointment.scheduled_at), 'dd/MM/yyyy HH:mm')}
          </p>
        </div>

        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
          <div className="space-y-2">
            <Label>Motivo da rejeição *</Label>
            <Textarea
              placeholder="Ex: Indisponibilidade de agenda, conflito de horário..."
              rows={3}
              {...register('rejection_reason')}
            />
            {errors.rejection_reason && (
              <p className="text-xs text-destructive">{errors.rejection_reason.message}</p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" variant="destructive" disabled={isSubmitting || mutation.isPending}>
              {isSubmitting || mutation.isPending ? 'A rejeitar...' : 'Confirmar Rejeição'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Card de agendamento ─────────────────────────────────────────────────────
function AppointmentCard({
  apt, isAdmin, isReceptionist, isDoctor,
  onEdit, onCancel, onAccept, onReject, onMarkDone,
}: {
  apt: Appointment
  isAdmin: boolean
  isReceptionist: boolean
  isDoctor: boolean
  onEdit: () => void
  onCancel: () => void
  onAccept: () => void
  onReject: () => void
  onMarkDone: () => void
}) {
  const isRejected = apt.status === 'rejeitado'

  return (
    <Card className={`transition-shadow group ${isRejected ? 'border-red-200 dark:border-red-900/50' : 'hover:shadow-md'}`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          {/* Hora */}
          <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-primary/10 text-primary">
            <span className="text-sm font-bold leading-none">
              {format(parseISO(apt.scheduled_at), 'HH:mm')}
            </span>
            <span className="text-[10px] opacity-60 mt-0.5">
              {format(parseISO(apt.scheduled_at), 'dd/MM')}
            </span>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold truncate">{apt.patient?.full_name ?? '—'}</p>
              <span className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${getStatusColor(apt.status)}`}>
                {getStatusLabel(apt.status)}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{apt.service?.name ?? '—'}</p>
            <p className="text-xs text-muted-foreground opacity-70">Dr. {apt.doctor?.full_name ?? '—'}</p>
          </div>

          {/* ── Acções Recepção / Admin ── */}
          {(isAdmin || isReceptionist) && apt.status === 'agendado' && (
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onEdit} title="Editar">
                <Edit2 className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="icon" variant="ghost"
                className="h-8 w-8 hover:text-destructive"
                onClick={onCancel} title="Cancelar"
              >
                <XCircle className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          {/* ── Acções Médico: Aceitar / Rejeitar ── */}
          {isDoctor && apt.status === 'agendado' && (
            <div className="flex gap-2 shrink-0">
              <Button
                size="sm" variant="outline"
                className="h-8 text-xs border-emerald-500 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                onClick={onAccept}
              >
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                Aceitar
              </Button>
              <Button
                size="sm" variant="outline"
                className="h-8 text-xs border-red-400 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                onClick={onReject}
              >
                <Ban className="h-3.5 w-3.5 mr-1" />
                Rejeitar
              </Button>
            </div>
          )}

          {/* ── Médico: marcar como Realizado ── */}
          {isDoctor && apt.status === 'confirmado' && (
            <Button
              size="sm" variant="outline"
              className="h-8 text-xs border-blue-400 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 shrink-0"
              onClick={onMarkDone}
            >
              <Clock className="h-3.5 w-3.5 mr-1" />
              Realizado
            </Button>
          )}
        </div>

        {/* Notas */}
        {apt.notes && (
          <p className="mt-2 text-xs text-muted-foreground bg-muted rounded px-2 py-1.5">
            💬 {apt.notes}
          </p>
        )}

        {/* Motivo de rejeição — visível para recepção e admin */}
        {apt.status === 'rejeitado' && (apt as any).rejection_reason && (
          <div className="mt-2 flex items-start gap-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded px-2 py-1.5">
            <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span><strong>Motivo de rejeição:</strong> {(apt as any).rejection_reason}</span>
          </div>
        )}

        {/* Motivo de cancelamento */}
        {apt.cancelled_reason && (
          <p className="mt-2 text-xs text-destructive bg-destructive/10 rounded px-2 py-1.5">
            🚫 Cancelado: {apt.cancelled_reason}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

// ─── View principal ──────────────────────────────────────────────────────────
export function AppointmentsView() {
  const queryClient = useQueryClient()
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [dialogOpen, setDialogOpen]     = useState(false)
  const [selectedAppt, setSelectedAppt] = useState<Appointment | undefined>()
  const [rejectAppt, setRejectAppt]     = useState<Appointment | null>(null)
  const { user } = useAuthStore()
  const { isAdmin, isReceptionist, isDoctor } = usePermissions()

  const dateStr = format(selectedDate, 'yyyy-MM-dd')

  // CORRECÇÃO PRINCIPAL: médico só vê os seus agendamentos
  const queryFilters = {
    date: dateStr,
    ...(isDoctor && user?.id ? { doctor_id: user.id } : {}),
  }

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['appointments', dateStr, user?.id, isDoctor],
    queryFn: () => appointmentsService.getAll(queryFilters),
    enabled: !!user,
  })

  // ── Realtime: actualizar lista quando há INSERT ou UPDATE na BD ──
  useEffect(() => {
    if (!user) return
    const unsubscribe = appointmentsService.subscribe(
      queryFilters,
      {
        onInsert: (newApt) => {
          queryClient.setQueryData<Appointment[]>(
            ['appointments', dateStr, user.id, isDoctor],
            (old = []) => {
              // Só adicionar se for do mesmo dia
              const aptDate = format(parseISO(newApt.scheduled_at), 'yyyy-MM-dd')
              if (aptDate !== dateStr) return old
              // Evitar duplicados
              if (old.find(a => a.id === newApt.id)) return old
              return [...old, newApt].sort(
                (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
              )
            }
          )
        },
        onUpdate: (updatedApt) => {
          queryClient.setQueryData<Appointment[]>(
            ['appointments', dateStr, user.id, isDoctor],
            (old = []) => old.map(a => a.id === updatedApt.id ? updatedApt : a)
          )
        },
        onDelete: (deletedId) => {
          queryClient.setQueryData<Appointment[]>(
            ['appointments', dateStr, user.id, isDoctor],
            (old = []) => old.filter(a => a.id !== deletedId)
          )
        },
      }
    )
    return unsubscribe
  }, [dateStr, user?.id, isDoctor])

  // ── Mutações ──
  const cancelMutation = useMutation({
    mutationFn: (id: string) => appointmentsService.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      toast({ title: 'Consulta cancelada', variant: 'success' as any })
    },
    onError: (err: any) =>
      toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: AppointmentStatus }) =>
      appointmentsService.updateStatus(id, status),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      const labels: Record<string, string> = {
        confirmado: '✅ Consulta aceite! A recepção foi notificada.',
        realizado:  '✅ Consulta marcada como realizada.',
      }
      toast({ title: labels[vars.status] ?? `Estado: ${vars.status}`, variant: 'success' as any })
    },
    onError: (err: any) =>
      toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  })

  // ── Navegação semanal ──
  const weekDays = eachDayOfInterval({
    start: startOfWeek(selectedDate, { weekStartsOn: 1 }), // começa segunda
    end:   endOfWeek(selectedDate,   { weekStartsOn: 1 }),
  })

  const pendingCount = appointments.filter(a => a.status === 'agendado').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Agendamentos</h1>
          <p className="text-muted-foreground text-sm">
            {appointments.length} consulta(s) em {format(selectedDate, "dd 'de' MMMM", { locale: pt })}
            {isDoctor && pendingCount > 0 && (
              <span className="ml-2 inline-flex items-center rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-xs font-semibold px-2 py-0.5">
                {pendingCount} a aguardar resposta
              </span>
            )}
          </p>
        </div>
        {(isAdmin || isReceptionist) && (
          <Button onClick={() => { setSelectedAppt(undefined); setDialogOpen(true) }}>
            <Plus className="h-4 w-4 mr-2" />Agendar Consulta
          </Button>
        )}
      </div>

      {/* Navegador semanal */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="icon" onClick={() => setSelectedDate(d => subDays(d, 7))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <p className="font-semibold capitalize text-sm">
              {format(selectedDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: pt })}
            </p>
            <Button variant="ghost" size="icon" onClick={() => setSelectedDate(d => addDays(d, 7))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {weekDays.map((day) => {
              const isToday    = isSameDay(day, new Date())
              const isSelected = isSameDay(day, selectedDate)
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(day)}
                  className={`flex flex-col items-center rounded-lg p-2 text-sm transition-colors ${
                    isSelected ? 'bg-primary text-primary-foreground' :
                    isToday    ? 'bg-primary/10 text-primary font-semibold' :
                                 'hover:bg-muted'
                  }`}
                >
                  <span className="text-xs opacity-70 capitalize">
                    {format(day, 'EEE', { locale: pt })}
                  </span>
                  <span className="font-semibold">{format(day, 'd')}</span>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Banner informativo para médico com consultas pendentes */}
      {isDoctor && pendingCount > 0 && (
        <div className="flex items-center gap-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 px-4 py-3">
          <AlertCircle className="h-5 w-5 text-yellow-600 shrink-0" />
          <p className="text-sm text-yellow-700 dark:text-yellow-400">
            Tens <strong>{pendingCount}</strong> consulta(s) a aguardar a tua resposta hoje.
            Aceita ou rejeita cada uma para informar a recepção.
          </p>
        </div>
      )}

      {/* Lista de agendamentos */}
      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : appointments.length === 0 ? (
        <div className="py-20 text-center">
          <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
          <p className="text-muted-foreground font-medium">Nenhuma consulta para este dia</p>
          {(isAdmin || isReceptionist) && (
            <Button
              variant="outline" className="mt-4"
              onClick={() => { setSelectedAppt(undefined); setDialogOpen(true) }}
            >
              <Plus className="h-4 w-4 mr-2" />Agendar consulta
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {appointments.map((apt) => (
            <AppointmentCard
              key={apt.id}
              apt={apt}
              isAdmin={isAdmin}
              isReceptionist={isReceptionist}
              isDoctor={isDoctor}
              onEdit={() => { setSelectedAppt(apt); setDialogOpen(true) }}
              onCancel={() => cancelMutation.mutate(apt.id)}
              onAccept={() => statusMutation.mutate({ id: apt.id, status: 'confirmado' })}
              onReject={() => setRejectAppt(apt)}
              onMarkDone={() => statusMutation.mutate({ id: apt.id, status: 'realizado' })}
            />
          ))}
        </div>
      )}

      {/* Dialog: criar/editar (recepção/admin) */}
      {(isAdmin || isReceptionist) && (
        <Dialog open={dialogOpen} onOpenChange={(v) => { if (!v) setDialogOpen(false) }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{selectedAppt ? 'Editar Consulta' : 'Nova Consulta'}</DialogTitle>
              <DialogDescription>Preencha os dados da consulta</DialogDescription>
            </DialogHeader>
            {dialogOpen && (
              <AppointmentForm
                appointment={selectedAppt}
                defaultDate={`${dateStr}T${format(new Date(), 'HH:mm')}`}
                onClose={() => setDialogOpen(false)}
              />
            )}
          </DialogContent>
        </Dialog>
      )}

      {/* Dialog: rejeitar (médico) */}
      {rejectAppt && (
        <RejectDialog
          appointment={rejectAppt}
          open={!!rejectAppt}
          onClose={() => setRejectAppt(null)}
        />
      )}
    </div>
  )
}
