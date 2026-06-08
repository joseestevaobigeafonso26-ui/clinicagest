'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'
import { authService } from '@/services/auth'

export function useAuth() {
  const { user, isLoading, setUser, setLoading } = useAuthStore()

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        try {
          const profile = await authService.getProfile(session.user.id)
          if (profile) {
            setUser(profile)
          } else {
            setUser(null)
          }
        } catch (error) {
          console.error('Error fetching profile:', error instanceof Error ? error.message : String(error))
          setUser(null)
        }
      } else {
        setUser(null)
      }
      setLoading(false)
    })

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        try {
          const profile = await authService.getProfile(session.user.id)
          if (profile) {
            setUser(profile)
          } else {
            setUser(null)
          }
        } catch (error) {
          console.error('Error fetching profile:', error instanceof Error ? error.message : String(error))
          setUser(null)
        }
      } else {
        setUser(null)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [setUser, setLoading])

  return { user, isLoading }
}
