import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Search, Calendar, ChevronLeft, ChevronRight, Edit2, XCircle } from 'lucide-react'
import { format, addDays, subDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { appointmentsService } from '@/services/appointments'
import { patientsService } from '@/services/patients'
import { servicesService } from '@/services/services'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, Input, Label, Textarea, Skeleton } from '@/components/ui/index'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/hooks/useToast'
import { formatDateTime, getStatusColor, getStatusLabel, formatCurrency } from '@/utils'
import type { Appointment, AppointmentStatus } from '@/types'
import { useAuthStore } from '@/store/auth'

const appointmentSchema = z.object({
  patient_id: z.string().min(1, 'Selecione um paciente'),
  service_id: z.string().min(1, 'Selecione um serviço'),
  doctor_id: z.string().min(1, 'Selecione um médico'),
  scheduled_at: z.string().min(1, 'Data e hora obrigatórias'),
  status: z.enum(['agendado','confirmado','realizado','cancelado','falta']),
  notes: z.string().optional(),
})

type AppointmentFormData = z.infer<typeof appointmentSchema>

function AppointmentForm({ appointment, onClose }: { appointment?: Appointment; onClose: () => void }) {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  const { data: patients = [] } = useQuery({ queryKey: ['patients'], queryFn: () => patientsService.getAll() })
  const { data: services = [] } = useQuery({ queryKey: ['services-active'], queryFn: () => servicesService.getAll(true) })

  const defaultDate = appointment?.scheduled_at
    ? appointment.scheduled_at.slice(0, 16)
    : format(new Date(), "yyyy-MM-dd'T'HH:mm")

  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: appointment
      ? { ...appointment, scheduled_at: defaultDate }
      : { status: 'agendado', scheduled_at: defaultDate, doctor_id: user?.id },
  })

  const mutation = useMutation({
    mutationFn: (data: AppointmentFormData) =>
      appointment
        ? appointmentsService.update(appointment.id, data)
        : appointmentsService.create({ ...data, created_by: user!.id }),
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
          <Label>Status</Label>
          <Select onValueChange={(v) => setValue('status', v as AppointmentStatus)} defaultValue={watch('status')}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {(['agendado','confirmado','realizado','cancelado','falta'] as const).map(s => (
                <SelectItem key={s} value={s}>{getStatusLabel(s)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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
        <Button type="submit" loading={isSubmitting}>{appointment ? 'Salvar' : 'Agendar'}</Button>
      </DialogFooter>
    </form>
  )
}

export function AppointmentsPage() {
  const queryClient = useQueryClient()
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [view, setView] = useState<'list' | 'week'>('list')
  const [searchDoctor, setSearchDoctor] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedAppt, setSelectedAppt] = useState<Appointment | undefined>()

  const dateStr = format(selectedDate, 'yyyy-MM-dd')

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['appointments', dateStr, searchDoctor],
    queryFn: () => appointmentsService.getAll({
      date: dateStr,
      doctor_id: searchDoctor || undefined,
    }),
  })

  const cancelMutation = useMutation({
    mutationFn: appointmentsService.cancel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      toast({ title: 'Consulta cancelada', variant: 'success' as any })
    },
    onError: (err: any) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  })

  const weekDays = eachDayOfInterval({
    start: startOfWeek(selectedDate, { weekStartsOn: 0 }),
    end: endOfWeek(selectedDate, { weekStartsOn: 0 }),
  })

  function openCreate() { setSelectedAppt(undefined); setDialogOpen(true) }
  function openEdit(a: Appointment) { setSelectedAppt(a); setDialogOpen(true) }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Agendamentos</h1>
          <p className="text-muted-foreground text-sm">{appointments.length} consulta(s) em {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setView(v => v === 'list' ? 'week' : 'list')}>
            {view === 'list' ? 'Vista Semanal' : 'Vista Lista'}
          </Button>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />Agendar
          </Button>
        </div>
      </div>

      {/* Date navigation */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="icon" onClick={() => setSelectedDate(d => subDays(d, view === 'week' ? 7 : 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-center">
              <p className="font-semibold capitalize">
                {format(selectedDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setSelectedDate(d => addDays(d, view === 'week' ? 7 : 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Week view */}
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
                    isToday ? 'bg-primary/10 text-primary' :
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

      {/* Appointments list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : appointments.length === 0 ? (
        <div className="py-20 text-center">
          <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
          <p className="text-muted-foreground">Nenhuma consulta para este dia</p>
          <Button variant="outline" className="mt-4" onClick={openCreate}>Agendar consulta</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {appointments.map((apt) => (
            <Card key={apt.id} className="hover:shadow-md transition-shadow group">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <span className="text-sm font-bold leading-none">
                      {format(parseISO(apt.scheduled_at), 'HH:mm')}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold truncate">{apt.patient?.full_name ?? '—'}</p>
                      <span className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${getStatusColor(apt.status)}`}>
                        {getStatusLabel(apt.status)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{apt.service?.name ?? '—'}</p>
                    <p className="text-xs text-muted-foreground">Dr. {apt.doctor?.full_name ?? '—'}</p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(apt)}>
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    {apt.status !== 'cancelado' && (
                      <Button
                        size="icon" variant="ghost"
                        className="h-8 w-8 hover:text-destructive"
                        onClick={() => cancelMutation.mutate(apt.id)}
                      >
                        <XCircle className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
                {apt.notes && (
                  <p className="mt-2 text-xs text-muted-foreground bg-muted rounded px-2 py-1">{apt.notes}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedAppt ? 'Editar Consulta' : 'Nova Consulta'}</DialogTitle>
            <DialogDescription>Preencha os dados da consulta</DialogDescription>
          </DialogHeader>
          <AppointmentForm appointment={selectedAppt} onClose={() => setDialogOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  )
}
