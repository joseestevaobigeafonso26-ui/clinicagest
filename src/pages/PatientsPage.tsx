import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Search, Edit2, Trash2, User, Phone, Mail, Calendar } from 'lucide-react'
import { patientsService } from '@/services/patients'
import { Button } from '@/components/ui/button'
import {
  Card, CardContent, CardHeader, CardTitle,
  Input, Label, Textarea, Badge, Skeleton, Separator
} from '@/components/ui/index'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/hooks/useToast'
import { formatCPF, formatPhone, formatDate, getInitials } from '@/utils'
import type { Patient } from '@/types'
import { useAuthStore } from '@/store/auth'

const patientSchema = z.object({
  full_name: z.string().min(3, 'Nome obrigatório'),
  cpf: z.string().min(11, 'CPF inválido').max(14),
  phone: z.string().min(10, 'Telefone inválido'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  birth_date: z.string().min(1, 'Data obrigatória'),
  gender: z.enum(['masculino', 'feminino', 'outro']),
  blood_type: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  allergies: z.string().optional(),
  notes: z.string().optional(),
})

type PatientFormData = z.infer<typeof patientSchema>

function PatientForm({ patient, onClose }: { patient?: Patient; onClose: () => void }) {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<PatientFormData>({
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
      toast({ title: patient ? 'Paciente atualizado!' : 'Paciente cadastrado!', variant: 'success' as any })
      onClose()
    },
    onError: (err: any) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  })

  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 space-y-2">
          <Label>Nome completo *</Label>
          <Input placeholder="João da Silva" {...register('full_name')} />
          {errors.full_name && <p className="text-xs text-destructive">{errors.full_name.message}</p>}
        </div>
        <div className="space-y-2">
          <Label>CPF *</Label>
          <Input placeholder="000.000.000-00" {...register('cpf')} />
          {errors.cpf && <p className="text-xs text-destructive">{errors.cpf.message}</p>}
        </div>
        <div className="space-y-2">
          <Label>Telefone *</Label>
          <Input placeholder="(11) 99999-9999" {...register('phone')} />
          {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
        </div>
        <div className="space-y-2">
          <Label>Email</Label>
          <Input type="email" placeholder="paciente@email.com" {...register('email')} />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>
        <div className="space-y-2">
          <Label>Data de nascimento *</Label>
          <Input type="date" {...register('birth_date')} />
          {errors.birth_date && <p className="text-xs text-destructive">{errors.birth_date.message}</p>}
        </div>
        <div className="space-y-2">
          <Label>Sexo *</Label>
          <Select onValueChange={(v) => setValue('gender', v as any)} defaultValue={watch('gender')}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="masculino">Masculino</SelectItem>
              <SelectItem value="feminino">Feminino</SelectItem>
              <SelectItem value="outro">Outro</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Tipo sanguíneo</Label>
          <Select onValueChange={(v) => setValue('blood_type', v)} defaultValue={patient?.blood_type}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(t => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator />
      <p className="text-sm font-medium text-muted-foreground">Endereço</p>

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 space-y-2">
          <Label>Endereço</Label>
          <Input placeholder="Rua, número, bairro" {...register('address')} />
        </div>
        <div className="space-y-2">
          <Label>Cidade</Label>
          <Input placeholder="São Paulo" {...register('city')} />
        </div>
        <div className="space-y-2">
          <Label>Estado</Label>
          <Input placeholder="SP" {...register('state')} maxLength={2} />
        </div>
      </div>

      <Separator />
      <p className="text-sm font-medium text-muted-foreground">Informações clínicas</p>

      <div className="space-y-2">
        <Label>Alergias</Label>
        <Textarea placeholder="Descreva alergias conhecidas..." {...register('allergies')} />
      </div>
      <div className="space-y-2">
        <Label>Observações</Label>
        <Textarea placeholder="Observações adicionais..." {...register('notes')} />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
        <Button type="submit" loading={isSubmitting}>{patient ? 'Salvar' : 'Cadastrar'}</Button>
      </DialogFooter>
    </form>
  )
}

export function PatientsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [selectedPatient, setSelectedPatient] = useState<Patient | undefined>()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

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
    onError: (err: any) => toast({ title: 'Erro ao remover', description: err.message, variant: 'destructive' }),
  })

  function openCreate() { setSelectedPatient(undefined); setDialogOpen(true) }
  function openEdit(p: Patient) { setSelectedPatient(p); setDialogOpen(true) }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Pacientes</h1>
          <p className="text-muted-foreground text-sm">{patients.length} paciente(s) encontrado(s)</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />Novo Paciente
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, CPF ou telefone..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      ) : patients.length === 0 ? (
        <div className="py-20 text-center">
          <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
          <p className="text-muted-foreground">Nenhum paciente encontrado</p>
          <Button variant="outline" className="mt-4" onClick={openCreate}>Cadastrar primeiro paciente</Button>
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
                    <p className="text-xs text-muted-foreground">{formatCPF(patient.cpf)}</p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(patient)}>
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 hover:text-destructive" onClick={() => setDeleteId(patient.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
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
                </div>

                {patient.blood_type && (
                  <div className="mt-3">
                    <Badge variant="outline" className="text-xs">{patient.blood_type}</Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedPatient ? 'Editar Paciente' : 'Novo Paciente'}</DialogTitle>
            <DialogDescription>Preencha os dados do paciente</DialogDescription>
          </DialogHeader>
          <PatientForm patient={selectedPatient} onClose={() => setDialogOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
            <DialogDescription>Esta ação não pode ser desfeita. O paciente e seus dados serão removidos permanentemente.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancelar</Button>
            <Button variant="destructive" loading={deleteMutation.isPending} onClick={() => deleteId && deleteMutation.mutate(deleteId)}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
