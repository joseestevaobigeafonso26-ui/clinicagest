'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Activity, Eye, EyeOff, Lock, Mail, Clock, Ban } from 'lucide-react'
import { authService } from '@/services/auth'
import { Button } from '@/components/ui/button'
import { Input, Label, Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui'
import { toast } from '@/hooks/useToast'

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
})
type LoginFormData = z.infer<typeof loginSchema>

type BlockedState = 'pendente' | 'bloqueado' | null

export function LoginForm() {
  const router = useRouter()
  const [showPass, setShowPass] = useState(false)
  const [blockedState, setBlockedState] = useState<BlockedState>(null)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  async function onSubmit(data: LoginFormData) {
    try {
      const session = await authService.signIn(data.email, data.password)

      if (session.user) {
        const profile = await authService.getProfile(session.user.id)

        if (!profile) {
          await authService.signOut()
          throw new Error('Perfil não encontrado. Contacte o administrador.')
        }

        // Verificar status da conta
        if (profile.status === 'pendente') {
          await authService.signOut()
          setBlockedState('pendente')
          return
        }

        if (profile.status === 'bloqueado') {
          await authService.signOut()
          setBlockedState('bloqueado')
          return
        }

        // Conta activa — deixar entrar
        // IMPORTANTE: não chamar setUser() aqui
        // O hook useAuth vai detectar a mudança de sessão via onAuthStateChange
        // e atualizar o estado automaticamente
        router.replace('/dashboard')
      }
    } catch (err: any) {
      toast({ title: 'Erro ao entrar', description: err.message, variant: 'destructive' })
    }
  }

  // Ecrã: conta pendente
  if (blockedState === 'pendente') {
    return (
      <Card className="w-full max-w-sm">
        <CardContent className="pt-8 pb-8 flex flex-col items-center text-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/30">
            <Clock className="h-7 w-7 text-yellow-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Conta Pendente</h2>
            <p className="text-sm text-muted-foreground mt-2">
              A sua conta ainda não foi aprovada pelo administrador.
              Aguarde a aprovação para aceder ao sistema.
            </p>
          </div>
          <Button variant="outline" className="w-full" onClick={() => setBlockedState(null)}>
            Voltar
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Ecrã: conta bloqueada
  if (blockedState === 'bloqueado') {
    return (
      <Card className="w-full max-w-sm">
        <CardContent className="pt-8 pb-8 flex flex-col items-center text-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <Ban className="h-7 w-7 text-red-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Conta Bloqueada</h2>
            <p className="text-sm text-muted-foreground mt-2">
              A sua conta foi bloqueada pelo administrador.
              Contacte o suporte para mais informações.
            </p>
          </div>
          <Button variant="outline" className="w-full" onClick={() => setBlockedState(null)}>
            Voltar
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
          <CardTitle className="text-xl">ClinicaGest</CardTitle>
          <CardDescription>Entre na sua conta</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="seu@email.com" {...register('email')} />
            </div>
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Senha</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9 pr-10"
                type={showPass ? 'text' : 'password'}
                placeholder="••••••••"
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
              >
                {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Entrando...' : 'Entrar'}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Sem conta?{' '}
            <Link href="/register" className="text-primary hover:underline font-medium">
              Solicitar Acesso
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  )
}
