'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Search, Edit2, Trash2, User, Phone, Mail, Calendar, MapPin } from 'lucide-react'
import { patientsService } from '@/services/patients'
import { Button } from '@/components/ui/button'
import { Card, CardContent, Input, Label, Textarea, Badge, Skeleton, Separator } from '@/components/ui'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/hooks/useToast'
import { formatBI, formatPhone, formatDate, getInitials } from '@/lib/utils'
import type { Patient } from '@/types'
import { useAuthStore } from '@/store/auth'
import { usePermissions } from '@/hooks/usePermissions'

// ─── Províncias de Angola ─────────────────────────────────────────────────────
const PROVINCIAS_ANGOLA = [
  'Bengo', 'Benguela', 'Bié', 'Cabinda', 'Cuando Cubango',
  'Cuanza Norte', 'Cuanza Sul', 'Cunene', 'Huambo', 'Huíla',
  'Luanda', 'Lunda Norte', 'Lunda Sul', 'Malanje', 'Moxico',
  'Namibe', 'Uíge', 'Zaire',
]

// ─── Seguradoras / Planos de saúde angolanos ────────────────────────────────
const SEGURADORAS_ANGOLA = [
  'ENSA - Seguros de Angola',
  'AAA Seguros',
  'GA Angola Seguros',
  'Nossa Seguros',
  'Particular (sem seguro)',
  'Outro',
]

// ─── Schema adaptado para Angola ─────────────────────────────────────────────
const patientSchema = z.object({
  full_name:  z.string().min(3, 'Nome completo obrigatório'),
  // BI angolano: 9 dígitos + 2 letras + 3 dígitos (ex: 006123456LA041)
  cpf: z.string()
    .min(1, 'Nº de BI obrigatório')
    .refine(
      (val) => /^[0-9]{9}[A-Za-z]{2}[0-9]{3}$/.test(val.replace(/\s/g, '')),
      { message: 'BI inválido — formato: 006123456LA041' }
    ),
  phone: z.string()
    .min(9, 'Telefone inválido')
    .refine(
      (val) => /^(\+244|244)?[9][0-9]{8}$/.test(val.replace(/\s/g, '')),
      { message: 'Telefone angolano inválido — ex: 923 456 789' }
    ),
  email:      z.string().email('Email inválido').optional().or(z.literal('')),
  birth_date: z.string().min(1, 'Data de nascimento obrigatória'),
  gender:     z.enum(['masculino', 'feminino', 'outro']),
  blood_type: z.string().optional(),
  insurance:  z.string().optional(),
  address:    z.string().optional(),
  city:       z.string().optional(),   // município
  state:      z.string().optional(),   // província
  allergies:  z.string().optional(),
  notes:      z.string().optional(),
})
type PatientFormData = z.infer<typeof patientSchema>

