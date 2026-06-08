'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ShieldCheck, Clock, CheckCircle2, Ban, Users,
  Search, ChevronDown, MoreVertical,
} from 'lucide-react'
import { usersService } from '@/services/users'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Input, Skeleton, Badge } from '@/components/ui'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/hooks/useToast'
import { getInitials, formatDate } from '@/lib/utils'
import { usePermissions } from '@/hooks/usePermissions'
import { useRouter } from 'next/navigation'
import type { Profile } from '@/types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  activo:    { label: 'Activo',    icon: CheckCircle2, className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  pendente:  { label: 'Pendente',  icon: Clock,        className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' },
  bloqueado: { label: 'Bloqueado', icon: Ban,          className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
}

const ROLE_CONFIG = {
  admin:    { label: 'Administrador', className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
  medico:   { label: 'Médico',        className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  recepcao: { label: 'Recepção',      className: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300' },
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG]
  if (!cfg) return null
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${cfg.className}`}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  )
}

function RoleBadge({ role }: { role: string }) {
  const cfg = ROLE_CONFIG[role as keyof typeof ROLE_CONFIG]
  if (!cfg) return null
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${cfg.className}`}>
      {cfg.label}
    </span>
  )
}

// ─── Dialog de edição de utilizador ──────────────────────────────────────────
function EditUserDialog({
  user,
  open,
  onClose,
}: { user: Profile; open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState(user.status)
  const [role, setRole] = useState(user.role)

  const mutation = useMutation({
    mutationFn: () => usersService.updateUserStatusAndRole(user.id, status, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast({ title: 'Utilizador actualizado!', variant: 'success' as any })
      onClose()
    },
    onError: (err: any) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  })

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Gerir Utilizador</DialogTitle>
          <DialogDescription>
            Altere o papel e o estado da conta de <strong>{user.full_name}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Info do utilizador */}
          <div className="flex items-center gap-3 rounded-lg bg-muted p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary text-sm font-bold">
              {getInitials(user.full_name)}
            </div>
            <div>
              <p className="font-medium text-sm">{user.full_name}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>

          {/* Estado */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Estado da Conta</label>
            <Select value={status} onValueChange={(v) => setStatus(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="activo">✅ Activo</SelectItem>
                <SelectItem value="pendente">⏳ Pendente</SelectItem>
                <SelectItem value="bloqueado">🚫 Bloqueado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Papel */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Papel (Role)</label>
            <Select value={role} onValueChange={(v) => setRole(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">🛡️ Administrador</SelectItem>
                <SelectItem value="medico">🩺 Médico</SelectItem>
                <SelectItem value="recepcao">🗂️ Recepção</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? 'Salvando...' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Card de utilizador ───────────────────────────────────────────────────────
function UserCard({ user, onEdit }: { user: Profile; onEdit: () => void }) {
  const queryClient = useQueryClient()

  const quickApproveMutation = useMutation({
    mutationFn: () => usersService.updateUserStatusAndRole(user.id, 'activo', user.role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast({ title: `${user.full_name} aprovado!`, variant: 'success' as any })
    },
    onError: (err: any) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  })

  const quickBlockMutation = useMutation({
    mutationFn: () => usersService.updateUserStatusAndRole(user.id, 'bloqueado', user.role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast({ title: `${user.full_name} bloqueado`, variant: 'success' as any })
    },
    onError: (err: any) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  })

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
            {getInitials(user.full_name)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">{user.full_name}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              <RoleBadge role={user.role} />
              <StatusBadge status={user.status} />
            </div>
            {user.phone && (
              <p className="text-xs text-muted-foreground mt-1">{user.phone}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Registado em {formatDate(user.created_at)}
            </p>
          </div>
          <div className="flex flex-col gap-1 shrink-0">
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onEdit}>
              <MoreVertical className="h-3 w-3 mr-1" />
              Gerir
            </Button>
            {/* Aprovação rápida para contas pendentes */}
            {user.status === 'pendente' && (
              <Button
                size="sm"
                className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700"
                disabled={quickApproveMutation.isPending}
                onClick={() => quickApproveMutation.mutate()}
              >
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Aprovar
              </Button>
            )}
            {/* Bloqueio rápido para contas activas */}
            {user.status === 'activo' && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs border-red-300 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                disabled={quickBlockMutation.isPending}
                onClick={() => quickBlockMutation.mutate()}
              >
                <Ban className="h-3 w-3 mr-1" />
                Bloquear
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── View principal ──────────────────────────────────────────────────────────
export function UsersView() {
  const { isAdmin } = usePermissions()
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('todos')
  const [filterRole, setFilterRole] = useState<string>('todos')
  const [editingUser, setEditingUser] = useState<Profile | null>(null)

  // Redirecionar se não for admin
  if (!isAdmin) {
    router.replace('/dashboard')
    return null
  }

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: usersService.getAll,
  })

  // Filtros locais
  const filtered = users.filter(u => {
    const matchSearch = !search ||
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'todos' || u.status === filterStatus
    const matchRole   = filterRole   === 'todos' || u.role   === filterRole
    return matchSearch && matchStatus && matchRole
  })

  const pendingCount = users.filter(u => u.status === 'pendente').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-purple-600" />
            Gestão de Utilizadores
          </h1>
          <p className="text-muted-foreground text-sm">
            {users.length} utilizador(es) registado(s)
          </p>
        </div>
        {pendingCount > 0 && (
          <div className="flex items-center gap-2 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 px-4 py-2">
            <Clock className="h-4 w-4 text-yellow-600 shrink-0" />
            <p className="text-sm text-yellow-700 dark:text-yellow-400 font-medium">
              {pendingCount} conta(s) a aguardar aprovação
            </p>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid gap-3 grid-cols-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{users.filter(u => u.status === 'activo').length}</p>
              <p className="text-xs text-muted-foreground">Activos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
              <Clock className="h-4 w-4 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pendingCount}</p>
              <p className="text-xs text-muted-foreground">Pendentes</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <Ban className="h-4 w-4 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{users.filter(u => u.status === 'bloqueado').length}</p>
              <p className="text-xs text-muted-foreground">Bloqueados</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por nome ou email..."
            className="pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os estados</SelectItem>
            <SelectItem value="activo">Activo</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="bloqueado">Bloqueado</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterRole} onValueChange={setFilterRole}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Papel" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os papéis</SelectItem>
            <SelectItem value="admin">Administrador</SelectItem>
            <SelectItem value="medico">Médico</SelectItem>
            <SelectItem value="recepcao">Recepção</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-2">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center">
          <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
          <p className="text-muted-foreground">Nenhum utilizador encontrado</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map(u => (
            <UserCard
              key={u.id}
              user={u}
              onEdit={() => setEditingUser(u)}
            />
          ))}
        </div>
      )}

      {/* Dialog de edição */}
      {editingUser && (
        <EditUserDialog
          user={editingUser}
          open={!!editingUser}
          onClose={() => setEditingUser(null)}
        />
      )}
    </div>
  )
}
