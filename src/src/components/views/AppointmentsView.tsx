'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Plus, Calendar, ChevronLeft, ChevronRight,
  Edit2, XCircle, CheckCircle2, Ban, Clock,
} from 'lucide-react'
import { format, addDays, subDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { appointmentsService } from '@/services/appointments'
import { patientsService } from '@/services/patients'
import { servicesService } from '@/services/services'
import { Button } from '@/components/ui/button'
import { Card, CardContent, Input, Label, Textarea, Skeleton } from '@/components/ui'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/hooks/useToast'
import { formatCurrency, getStatusColor, getStatusLabel } from '@/lib/utils'
import type { Appointment, AppointmentStatus } from '@/types'
import { useAuthStore } from '@/store/auth'
import { usePermissions } from '@/hooks/usePermissions'

// ─── Schema para criar/editar agendamento (recepção/admin) ───────────────────
const appointmentSchema = z.object({
  patient_id: z.string().min(1, 'Selecione um paciente'),
  service_id: z.string().min(1, 'Selecione um serviço'),
  doctor_id: z.string().min(1, 'Selecione um médico'),
  scheduled_at: z.string().min(1, 'Data e hora obrigatórias'),
  notes: z.string().optional(),
})
type AppointmentFormData = z.infer<typeof appointmentSchema>

// ─── Schema para rejeitar agendamento (médico) ───────────────────────────────
const rejectSchema = z.object({
  rejection_reason: z.string().min(5, 'Descreva o motivo da rejeição'),
})
type RejectFormData = z.infer<typeof rejectSchema>

// ─── Formulário de criação/edição (só recepção e admin) ─────────────────────
function AppointmentForm({ appointment, onClose }: { appointment?: Appointment; onClose: () => void }) {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  const { data: patients = [] } = useQuery({ queryKey: ['patients'], queryFn: () => patientsService.getAll() })
  const { data: services = [] } = useQuery({ queryKey: ['services-active'], queryFn: () => servicesService.getAll(true) })
  // Buscar apenas médicos activos para o select
  const { data: doctors = [] } = useQuery({
    queryKey: ['doctors'],
    queryFn: () => appointmentsService.getDoctors(),
  })

  const defaultDate = appointment?.scheduled_at
    ? appointment.scheduled_at.slice(0, 16)
    : format(new Date(), "yyyy-MM-dd'T'HH:mm")

  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: appointment
      ? { ...appointment, scheduled_at: defaultDate }
      : { scheduled_at: defaultDate },
  })

  const mutation = useMutation({
    mutationFn: (data: AppointmentFormData) =>
      appointment
        ? appointmentsService.update(appointment.id, data)
        : appointmentsService.create({ ...data, created_by: user!.id, status: 'agendado' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      queryClient.invalidateQueries({ queryKey: ['appointments-today-count'] })
      queryClient.invalidateQueries({ queryKey: ['appointments-today-list'] })
      toast({ title: appointment ? 'Consulta atualizada!' : 'Consulta agendada!', variant: 'success' as any })
      onClose()
    },
    onError: (err: any) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  })

  const selectedService = services.find(s => s.id === watch('service_id'))

  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 space-y-2">
          <Label>Paciente *</Label>
          <Select onValueChange={(v) => setValue('patient_id', v)} defaultValue={appointment?.patient_id}>
            <SelectTrigger><SelectValue placeholder="Selecione um paciente" /></SelectTrigger>
            <SelectContent>
              {patients.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}
            </SelectContent>
          </Select>
          {errors.patient_id && <p className="text-xs text-destructive">{errors.patient_id.message}</p>}
        </div>

        <div className="col-span-2 space-y-2">
          <Label>Médico *</Label>
          <Select onValueChange={(v) => setValue('doctor_id', v)} defaultValue={appointment?.doctor_id}>
            <SelectTrigger><SelectValue placeholder="Selecione um médico" /></SelectTrigger>
            <SelectContent>
              {doctors.map(d => (
                <SelectItem key={d.id} value={d.id}>
                  {d.full_name}{d.specialty ? ` — ${d.specialty}` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.doctor_id && <p className="text-xs text-destructive">{errors.doctor_id.message}</p>}
        </div>

        <div className="col-span-2 space-y-2">
          <Label>Serviço *</Label>
          <Select onValueChange={(v) => setValue('service_id', v)} defaultValue={appointment?.service_id}>
            <SelectTrigger><SelectValue placeholder="Selecione um serviço" /></SelectTrigger>
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

        <div className="col-span-2 space-y-2">
          <Label>Data e hora *</Label>
          <Input type="datetime-local" {...register('scheduled_at')} />
          {errors.scheduled_at && <p className="text-xs text-destructive">{errors.scheduled_at.message}</p>}
        </div>

        <div className="col-span-2 space-y-2">
          <Label>Observações</Label>
          <Textarea placeholder="Observações sobre a consulta..." {...register('notes')} />
        </div>
      </div>

      {selectedService && (
        <div className="rounded-lg bg-muted p-3 text-sm">
          <p className="font-medium">{selectedService.name}</p>
          <p className="text-muted-foreground">Duração: {selectedService.duration_minutes} min · Valor: {formatCurrency(selectedService.price)}</p>
        </div>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Salvando...' : appointment ? 'Salvar' : 'Agendar'}
        </Button>
      </DialogFooter>
    </form>
  )
}

// ─── Modal de rejeição (médico) ──────────────────────────────────────────────
function RejectDialog({
  appointmentId,
  open,
  onClose,
}: { appointmentId: string; open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient()
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RejectFormData>({
    resolver: zodResolver(rejectSchema),
  })

  const mutation = useMutation({
    mutationFn: (data: RejectFormData) =>
      appointmentsService.updateStatus(appointmentId, 'rejeitado', data.rejection_reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      toast({ title: 'Agendamento rejeitado', variant: 'success' as any })
      onClose()
    },
    onError: (err: any) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  })

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Rejeitar Agendamento</DialogTitle>
          <DialogDescription>Indique o motivo da rejeição para informar a recepção.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
          <div className="space-y-2">
            <Label>Motivo *</Label>
            <Textarea placeholder="Ex: Agenda cheia, conflito de horário..." {...register('rejection_reason')} />
            {errors.rejection_reason && <p className="text-xs text-destructive">{errors.rejection_reason.message}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" variant="destructive" disabled={isSubmitting}>
              {isSubmitting ? 'Rejeitando...' : 'Confirmar Rejeição'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Card de agendamento ─────────────────────────────────────────────────────
function AppointmentCard({
  apt,
  onEdit,
  onCancel,
  onAccept,
  onReject,
  isAdmin,
  isReceptionist,
  isDoctor,
}: {
  apt: Appointment
  onEdit: () => void
  onCancel: () => void
  onAccept: () => void
  onReject: () => void
  isAdmin: boolean
  isReceptionist: boolean
  isDoctor: boolean
}) {
  return (
    <Card className="hover:shadow-md transition-shadow group">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-primary/10 text-primary">
            <span className="text-sm font-bold leading-none">
              {format(parseISO(apt.scheduled_at), 'HH:mm')}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold truncate">{apt.patient?.full_name ?? '—'}</p>
              <span className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${getStatusColor(apt.status)}`}>
                {getStatusLabel(apt.status)}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{apt.service?.name ?? '—'}</p>
            <p className="text-xs text-muted-foreground">Dr. {apt.doctor?.full_name ?? '—'}</p>
          </div>

          {/* Acções para Recepção / Admin */}
          {(isAdmin || isReceptionist) && apt.status === 'agendado' && (
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onEdit} title="Editar">
                <Edit2 className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="icon" variant="ghost"
                className="h-8 w-8 hover:text-destructive"
                onClick={onCancel}
                title="Cancelar"
              >
                <XCircle className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          {/* Acções para Médico — só em agendamentos no estado "agendado" */}
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

          {/* Médico: agendamento já confirmado — opção de marcar como realizado */}
          {isDoctor && apt.status === 'confirmado' && (
            <Button
              size="sm" variant="outline"
              className="h-8 text-xs border-blue-400 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 shrink-0"
              onClick={onAccept}
            >
              <Clock className="h-3.5 w-3.5 mr-1" />
              Realizado
            </Button>
          )}
        </div>

        {apt.notes && (
          <p className="mt-2 text-xs text-muted-foreground bg-muted rounded px-2 py-1">{apt.notes}</p>
        )}
        {apt.cancelled_reason && (
          <p className="mt-1 text-xs text-destructive bg-destructive/10 rounded px-2 py-1">
            Cancelado: {apt.cancelled_reason}
          </p>
        )}
        {(apt as any).rejection_reason && (
          <p className="mt-1 text-xs text-orange-600 bg-orange-50 dark:bg-orange-900/20 rounded px-2 py-1">
            Rejeitado: {(apt as any).rejection_reason}
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
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedAppt, setSelectedAppt] = useState<Appointment | undefined>()
  const [rejectId, setRejectId] = useState<string | null>(null)
  const { user } = useAuthStore()
  const { isAdmin, isReceptionist, isDoctor } = usePermissions()

  const dateStr = format(selectedDate, 'yyyy-MM-dd')

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['appointments', dateStr],
    queryFn: () => appointmentsService.getAll({ date: dateStr }),
  })

  const cancelMutation = useMutation({
    mutationFn: (id: string) => appointmentsService.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      toast({ title: 'Consulta cancelada', variant: 'success' as any })
    },
    onError: (err: any) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: AppointmentStatus }) =>
      appointmentsService.updateStatus(id, status),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      const label = vars.status === 'confirmado' ? 'aceite' : vars.status === 'realizado' ? 'marcado como realizado' : vars.status
      toast({ title: `Agendamento ${label}!`, variant: 'success' as any })
    },
    onError: (err: any) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  })

  const weekDays = eachDayOfInterval({
    start: startOfWeek(selectedDate, { weekStartsOn: 0 }),
    end: endOfWeek(selectedDate, { weekStartsOn: 0 }),
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Agendamentos</h1>
          <p className="text-muted-foreground text-sm">
            {appointments.length} consulta(s) em {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
          </p>
        </div>
        {/* Só recepção e admin podem criar agendamentos */}
        {(isAdmin || isReceptionist) && (
          <Button onClick={() => { setSelectedAppt(undefined); setDialogOpen(true) }}>
            <Plus className="h-4 w-4 mr-2" />Agendar
          </Button>
        )}
      </div>

      {/* Navegação de datas */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="icon" onClick={() => setSelectedDate(d => subDays(d, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <p className="font-semibold capitalize text-sm">
              {format(selectedDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
            <Button variant="ghost" size="icon" onClick={() => setSelectedDate(d => addDays(d, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {weekDays.map((day) => {
              const isToday = isSameDay(day, new Date())
              const isSelected = isSameDay(day, selectedDate)
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(day)}
                  className={`flex flex-col items-center rounded-lg p-2 text-sm transition-colors ${
                    isSelected ? 'bg-primary text-primary-foreground' :
                    isToday    ? 'bg-primary/10 text-primary' :
                                 'hover:bg-muted'
                  }`}
                >
                  <span className="text-xs opacity-70 capitalize">{format(day, 'EEE', { locale: ptBR })}</span>
                  <span className="font-semibold">{format(day, 'd')}</span>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Lista */}
      {isLoading ? (
        <div className="space-y-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : appointments.length === 0 ? (
        <div className="py-20 text-center">
          <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
          <p className="text-muted-foreground">Nenhuma consulta para este dia</p>
          {(isAdmin || isReceptionist) && (
            <Button variant="outline" className="mt-4" onClick={() => { setSelectedAppt(undefined); setDialogOpen(true) }}>
              Agendar consulta
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
              onAccept={() => {
                const nextStatus: AppointmentStatus = apt.status === 'confirmado' ? 'realizado' : 'confirmado'
                statusMutation.mutate({ id: apt.id, status: nextStatus })
              }}
              onReject={() => setRejectId(apt.id)}
            />
          ))}
        </div>
      )}

      {/* Dialog: criar/editar (recepção/admin) */}
      {(isAdmin || isReceptionist) && (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{selectedAppt ? 'Editar Consulta' : 'Nova Consulta'}</DialogTitle>
              <DialogDescription>Preencha os dados da consulta</DialogDescription>
            </DialogHeader>
            <AppointmentForm appointment={selectedAppt} onClose={() => setDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      )}

      {/* Dialog: rejeitar (médico) */}
      {rejectId && (
        <RejectDialog
          appointmentId={rejectId}
          open={!!rejectId}
          onClose={() => setRejectId(null)}
        />
      )}
    </div>
  )
}