// ─── Formulário ──────────────────────────────────────────────────────────────
function PatientForm({ patient, onClose }: { patient?: Patient; onClose: () => void }) {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  const {
    register, handleSubmit, setValue, watch,
    formState: { errors, isSubmitting },
  } = useForm<PatientFormData>({
    resolver: zodResolver(patientSchema),
    defaultValues: patient
      ? { ...patient, email: patient.email ?? '', birth_date: patient.birth_date?.split('T')[0] }
      : { gender: 'masculino' },
  })

  const mutation = useMutation({
    mutationFn: (data: PatientFormData) =>
      patient
        ? patientsService.update(patient.id, data)
        : patientsService.create({ ...data, created_by: user!.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] })
      queryClient.invalidateQueries({ queryKey: ['patients-count'] })
      toast({
        title: patient ? 'Paciente actualizado!' : 'Paciente cadastrado!',
        variant: 'success' as any,
      })
      onClose()
    },
    onError: (err: any) =>
      toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  })

  return (
    <form
      onSubmit={handleSubmit((d) => mutation.mutate(d))}
      className="space-y-4 max-h-[72vh] overflow-y-auto pr-2"
    >
      {/* ── Dados pessoais ── */}
      <div className="grid grid-cols-2 gap-4">

        {/* Nome completo */}
        <div className="col-span-2 space-y-2">
          <Label>Nome completo *</Label>
          <Input placeholder="Ex: Maria da Silva Santos" {...register('full_name')} />
          {errors.full_name && <p className="text-xs text-destructive">{errors.full_name.message}</p>}
        </div>

        {/* BI — Bilhete de Identidade angolano */}
        <div className="space-y-2">
          <Label>Nº de BI *</Label>
          <Input
            placeholder="006123456LA041"
            maxLength={14}
            {...register('cpf')}
            onChange={(e) => {
              // Aceitar letras maiúsculas automaticamente
              e.target.value = e.target.value.toUpperCase()
              register('cpf').onChange(e)
            }}
          />
          <p className="text-xs text-muted-foreground">Bilhete de Identidade angolano</p>
          {errors.cpf && <p className="text-xs text-destructive">{errors.cpf.message}</p>}
        </div>

        {/* Telefone */}
        <div className="space-y-2">
          <Label>Telefone *</Label>
          <Input placeholder="923 456 789" {...register('phone')} />
          <p className="text-xs text-muted-foreground">Número angolano (+244)</p>
          {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
        </div>

        {/* Email */}
        <div className="space-y-2">
          <Label>Email</Label>
          <Input type="email" placeholder="paciente@email.com" {...register('email')} />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>

        {/* Data de nascimento */}
        <div className="space-y-2">
          <Label>Data de nascimento *</Label>
          <Input type="date" {...register('birth_date')} />
          {errors.birth_date && <p className="text-xs text-destructive">{errors.birth_date.message}</p>}
        </div>

        {/* Sexo */}
        <div className="space-y-2">
          <Label>Sexo *</Label>
          <Select
            onValueChange={(v) => setValue('gender', v as any)}
            defaultValue={watch('gender')}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="masculino">Masculino</SelectItem>
              <SelectItem value="feminino">Feminino</SelectItem>
              <SelectItem value="outro">Outro</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tipo sanguíneo */}
        <div className="space-y-2">
          <Label>Tipo sanguíneo</Label>
          <Select
            onValueChange={(v) => setValue('blood_type', v)}
            defaultValue={patient?.blood_type}
          >
            <SelectTrigger><SelectValue placeholder="Seleccione" /></SelectTrigger>
            <SelectContent>
              {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Seguro / Plano de saúde */}
        <div className="col-span-2 space-y-2">
          <Label>Seguro / Plano de saúde</Label>
          <Select
            onValueChange={(v) => setValue('insurance', v)}
            defaultValue={patient?.insurance ?? ''}
          >
            <SelectTrigger><SelectValue placeholder="Seleccione ou deixe em branco" /></SelectTrigger>
            <SelectContent>
              {SEGURADORAS_ANGOLA.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Morada ── */}
      <Separator />
      <p className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
        <MapPin className="h-3.5 w-3.5" />
        Morada
      </p>
      <div className="grid grid-cols-2 gap-4">
        {/* Endereço / Bairro */}
        <div className="col-span-2 space-y-2">
          <Label>Endereço / Bairro</Label>
          <Input placeholder="Ex: Rua da Missão, Bairro Sambizanga" {...register('address')} />
        </div>

        {/* Município */}
        <div className="space-y-2">
          <Label>Município</Label>
          <Input placeholder="Ex: Luanda, Viana, Cacuaco..." {...register('city')} />
        </div>

        {/* Província */}
        <div className="space-y-2">
          <Label>Província</Label>
          <Select
            onValueChange={(v) => setValue('state', v)}
            defaultValue={patient?.state ?? ''}
          >
            <SelectTrigger><SelectValue placeholder="Seleccione" /></SelectTrigger>
            <SelectContent>
              {PROVINCIAS_ANGOLA.map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Informações clínicas ── */}
      <Separator />
      <p className="text-sm font-semibold text-muted-foreground">Informações clínicas</p>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Alergias conhecidas</Label>
          <Textarea
            placeholder="Ex: Penicilina, látex, amendoim..."
            rows={2}
            {...register('allergies')}
          />
        </div>
        <div className="space-y-2">
          <Label>Observações adicionais</Label>
          <Textarea
            placeholder="Informações relevantes sobre o paciente..."
            rows={2}
            {...register('notes')}
          />
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
        <Button type="submit" disabled={isSubmitting || mutation.isPending}>
          {isSubmitting || mutation.isPending
            ? 'A guardar...'
            : patient ? 'Guardar alterações' : 'Cadastrar Paciente'}
        </Button>
      </DialogFooter>
    </form>
  )
}

