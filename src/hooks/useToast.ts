'use client'

import { useState, useCallback, useEffect } from 'react'

export interface ToastProps {
  id?: string
  title: string
  description?: string
  variant?: 'default' | 'destructive' | 'success'
  duration?: number
}

type ToastState = ToastProps & { id: string }

const listeners: Array<(toast: ToastState) => void> = []
let toastCounter = 0

export function toast(props: ToastProps) {
  const id = `toast-${Date.now()}-${++toastCounter}`
  const toastData = { ...props, id }
  listeners.forEach((fn) => fn(toastData))
}

export function useToastState() {
  const [toasts, setToasts] = useState<ToastState[]>([])

  const addToast = useCallback((t: ToastState) => {
    setToasts((prev) => [...prev, t])
    setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== t.id))
    }, t.duration ?? 4000)
  }, [])

  useEffect(() => {
    listeners.push(addToast)
    return () => {
      const i = listeners.indexOf(addToast)
      if (i > -1) listeners.splice(i, 1)
    }
  }, [addToast])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return { toasts, dismiss }
}
