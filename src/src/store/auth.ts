'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Profile } from '@/types'

interface AuthState {
  user: Profile | null
  isLoading: boolean
  setUser: (user: Profile | null) => void
  setLoading: (loading: boolean) => void
  hasRole: (roles: string[]) => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: true,
      setUser: (user) => set({ user }),
      setLoading: (isLoading) => set({ isLoading }),
      hasRole: (roles) => {
        const { user } = get()
        if (!user) return false
        return roles.includes(user.role)
      },
    }),
    {
      name: 'clinica-auth',
      partialize: (state) => ({ user: state.user }),
      // ← CORRECÇÃO CRÍTICA: ao hidratar do localStorage, verificar se o
      // perfil guardado tem todos os campos. Se não tiver 'status'
      // (sessão antiga antes da migração), limpar para forçar novo fetch.
      merge: (persisted: any, current) => {
        if (persisted?.user && !persisted.user.status) {
          // Perfil antigo sem status — descartar e deixar o useAuth fazer novo fetch
          return { ...current, user: null }
        }
        return { ...current, ...persisted }
      },
    }
  )
)
