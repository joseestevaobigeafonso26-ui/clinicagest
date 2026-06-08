'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Activity, Clock } from 'lucide-react'
import { authService } from '@/services/auth'
import { Button } from '@/components/ui/button'
import { Input, Label, Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/hooks/useToast'
import { useState } from 'react'

const registerSchema = z.object({
  full_name: z.string().min(3, 'Nome obrigatório'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
  // Admin NÃO pode ser escolhido no registo — só o admin pode promover outros
  role: z.enum(['medico', 'recepcao']),
})
type RegisterFormData = z.infer<typeof registerSchema>

export function RegisterForm() {
  const router = useRouter()
  const [success, setSuccess] = useState(false)

  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: 'recepcao' },
  })

  async function onSubmit(data: RegisterFormData) {
    try {
      await authService.signUp(data.email, data.password, data.full_name, data.role)
      setSuccess(true)
    } catch (err: any) {
      toast({ title: 'Erro ao registrar', description: err.message, variant: 'destructive' })
    }
  }

  // Ecrã de sucesso — conta pendente de aprovação
  if (success) {
    return (
      <Card className="w-full max-w-sm">
        <CardContent className="pt-8 pb-8 flex flex-col items-center text-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/30">
            <Clock className="h-7 w-7 text-yellow-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Conta criada com sucesso!</h2>
            <p className="text-sm text-muted-foreground mt-2">
              A sua conta está <span className="font-semibold text-yellow-600">pendente de aprovação</span>.
              O administrador irá analisar o seu pedido e activar a conta em breve.
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Receberá acesso ao sistema assim que o administrador aprovar a sua conta.
          </p>
          <Button variant="outline" className="w-full" onClick={() => router.replace('/login')}>
            Voltar ao Login
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center space-y-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary mx-auto">
          <Activity className="h-6 w-6 text-white" />
        </div>
        <div>
          <CardTitle className="text-xl">Criar Conta</CardTitle>
          <CardDescription>Preencha os dados abaixo para solicitar acesso</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Nome completo</Label>
            <Input placeholder="Dr. João Silva" {...register('full_name')} />
            {errors.full_name && <p className="text-xs text-destructive">{errors.full_name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" placeholder="seu@email.com" {...register('email')} />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Senha</Label>
            <Input type="password" placeholder="••••••••" {...register('password')} />
            {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Perfil</Label>
            <Select onValueChange={(v) => setValue('role', v as any)} defaultValue={watch('role')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="medico">Médico</SelectItem>
                <SelectItem value="recepcao">Recepção</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              A conta de Administrador só pode ser atribuída pelo administrador do sistema.
            </p>
          </div>

          <div className="rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-3">
            <p className="text-xs text-yellow-700 dark:text-yellow-400">
              ⚠️ A sua conta ficará <strong>pendente</strong> até o administrador aprovar o acesso.
            </p>
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Criando conta...' : 'Solicitar Acesso'}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Já tem conta?{' '}
            <Link href="/login" className="text-primary hover:underline font-medium">
              Entrar
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  )
}