// ─── Vista principal ──────────────────────────────────────────────────────────
export function PatientsView() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [selectedPatient, setSelectedPatient] = useState<Patient | undefined>()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const { isAdmin, isReceptionist } = usePermissions()

  const { data: patients = [], isLoading } = useQuery({
    queryKey: ['patients', search],
    queryFn: () => patientsService.getAll({ search }),
  })

  const deleteMutation = useMutation({
    mutationFn: patientsService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] })
      queryClient.invalidateQueries({ queryKey: ['patients-count'] })
      toast({ title: 'Paciente removido', variant: 'success' as any })
      setDeleteId(null)
    },
    onError: (err: any) =>
      toast({ title: 'Erro ao remover', description: err.message, variant: 'destructive' }),
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Pacientes</h1>
          <p className="text-muted-foreground text-sm">
            {patients.length} paciente(s) registado(s)
          </p>
        </div>
        {(isAdmin || isReceptionist) && (
          <Button onClick={() => { setSelectedPatient(undefined); setDialogOpen(true) }}>
            <Plus className="h-4 w-4 mr-2" />Novo Paciente
          </Button>
        )}
      </div>

      {/* Pesquisa */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Pesquisar por nome, BI ou telefone..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-36 rounded-xl" />)}
        </div>
      ) : patients.length === 0 ? (
        <div className="py-20 text-center">
          <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
          <p className="text-muted-foreground">Nenhum paciente encontrado</p>
          {(isAdmin || isReceptionist) && (
            <Button
              variant="outline" className="mt-4"
              onClick={() => { setSelectedPatient(undefined); setDialogOpen(true) }}
            >
              Cadastrar primeiro paciente
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {patients.map((patient) => (
            <Card key={patient.id} className="hover:shadow-md transition-shadow group">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                    {getInitials(patient.full_name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{patient.full_name}</p>
                    {/* BI em vez de CPF */}
                    <p className="text-xs text-muted-foreground font-mono">
                      BI: {formatBI(patient.cpf)}
                    </p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    {(isAdmin || isReceptionist) && (
                      <Button
                        size="icon" variant="ghost" className="h-7 w-7"
                        onClick={() => { setSelectedPatient(patient); setDialogOpen(true) }}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {isAdmin && (
                      <Button
                        size="icon" variant="ghost"
                        className="h-7 w-7 hover:text-destructive"
                        onClick={() => setDeleteId(patient.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="mt-3 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Phone className="h-3 w-3 shrink-0" />
                    <span>{formatPhone(patient.phone)}</span>
                  </div>
                  {patient.email && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Mail className="h-3 w-3 shrink-0" />
                      <span className="truncate">{patient.email}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3 shrink-0" />
                    <span>{patient.birth_date ? formatDate(patient.birth_date) : '-'}</span>
                  </div>
                  {/* Município / Província */}
                  {(patient.city || patient.state) && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span>
                        {[patient.city, patient.state].filter(Boolean).join(', ')}
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-3 flex gap-2 flex-wrap">
                  {patient.blood_type && (
                    <Badge variant="outline" className="text-xs">{patient.blood_type}</Badge>
                  )}
                  {patient.insurance && (
                    <Badge variant="secondary" className="text-xs truncate max-w-[140px]">
                      {patient.insurance}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog: criar/editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedPatient ? 'Editar Paciente' : 'Novo Paciente'}
            </DialogTitle>
            <DialogDescription>
              Preencha os dados do paciente
            </DialogDescription>
          </DialogHeader>
          {dialogOpen && (
            <PatientForm patient={selectedPatient} onClose={() => setDialogOpen(false)} />
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog: confirmar exclusão */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
            <DialogDescription>
              O paciente será removido permanentemente do sistema.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            >
              {deleteMutation.isPending ? 'A remover...' : 'Confirmar exclusão'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
