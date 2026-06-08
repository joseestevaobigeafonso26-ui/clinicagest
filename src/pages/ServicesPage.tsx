import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Edit2, Trash2, Stethoscope, Clock, DollarSign, ToggleLeft, ToggleRight } from 'lucide-react'
import { servicesService } from '@/services/services'
import { Button } from '@/components/ui/button'
import { Card, CardContent, Input, Label, Textarea, Badge, Skeleton } from '@/components/ui/index'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/hooks/useToast'
import { formatCurrency } from '@/utils'
import type { Service } from '@/types'

const serviceSchema = z.object({
  name: z.string().min(2, 'Nome obrigatório'),
  description: z.string().optional(),
  price: z.coerce.number().min(0, 'Preço inválido'),
  duration_minutes: z.coerce.number().min(5, 'Duração mínima 5 minutos'),
  category: z.string().min(1, 'Categoria obrigatória'),
  active: z.boolean().default(true),
})

type ServiceFormData = z.infer<typeof serviceSchema>

const CATEGORIES = ['Consulta', 'Exame', 'Procedimento', 'Cirurgia', 'Terapia', 'Outro']

function ServiceForm({ service, onClose }: { service?: Service; onClose: () => void }) {
  const queryClient = useQueryClient()
  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<ServiceFormData>({
    resolver: zodResolver(serviceSchema),
    defaultValues: service ?? { active: true, duration_minutes: 30, price: 0 },
  })

  const mutation = useMutation({
    mutationFn: (data: ServiceFormData) =>
      service ? servicesService.update(service.id, data) : servicesService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] })
      queryClient.invalidateQueries({ queryKey: ['services-active'] })
      toast({ title: service ? 'Serviço atualizado!' : 'Serviço criado!', variant: 'success' as any })
      onClose()
    },
    onError: (err: any) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  })

  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
      <div className="space-y-2">
        <Label>Nome do serviço *</Label>
        <Input placeholder="Consulta Cardiológica" {...register('name')} />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>

      <div className="space-y-2">
        <Label>Descrição</Label>
        <Textarea placeholder="Descreva o serviço..." {...register('description')} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Preço (Kz) *</Label>
          <Input type="number" step="0.01" min="0" placeholder="0.00" {...register('price')} />
          {errors.price && <p className="text-xs text-destructive">{errors.price.message}</p>}
        </div>
        <div className="space-y-2">
          <Label>Duração (min) *</Label>
          <Input type="number" min="5" placeholder="30" {...register('duration_minutes')} />
          {errors.duration_minutes && <p className="text-xs text-destructive">{errors.duration_minutes.message}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Categoria *</Label>
        <Select onValueChange={(v) => setValue('category', v)} defaultValue={service?.category}>
          <SelectTrigger><SelectValue placeholder="Selecione uma categoria" /></SelectTrigger>
          <SelectContent>
            {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        {errors.category && <p className="text-xs text-destructive">{errors.category.message}</p>}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
        <Button type="submit" loading={isSubmitting}>{service ? 'Salvar' : 'Criar serviço'}</Button>
      </DialogFooter>
    </form>
  )
}

export function ServicesPage() {
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedService, setSelectedService] = useState<Service | undefined>()
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data: services = [], isLoading } = useQuery({
    queryKey: ['services'],
    queryFn: () => servicesService.getAll(),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => servicesService.toggleActive(id, active),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['services'] }),
    onError: (err: any) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  })

  const deleteMutation = useMutation({
    mutationFn: servicesService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] })
      toast({ title: 'Serviço removido', variant: 'success' as any })
      setDeleteId(null)
    },
    onError: (err: any) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  })

  const grouped = services.reduce<Record<string, Service[]>>((acc, s) => {
    const cat = s.category ?? 'Outros'
    acc[cat] = [...(acc[cat] ?? []), s]
    return acc
  }, {})

  function openCreate() { setSelectedService(undefined); setDialogOpen(true) }
  function openEdit(s: Service) { setSelectedService(s); setDialogOpen(true) }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Serviços</h1>
          <p className="text-muted-foreground text-sm">{services.length} serviço(s) cadastrado(s)</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />Novo Serviço
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-36 rounded-xl" />)}
        </div>
      ) : services.length === 0 ? (
        <div className="py-20 text-center">
          <Stethoscope className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
          <p className="text-muted-foreground">Nenhum serviço cadastrado</p>
          <Button variant="outline" className="mt-4" onClick={openCreate}>Criar primeiro serviço</Button>
        </div>
      ) : (
        Object.entries(grouped).map(([category, items]) => (
          <div key={category} className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{category}</h2>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {items.map((service) => (
                <Card key={service.id} className={`hover:shadow-md transition-all group ${!service.active ? 'opacity-60' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{service.name}</p>
                        {service.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{service.description}</p>
                        )}
                      </div>
                      <Badge variant={service.active ? 'success' : 'secondary'} className="shrink-0">
                        {service.active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>

                    <div className="mt-3 flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1.5 text-primary font-semibold">
                        <DollarSign className="h-3.5 w-3.5" />
                        {formatCurrency(service.price)}
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        {service.duration_minutes} min
                      </div>
                    </div>

                    <div className="mt-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => openEdit(service)}>
                        <Edit2 className="h-3 w-3 mr-1" />Editar
                      </Button>
                      <Button
                        size="sm" variant="ghost" className="h-7 text-xs"
                        onClick={() => toggleMutation.mutate({ id: service.id, active: !service.active })}
                      >
                        {service.active ? <ToggleRight className="h-3 w-3 mr-1" /> : <ToggleLeft className="h-3 w-3 mr-1" />}
                        {service.active ? 'Desativar' : 'Ativar'}
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs hover:text-destructive ml-auto" onClick={() => setDeleteId(service.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedService ? 'Editar Serviço' : 'Novo Serviço'}</DialogTitle>
            <DialogDescription>Preencha os dados do serviço clínico</DialogDescription>
          </DialogHeader>
          <ServiceForm service={selectedService} onClose={() => setDialogOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
            <DialogDescription>Este serviço será removido permanentemente.</DialogDescription>
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
